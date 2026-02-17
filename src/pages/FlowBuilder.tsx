import { useCallback, useRef, useMemo } from 'react';
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

const nodeTypes = {
    custom: CustomNode,
};

export default function FlowBuilder() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { nodes, edges, onNodesChange, onEdgesChange, addNode, setSelectedNode } = useFlowStore();

    const nodeId = useRef(0);

    const onConnect = useCallback(
        (params: Connection) => {
            useFlowStore.setState({
                edges: addEdge({ ...params, animated: true, style: { stroke: '#667eea' } }, edges),
            });
        },
        [edges]
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
            }
        },
        [addNode]
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

    const clearCanvas = useCallback(() => {
        if (confirm('Clear all nodes?')) {
            useFlowStore.setState({ nodes: [], edges: [], selectedNode: null });
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
                    <button className="btn-clear" onClick={clearCanvas}>
                        🗑️ Clear
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
                            color="rgba(102, 126, 234, 0.3)" 
                            gap={20} 
                            size={1}
                            style={{ background: '#0a0a0f' }}
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
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}
