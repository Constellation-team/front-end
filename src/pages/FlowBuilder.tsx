import { useCallback, useRef, useMemo, useState } from 'react';
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

const nodeTypes = {
    custom: CustomNode,
};

export default function FlowBuilder() {
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

    const exportFlow = useCallback(() => {
        const flowData = {
            nodes: nodes.map(node => ({
                id: node.id,
                type: node.data.category,
                label: node.data.label,
                config: node.data.config || {},
            })),
            connections: edges.map(edge => ({
                from: edge.source,
                to: edge.target,
            })),
        };

        console.log('Export Flow:', flowData);
        alert('Check console for flow data. (Export to CRE YAML coming soon!)');
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

            // Write files to cre-orchestrator directory
            const orchestratorPath = 'd:\\Proyectos\\Hackathon\\Chainlink\\cre-orchestrator';

            // Write main.ts
            await writeFile(`${orchestratorPath}\\workflows\\main.ts`, generatedFiles['main.ts']);
            setSimulationOutput(prev => prev + '✓ main.ts written\n');

            // Write workflow.yaml
            await writeFile(`${orchestratorPath}\\workflows\\workflow.yaml`, generatedFiles['workflow.yaml']);
            setSimulationOutput(prev => prev + '✓ workflow.yaml written\n');

            // Write config files
            await writeFile(`${orchestratorPath}\\workflows\\config.staging.json`, generatedFiles['config.staging.json']);
            await writeFile(`${orchestratorPath}\\workflows\\config.production.json`, generatedFiles['config.production.json']);
            setSimulationOutput(prev => prev + '✓ Config files written\n\n');

            setSimulationOutput(prev => prev + 'Running simulation...\n');
            setSimulationOutput(prev => prev + '─'.repeat(60) + '\n\n');

            // Run simulation command
            const response = await fetch('http://localhost:3001/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orchestratorPath }),
            });

            if (!response.ok) {
                throw new Error('Simulation failed');
            }

            const data = await response.json();
            setSimulationOutput(prev => prev + data.output);
            setSimulationStatus(data.success ? 'success' : 'error');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setSimulationOutput(prev => prev + `\n❌ Error: ${errorMsg}\n`);
            setSimulationStatus('error');
        }
    }, [nodes, edges]);

    // Helper function to write files using File System Access API
    async function writeFile(path: string, content: string) {
        // For now, we'll use a simple fetch to a backend API
        // In production, you might want to use Electron or a backend service
        const response = await fetch('http://localhost:3001/api/write-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content }),
        });

        if (!response.ok) {
            throw new Error(`Failed to write file: ${path}`);
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
