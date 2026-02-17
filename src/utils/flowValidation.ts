import type { Node, Edge } from 'reactflow';

export type NodeCategory = 'trigger' | 'datasource' | 'chainlink' | 'blockchain' | 'logic' | 'ai';

/**
 * Defines which node categories can connect to which
 * Key: source category, Value: array of valid target categories
 */
export const CONNECTION_RULES: Record<NodeCategory, NodeCategory[]> = {
    // Triggers can connect to any processing node (but not other triggers)
    trigger: ['datasource', 'chainlink', 'blockchain', 'logic', 'ai'],
    
    // Data sources can connect to processing and output nodes
    datasource: ['logic', 'chainlink', 'blockchain', 'ai'],
    
    // Chainlink services can connect to logic, blockchain, and AI
    chainlink: ['logic', 'blockchain', 'ai'],
    
    // Logic nodes are very flexible - can connect to almost anything
    logic: ['logic', 'chainlink', 'blockchain', 'ai', 'datasource'],
    
    // Blockchain nodes can connect to logic and AI for processing results
    blockchain: ['logic', 'ai'],
    
    // AI nodes can connect to logic and blockchain
    ai: ['logic', 'blockchain'],
};

/**
 * Categories that can only have one instance in a workflow
 */
export const SINGLE_INSTANCE_CATEGORIES: NodeCategory[] = ['trigger'];

/**
 * Categories that should not receive incoming connections
 */
export const NO_INCOMING_CATEGORIES: NodeCategory[] = ['trigger'];

/**
 * Validates if a connection between two nodes is allowed
 */
export function isValidConnection(
    sourceNode: Node | undefined,
    targetNode: Node | undefined
): { valid: boolean; reason?: string } {
    if (!sourceNode || !targetNode) {
        return { valid: false, reason: 'Source or target node not found' };
    }

    const sourceCategory = sourceNode.data.category as NodeCategory;
    const targetCategory = targetNode.data.category as NodeCategory;

    // Check if target category doesn't accept incoming connections
    if (NO_INCOMING_CATEGORIES.includes(targetCategory)) {
        return { 
            valid: false, 
            reason: `${capitalize(targetCategory)} nodes cannot receive connections` 
        };
    }

    // Check if connection is allowed by rules
    const allowedTargets = CONNECTION_RULES[sourceCategory] || [];
    if (!allowedTargets.includes(targetCategory)) {
        return { 
            valid: false, 
            reason: `Cannot connect ${capitalize(sourceCategory)} → ${capitalize(targetCategory)}` 
        };
    }

    // Prevent self-connection
    if (sourceNode.id === targetNode.id) {
        return { valid: false, reason: 'Cannot connect a node to itself' };
    }

    return { valid: true };
}

/**
 * Validates if adding a new node of a category is allowed
 */
export function canAddNode(
    category: NodeCategory,
    existingNodes: Node[]
): { valid: boolean; reason?: string } {
    // Check single instance restriction
    if (SINGLE_INSTANCE_CATEGORIES.includes(category)) {
        const existingCount = existingNodes.filter(n => n.data.category === category).length;
        if (existingCount > 0) {
            return { 
                valid: false, 
                reason: `Only one ${capitalize(category)} node is allowed per workflow` 
            };
        }
    }

    return { valid: true };
}

/**
 * Validates the entire workflow structure
 */
export function validateWorkflow(
    nodes: Node[],
    edges: Edge[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if there's at least one trigger
    const triggers = nodes.filter(n => n.data.category === 'trigger');
    if (triggers.length === 0 && nodes.length > 0) {
        errors.push('⚠️ Workflow should start with a Trigger node');
    }

    // Check if there are multiple triggers
    if (triggers.length > 1) {
        errors.push('❌ Only one Trigger node is allowed per workflow');
    }

    // Check if all nodes are connected (no orphans except trigger)
    if (nodes.length > 1) {
        const connectedNodes = new Set<string>();
        edges.forEach(edge => {
            connectedNodes.add(edge.source);
            connectedNodes.add(edge.target);
        });

        const orphans = nodes.filter(n => !connectedNodes.has(n.id) && n.data.category !== 'trigger');
        if (orphans.length > 0) {
            errors.push(`⚠️ ${orphans.length} disconnected node(s) found`);
        }
    }

    // Validate all connections
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const validation = isValidConnection(sourceNode, targetNode);
        if (!validation.valid) {
            errors.push(`❌ Invalid connection: ${validation.reason}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Gets suggested next nodes for a given node category
 */
export function getSuggestedConnections(category: NodeCategory): NodeCategory[] {
    return CONNECTION_RULES[category] || [];
}

/**
 * Gets user-friendly description of what a category can connect to
 */
export function getConnectionDescription(category: NodeCategory): string {
    const allowed = CONNECTION_RULES[category] || [];
    if (allowed.length === 0) {
        return 'Cannot connect to other nodes';
    }
    const formatted = allowed.map(capitalize).join(', ');
    return `Can connect to: ${formatted}`;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
