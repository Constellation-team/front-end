import type { NodeCategory } from '../store/flowStore';
import './NodeLibrary.css';

export interface NodeTemplate {
    type: string;
    label: string;
    category: NodeCategory;
    icon: string;
    description: string;
}

const nodeTemplates: NodeTemplate[] = [
    // Triggers
    { type: 'cron-trigger', label: 'Cron Trigger', category: 'trigger', icon: '⏰', description: 'Execute on schedule' },
    { type: 'webhook-trigger', label: 'Webhook', category: 'trigger', icon: '🔔', description: 'HTTP endpoint trigger' },
    { type: 'manual-trigger', label: 'Manual', category: 'trigger', icon: '🎯', description: 'Manual execution' },

    // Data Sources
    { type: 'http-request', label: 'HTTP Request', category: 'datasource', icon: '🌐', description: 'Make API calls' },
    { type: 'data-streams', label: 'Data Streams', category: 'datasource', icon: '📊', description: 'Chainlink Data Streams' },

    // Logic
    { type: 'if-else', label: 'If/Else', category: 'logic', icon: '🔀', description: 'Conditional logic' },
    { type: 'transform', label: 'Transform', category: 'logic', icon: '🔧', description: 'Data transformation' },
    { type: 'merge', label: 'Merge', category: 'logic', icon: '🔗', description: 'Combine data' },

    // Chainlink
    { type: 'oracle', label: 'Oracle', category: 'chainlink', icon: '🔮', description: 'Chainlink Oracle' },
    { type: 'ccip', label: 'CCIP', category: 'chainlink', icon: '🌉', description: 'Cross-chain messaging' },
    { type: 'functions', label: 'Functions', category: 'chainlink', icon: '⚡', description: 'Chainlink Functions' },

    // Blockchain
    { type: 'contract-call', label: 'Contract Call', category: 'blockchain', icon: '📝', description: 'Call smart contract' },
    { type: 'event-listener', label: 'Event Listener', category: 'blockchain', icon: '👂', description: 'Listen to events' },
    
    // Contract Deployment Nodes
    { type: 'simple-storage', label: 'Simple Storage', category: 'blockchain', icon: '📦', description: 'Basic storage contract' },
    { type: 'erc20-token', label: 'ERC20 Token', category: 'blockchain', icon: '🪙', description: 'Deploy fungible token' },
    { type: 'erc721-nft', label: 'ERC721 NFT', category: 'blockchain', icon: '🖼️', description: 'Deploy NFT collection' },
    { type: 'crowdfunding', label: 'Crowdfunding', category: 'blockchain', icon: '💰', description: 'Deploy fundraising campaign' },
    { type: 'voting', label: 'Voting', category: 'blockchain', icon: '🗳️', description: 'Deploy voting system' },
    { type: 'multisig-wallet', label: 'MultiSig Wallet', category: 'blockchain', icon: '🔐', description: 'Deploy multi-signature wallet' },

    // AI
    { type: 'llm', label: 'LLM', category: 'ai', icon: '🤖', description: 'AI language model' },
];

interface NodeLibraryProps {
    onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
}

export default function NodeLibrary({ onDragStart }: NodeLibraryProps) {
    const categories: NodeCategory[] = ['trigger', 'datasource', 'logic', 'chainlink', 'blockchain', 'ai'];

    const categoryLabels: Record<NodeCategory, string> = {
        trigger: '🎬 Triggers',
        datasource: '📡 Data Sources',
        logic: '🧠 Logic',
        chainlink: '🔗 Chainlink',
        blockchain: '⛓️ Blockchain',
        ai: '🤖 AI',
    };

    return (
        <div className="node-library">
            <div className="library-header">
                <h3>Node Library</h3>
                <p>Drag nodes to the canvas</p>
            </div>

            <div className="library-content">
                {categories.map((category) => {
                    const nodes = nodeTemplates.filter((n) => n.category === category);
                    if (nodes.length === 0) return null;

                    return (
                        <div key={category} className="node-category-section">
                            <div className="category-title">{categoryLabels[category]}</div>
                            <div className="node-list">
                                {nodes.map((template) => (
                                    <div
                                        key={template.type}
                                        className="node-template"
                                        draggable
                                        onDragStart={(e) => onDragStart(e, template)}
                                    >
                                        <span className="template-icon">{template.icon}</span>
                                        <div className="template-info">
                                            <div className="template-label">{template.label}</div>
                                            <div className="template-description">{template.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="connection-rules">
                <div className="rules-header">
                    <span>📋</span>
                    <strong>Connection Rules</strong>
                </div>
                <div className="rules-list">
                    <div className="rule-item">
                        <strong>🎬 Trigger</strong>
                        <span>→ Data, Logic, Chainlink, Blockchain, AI</span>
                        <small>Only 1 trigger per workflow</small>
                    </div>
                    <div className="rule-item">
                        <strong>📡 Data Source</strong>
                        <span>→ Logic, Chainlink, Blockchain, AI</span>
                    </div>
                    <div className="rule-item">
                        <strong>🔗 Chainlink</strong>
                        <span>→ Logic, Blockchain, AI</span>
                    </div>
                    <div className="rule-item">
                        <strong>🧠 Logic</strong>
                        <span>→ Anywhere (most flexible)</span>
                    </div>
                    <div className="rule-item">
                        <strong>⛓️ Blockchain</strong>
                        <span>→ Logic, AI</span>
                    </div>
                    <div className="rule-item">
                        <strong>🤖 AI</strong>
                        <span>→ Logic, Blockchain</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
