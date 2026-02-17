import { create } from 'zustand';
import type { Node, Edge, OnNodesChange, OnEdgesChange } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

export type NodeCategory = 'trigger' | 'datasource' | 'logic' | 'chainlink' | 'blockchain' | 'ai';

export interface NodeData {
    label: string;
    category: NodeCategory;
    icon: string;
    config?: Record<string, unknown>;
}

interface FlowState {
    nodes: Node<NodeData>[];
    edges: Edge[];
    selectedNode: Node<NodeData> | null;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    addNode: (node: Node<NodeData>) => void;
    setSelectedNode: (node: Node<NodeData> | null) => void;
    updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
    deleteNode: (nodeId: string) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    addNode: (node) => {
        set((state) => ({
            nodes: [...state.nodes, node],
        }));
    },

    setSelectedNode: (node) => {
        set({ selectedNode: node });
    },

    updateNodeData: (nodeId, data) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
        }));
    },

    deleteNode: (nodeId) => {
        set((state) => ({
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter(
                (edge) => edge.source !== nodeId && edge.target !== nodeId
            ),
            selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
        }));
    },
}));
