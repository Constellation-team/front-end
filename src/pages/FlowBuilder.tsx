import { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    ConnectionMode,
    Panel,
} from 'reactflow';
import type { Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import './FlowBuilder.css';

import { useFlowStore } from '../store/flowStore';
import NodeLibrary, { type NodeTemplate } from '../components/NodeLibrary';
import CustomNode from '../components/nodes/CustomNode';
import SimulationModal from '../components/SimulationModal';
import SettingsModal from '../components/SettingsModal';
import { generateCRECode } from '../utils/codeGenerator';
import { isValidConnection, canAddNode, validateWorkflow } from '../utils/flowValidation';
import { generateProjectZip, downloadZip } from '../utils/projectTemplateGenerator';
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

    // Validation state
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Backend connection state
    const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

    // Check backend connectivity on mount
    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await fetch(`${API_URL}/health`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000), // 5 second timeout
                });
                
                if (response.ok) {
                    setBackendStatus('connected');
                } else {
                    setBackendStatus('disconnected');
                }
            } catch (error) {
                setBackendStatus('disconnected');
            }
        };

        checkBackend();
    }, []);

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
            setSelectedNode(node as never);
        },
        [setSelectedNode]
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, [setSelectedNode]);

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

        try {
            // Generate the complete project ZIP
            const zipBlob = await generateProjectZip(
                nodes,
                edges,
                {
                    projectName,
                    description: projectDescription || 'A Chainlink CRE workflow',
                    author: undefined,
                }
            );

            // Download the ZIP file
            const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}.zip`;
            downloadZip(zipBlob, filename);

            alert(`✅ Success!\n\nYour project "${projectName}" has been exported.\n\nThe ZIP contains:\n• Workflow files (main.ts, configs)\n• Project configuration\n• Documentation (README, QUICKSTART)\n• Setup files (.env.example, .gitignore)\n\nExtract the ZIP and follow the QUICKSTART.md to get started!`);
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
                throw new Error(`Simulation failed: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            setSimulationOutput(prev => prev + data.output);
            setSimulationStatus(data.success ? 'success' : 'error');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            
            // Check if it's a connection error
            if (errorMsg.includes('fetch') || errorMsg.includes('connect to backend')) {
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
                    {backendStatus === 'connected' && (
                        <div className="backend-status connected" title={`Connected to: ${API_URL}`}>
                            ✓ Backend Connected
                        </div>
                    )}
                    {backendStatus === 'disconnected' && (
                        <div className="backend-status disconnected" title={`Cannot connect to: ${API_URL}`}>
                            ⚠️ Backend Disconnected - Check .env VITE_API_URL
                        </div>
                    )}
                    {backendStatus === 'checking' && (
                        <div className="backend-status checking" title="Checking backend connection...">
                            ⏳ Checking backend...
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    <button className="btn-back" onClick={() => navigate('/')}>
                        ← Back to Home
                    </button>
                    <button className="btn-settings" onClick={() => setIsSettingsOpen(true)}>
                        ⚙️ Settings
                    </button>
                    <button className="btn-clear" onClick={clearCanvas}>
                        🗑️ Clear
                    </button>
                    <button className="btn-test" onClick={testWorkflow}>
                        🧪 Probar
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
                        <MiniMap style={miniMapStyle} nodeColor="#667eea" />

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

                        {nodes.length === 0 && (
                            <Panel position="bottom-right" className="help-panel">
                                <div className="help-header">
                                    💡 <strong>Connection Rules</strong>
                                </div>
                                <div className="help-content">
                                    <div className="help-rule">
                                        <strong>1. Start with a Trigger</strong>
                                        <span>Every workflow needs exactly one Trigger node (Cron or Webhook)</span>
                                    </div>
                                    <div className="help-rule">
                                        <strong>2. Valid Flow Order</strong>
                                        <span>Trigger → Data Source → Logic → Blockchain/AI</span>
                                    </div>
                                    <div className="help-rule">
                                        <strong>3. Connection Rules</strong>
                                        <span>• Triggers: can't receive connections</span>
                                        <span>• Logic nodes: most flexible, can connect anywhere</span>
                                        <span>• Invalid connections will be blocked</span>
                                    </div>
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
        </div>
    );
}
