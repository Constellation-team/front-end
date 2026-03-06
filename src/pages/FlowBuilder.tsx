import { useCallback, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    ConnectionMode,
    Panel,
} from 'reactflow';
import type { Connection, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import './FlowBuilder.css';

import { useFlowStore } from '../store/flowStore';
import NodeLibrary, { type NodeTemplate } from '../components/NodeLibrary';
import CustomNode from '../components/nodes/CustomNode';
import SimulationModal from '../components/SimulationModal';
import SettingsModal from '../components/SettingsModal';
import ContractEditorModal from '../components/ContractEditorModal';
import ContractDetailsModal from '../components/ContractDetailsModal';
import ChatBot from '../components/ChatBot';
import { generateCRECode } from '../utils/codeGenerator';
import { isValidConnection, canAddNode, validateWorkflow } from '../utils/flowValidation';
import { generateProjectZip, downloadZip } from '../utils/projectTemplateGenerator';
import { saveDeployedContract, getContractByNodeId, getDeployedContracts } from '../lib/blockchain/contractStorage';
import type { DeployedContract } from '../lib/blockchain/contractStorage';
import { connectWallet, ensureSepoliaNetwork } from '../lib/blockchain/deploy';
import { API_URL } from '../config';

const nodeTypes = {
    custom: CustomNode,
};

export default function FlowBuilder() {
    const navigate = useNavigate();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { nodes, edges, onNodesChange, onEdgesChange, addNode, setSelectedNode } = useFlowStore();

    const nodeId = useRef(0);

    // Simulation modal state
    const [isSimulationOpen, setIsSimulationOpen] = useState(false);
    const [simulationOutput, setSimulationOutput] = useState('');
    const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

    // Settings modal state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Contract editor modal state
    const [isContractEditorOpen, setIsContractEditorOpen] = useState(false);
    const [editingContractNodeId, setEditingContractNodeId] = useState<string>('');
    const [editingContractType, setEditingContractType] = useState<string>('');

    // Wallet connection state
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [walletConnecting, setWalletConnecting] = useState(false);

    // Contract details modal state
    const [isContractDetailsOpen, setIsContractDetailsOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<DeployedContract | null>(null);

    // Validation state
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const onConnect = useCallback(
        (params: Connection) => {
            // Validate connection before creating it
            const sourceNode = nodes.find(n => n.id === params.source);
            const targetNode = nodes.find(n => n.id === params.target);

            const validation = isValidConnection(sourceNode, targetNode);

            if (!validation.valid) {
                alert(`❌ Invalid Connection\n\n${validation.reason}`);
                return;
            }

            useFlowStore.setState({
                edges: addEdge({ ...params, animated: true, style: { stroke: '#667eea' } }, edges),
            });

            // Revalidate workflow after connection
            setTimeout(() => {
                const validation = validateWorkflow(nodes, [...edges, { ...params, id: `e${params.source}-${params.target}`, source: params.source!, target: params.target! }]);
                setValidationErrors(validation.errors);
            }, 100);
        },
        [edges, nodes]
    );

    const onDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            const templateData = event.dataTransfer.getData('application/reactflow');

            if (templateData && reactFlowBounds) {
                const template: NodeTemplate = JSON.parse(templateData);

                // Validate if node can be added
                const validation = canAddNode(template.category, nodes);
                if (!validation.valid) {
                    alert(`❌ Cannot Add Node\n\n${validation.reason}`);
                    return;
                }

                const position = {
                    x: event.clientX - reactFlowBounds.left - 90, // Center horizontally
                    y: event.clientY - reactFlowBounds.top - 40, // Center vertically
                };

                const newNode = {
                    id: `node-${nodeId.current++}`,
                    type: 'custom',
                    position,
                    data: {
                        label: template.label,
                        category: template.category,
                        icon: template.icon,
                        nodeType: template.type, // Add node type for contract identification
                    },
                };

                addNode(newNode);

                // Revalidate workflow after adding node
                setTimeout(() => {
                    const validation = validateWorkflow([...nodes, newNode], edges);
                    setValidationErrors(validation.errors);
                }, 100);
            }
        },
        [addNode, nodes, edges]
    );

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: unknown) => {
            const clickedNode = node as Node;
            setSelectedNode(clickedNode as never);
            
            // Check if this node has a deployed contract
            const nodeData = clickedNode.data as { contractAddress?: string };
            if (nodeData.contractAddress) {
                const contract = getContractByNodeId(clickedNode.id);
                if (contract) {
                    setSelectedContract(contract);
                    setIsContractDetailsOpen(true);
                }
            }
        },
        [setSelectedNode]
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, [setSelectedNode]);

    const onNodeDoubleClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            // Check if this is a contract deployment node
            const contractTypes = ['simple-storage', 'erc20-token', 'erc721-nft', 'crowdfunding', 'voting', 'multisig-wallet'];
            const nodeData = node.data as { nodeType?: string };
            
            if (nodeData.nodeType && contractTypes.includes(nodeData.nodeType)) {
                setEditingContractNodeId(node.id);
                setEditingContractType(nodeData.nodeType);
                setIsContractEditorOpen(true);
            }
        },
        []
    );

    const handleWalletConnect = useCallback(async () => {
        setWalletConnecting(true);
        try {
            await ensureSepoliaNetwork();
            const address = await connectWallet();
            setWalletAddress(address);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to connect wallet');
        } finally {
            setWalletConnecting(false);
        }
    }, []);

    const handleWalletDisconnect = useCallback(() => {
        setWalletAddress('');
    }, []);

    const handleContractDeploy = useCallback(
        (result: { address: string; txHash: string; abi: unknown[]; sourceCode: string; name: string }) => {
            // Save to storage
            saveDeployedContract({
                nodeId: editingContractNodeId,
                type: editingContractType,
                name: result.name,
                address: result.address,
                txHash: result.txHash,
                abi: result.abi,
                sourceCode: result.sourceCode,
                deployedAt: Date.now(),
                network: 'sepolia',
            });

            // Update node data to show deployed address
            useFlowStore.setState({
                nodes: nodes.map(node => 
                    node.id === editingContractNodeId
                        ? { ...node, data: { ...node.data, contractAddress: result.address } }
                        : node
                ),
            });

            setIsContractEditorOpen(false);
        },
        [editingContractNodeId, editingContractType, nodes]
    );

    const exportFlow = useCallback(async () => {
        if (nodes.length === 0) {
            alert('⚠️ Please add at least one node before exporting!');
            return;
        }

        // Prompt for project metadata
        const projectName = prompt(
            '📦 Project Name:',
            'my-chainlink-workflow'
        );

        if (!projectName) {
            return; // User cancelled
        }

        const projectDescription = prompt(
            '📝 Project Description:',
            'A Chainlink CRE workflow generated with CREator'
        );

        if (projectDescription === null) {
            return; // User cancelled
        }

        try {
            // Get deployed contracts for nodes in this workflow
            const allDeployedContracts = getDeployedContracts();
            const workflowNodeIds = nodes.map(n => n.id);
            const workflowContracts = allDeployedContracts.filter(c => workflowNodeIds.includes(c.nodeId));
            
            // Generate the complete project ZIP
            const zipBlob = await generateProjectZip(
                nodes,
                edges,
                {
                    projectName,
                    description: projectDescription || 'A Chainlink CRE workflow',
                    author: undefined,
                },
                workflowContracts
            );

            // Download the ZIP file
            const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}.zip`;
            downloadZip(zipBlob, filename);

            // Success message with contract info
            const contractInfo = workflowContracts.length > 0
                ? `\n\n📜 Deployed Contracts Included: ${workflowContracts.length}\n${workflowContracts.map(c => `  • ${c.name} (${c.address.slice(0, 10)}...)`).join('\n')}`
                : '';

            alert(`✅ Success!\n\nYour project "${projectName}" has been exported.\n\nThe ZIP contains:\n• Workflow files (main.ts, configs)\n• Project configuration\n• Documentation (README, QUICKSTART)\n• Setup files (.env.example, .gitignore)${contractInfo}\n\nExtract the ZIP and follow the QUICKSTART.md to get started!`);
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ Failed to export project. Check console for details.');
        }
    }, [nodes, edges]);

    const testWorkflow = useCallback(async () => {
        if (nodes.length === 0) {
            alert('Please add at least one node to test your workflow!');
            return;
        }

        // Validate workflow before running
        const validation = validateWorkflow(nodes, edges);
        if (!validation.valid) {
            const errorList = validation.errors.join('\n');
            const proceed = confirm(
                `⚠️ Workflow Validation Issues:\n\n${errorList}\n\nDo you want to run the simulation anyway?`
            );
            if (!proceed) return;
        }

        // Open modal and reset state
        setIsSimulationOpen(true);
        setSimulationOutput('Preparing workflow...\n');
        setSimulationStatus('running');

        try {
            // Generate CRE code
            const generatedFiles = generateCRECode({ nodes, edges });
            setSimulationOutput(prev => prev + 'Code generated successfully!\n');
            setSimulationOutput(prev => prev + 'Writing files to cre-orchestrator...\n');

            // In production, the backend determines the orchestrator path internally.
            // But we still pass a dummy path so the API matches the signature, or we can omit it if backend supports.
            // For now, we will pass a relative indicator so the backend can use process.env.ORCHESTRATOR_PATH
            const orchestratorPath = 'DEFAULT';

            // Write main.ts
            await writeFile(`workflows/main.ts`, generatedFiles['main.ts']);
            setSimulationOutput(prev => prev + '✓ main.ts written\n');

            // Write workflow.yaml
            await writeFile(`workflows/workflow.yaml`, generatedFiles['workflow.yaml']);
            setSimulationOutput(prev => prev + '✓ workflow.yaml written\n');

            // Write config files
            await writeFile(`workflows/config.staging.json`, generatedFiles['config.staging.json']);
            await writeFile(`workflows/config.production.json`, generatedFiles['config.production.json']);
            setSimulationOutput(prev => prev + '✓ Config files written\n\n');

            setSimulationOutput(prev => prev + 'Running simulation...\n');
            setSimulationOutput(prev => prev + '─'.repeat(60) + '\n\n');

            // Run simulation command
            const response = await fetch(`${API_URL}/api/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orchestratorPath }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

                // Check if it's a production limitation error (403)
                if (response.status === 403) {
                    throw new Error(`Production Limitation:\n\n${errorData.message || errorData.error}\n\n${errorData.suggestion || ''}`);
                }

                throw new Error(`Simulation failed: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setSimulationOutput(prev => prev + data.output);
            setSimulationStatus(data.success ? 'success' : 'error');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            // Check if it's a production limitation error
            if (errorMsg.includes('Production Limitation') || errorMsg.includes('disabled in production')) {
                setSimulationOutput(prev => prev + `\n⚠️ ${errorMsg}\n\n`);
                setSimulationOutput(prev => prev + `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
                setSimulationOutput(prev => prev + `💡 Alternative: Use "Export Flow"\n`);
                setSimulationOutput(prev => prev + `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);
                setSimulationOutput(prev => prev + `The "💾 Export Flow" button generates a complete\n`);
                setSimulationOutput(prev => prev + `CRE project ZIP that you can:\n\n`);
                setSimulationOutput(prev => prev + `1. Download and extract locally\n`);
                setSimulationOutput(prev => prev + `2. Follow the QUICKSTART.md guide\n`);
                setSimulationOutput(prev => prev + `3. Run locally with full CRE CLI access\n\n`);
                setSimulationOutput(prev => prev + `This is the recommended workflow for production! ✨\n`);
            }
            // Check if it's a connection error
            else if (errorMsg.includes('fetch') || errorMsg.includes('connect to backend')) {
                setSimulationOutput(prev => prev + `\n❌ Connection Error\n\n`);
                setSimulationOutput(prev => prev + `Cannot connect to backend at: ${API_URL}\n\n`);
                setSimulationOutput(prev => prev + `Possible solutions:\n`);
                setSimulationOutput(prev => prev + `1. Make sure the backend is running\n`);
                setSimulationOutput(prev => prev + `2. Update VITE_API_URL in your .env file\n`);
                setSimulationOutput(prev => prev + `   Current: ${API_URL}\n`);
                setSimulationOutput(prev => prev + `   For production: Set to your deployed backend URL\n`);
                setSimulationOutput(prev => prev + `   For development: http://localhost:3001\n\n`);
                setSimulationOutput(prev => prev + `3. Check browser console for CORS errors\n`);
            } else {
                setSimulationOutput(prev => prev + `\n❌ Error: ${errorMsg}\n`);
            }
            setSimulationStatus('error');
        }
    }, [nodes, edges]);

    // Helper function to write files using File System Access API
    async function writeFile(path: string, content: string) {
        // For now, we'll use a simple fetch to a backend API
        // In production, you might want to use Electron or a backend service
        try {
            const response = await fetch(`${API_URL}/api/write-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

                // Check if it's a production limitation error (403)
                if (response.status === 403) {
                    throw new Error(`${errorData.error}\n\n${errorData.suggestion || ''}`);
                }

                throw new Error(`Failed to write file: ${path}. ${errorData.error || ''}`);
            }
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(`Cannot connect to backend at ${API_URL}. Please check:
1. Backend is running
2. VITE_API_URL is set correctly in .env
3. CORS is configured properly`);
            }
            throw error;
        }
    }

    const clearCanvas = useCallback(() => {
        if (confirm('Clear all nodes?')) {
            useFlowStore.setState({ nodes: [], edges: [], selectedNode: null });
            setValidationErrors([]);
        }
    }, []);

    const miniMapStyle = useMemo(
        () => ({
            backgroundColor: 'rgba(10, 10, 15, 0.9)',
            maskColor: 'rgba(255, 255, 255, 0.1)',
        }),
        []
    );

    return (
        <div className="flow-builder">
            <div className="builder-header">
                <div className="header-left">
                    <h1 className="builder-title">
                        <span className="logo-text">CRE</span>
                        <span className="logo-accent">ator</span>
                        <span className="title-suffix"> Flow Builder</span>
                    </h1>
                    <p className="builder-subtitle">Design your Chainlink workflow visually</p>
                </div>
                <div className="header-actions">
                    <button className="btn-back" onClick={() => navigate('/')}>
                        ← Back to Home
                    </button>
                    {!walletAddress ? (
                        <button 
                            className="btn-wallet" 
                            onClick={handleWalletConnect}
                            disabled={walletConnecting}
                        >
                            {walletConnecting ? '⏳ Connecting...' : '🦊 Connect Wallet'}
                        </button>
                    ) : (
                        <button 
                            className="btn-wallet connected" 
                            onClick={handleWalletDisconnect}
                            title={walletAddress}
                        >
                            ✅ {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </button>
                    )}
                    <button className="btn-settings" onClick={() => setIsSettingsOpen(true)}>
                        ⚙️ Settings
                    </button>
                    <button className="btn-clear" onClick={clearCanvas}>
                        🗑️ Clear
                    </button>
                    <button className="btn-test" onClick={testWorkflow}>
                        🧪 prove
                    </button>
                    <button className="btn-export" onClick={exportFlow}>
                        💾 Export Flow
                    </button>
                </div>
            </div>

            <div className="builder-content">
                <NodeLibrary onDragStart={onDragStart} />

                <div className="flow-canvas" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onNodeDoubleClick={onNodeDoubleClick}
                        onPaneClick={onPaneClick}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        connectionMode={ConnectionMode.Loose}
                        fitView
                        style={{ background: '#0a0a0f' }}
                        defaultEdgeOptions={{
                            animated: true,
                            style: { stroke: '#667eea', strokeWidth: 2 },
                        }}
                    >
                        <Background
                            color="rgba(102, 126, 234, 0.5)"
                            gap={24}
                            size={2}
                            style={{ background: 'transparent' }}
                        />
                        <Controls style={{ background: 'rgba(10, 10, 15, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                        <MiniMap position="top-right" style={miniMapStyle} nodeColor="#667eea" />

                        <Panel position="top-center" className="flow-panel">
                            <div className="flow-info">
                                <span className="info-item">
                                    📊 Nodes: <strong>{nodes.length}</strong>
                                </span>
                                <span className="info-separator">•</span>
                                <span className="info-item">
                                    🔗 Connections: <strong>{edges.length}</strong>
                                </span>
                            </div>
                        </Panel>

                        {validationErrors.length > 0 && (
                            <Panel position="bottom-left" className="validation-panel error">
                                <div className="validation-header">
                                    ⚠️ <strong>Validation Issues</strong>
                                </div>
                                <div className="validation-list">
                                    {validationErrors.map((error, idx) => (
                                        <div key={idx} className="validation-item">
                                            {error}
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        )}

                    </ReactFlow>
                </div>
            </div>

            <SimulationModal
                isOpen={isSimulationOpen}
                output={simulationOutput}
                status={simulationStatus}
                onClose={() => setIsSimulationOpen(false)}
                onRunAgain={testWorkflow}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <ContractEditorModal
                isOpen={isContractEditorOpen}
                onClose={() => setIsContractEditorOpen(false)}
                contractType={editingContractType}
                onDeploy={handleContractDeploy}
                preConnectedWallet={walletAddress}
            />

            <ContractDetailsModal
                isOpen={isContractDetailsOpen}
                onClose={() => setIsContractDetailsOpen(false)}
                contract={selectedContract}
            />

            <ChatBot />
        </div>
    );
}
