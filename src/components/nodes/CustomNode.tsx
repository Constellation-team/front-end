import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../store/flowStore';
import { IconMapper, MdCheckCircle } from '../IconMapper';
import './CustomNode.css';

const categoryColors: Record<string, string> = {
    trigger: '#6366f1',     // Indigo
    datasource: '#ec4899',  // Pink
    logic: '#8b5cf6',       // Violet
    chainlink: '#3b82f6',   // Blue
    blockchain: '#eab308',  // Yellow
    ai: '#14b8a6',          // Teal
    action: '#0ea5e9',      // Sky Blue
};

function CustomNode({ data, selected }: NodeProps<NodeData>) {
    const bgColor = categoryColors[data.category] || categoryColors.trigger;
    const contractAddress = (data as { contractAddress?: string }).contractAddress;
    const nodeType = (data as { nodeType?: string }).nodeType;
    const isContractNode = nodeType && ['simple-storage', 'erc20-token', 'erc721-nft', 'crowdfunding', 'voting', 'multisig-wallet'].includes(nodeType);

    return (
        <div className={`custom-node ${selected ? 'selected' : ''} ${contractAddress ? 'deployed' : ''}`} data-category={data.category}>
            <Handle type="target" position={Position.Left} className="custom-handle" style={{ borderColor: bgColor }} />

            <div className="node-header" style={{ backgroundColor: bgColor }}>
                <div className="node-icon-wrapper">
                    <IconMapper icon={data.icon} size={20} />
                </div>
                <div className="node-title-container">
                    <div className="node-label">{data.label}</div>
                    <div className="node-category">{data.category}</div>
                </div>
            </div>

            {isContractNode && (
                <div className="node-body">
                    <div className="node-hint">
                        {contractAddress ? (
                            <div className="contract-deployed">
                                <div style={{ display: 'flex', alignItems: 'center' }}><MdCheckCircle style={{ color: '#10b981', marginRight: '6px', fontSize: '14px' }} /> Deployed</div>
                                <div className="contract-address">
                                    {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                                </div>
                                <div className="contract-action-hint">Click for details</div>
                            </div>
                        ) : (
                            <div className="contract-hint">Double-click to deploy</div>
                        )}
                    </div>
                </div>
            )}

            <Handle type="source" position={Position.Right} className="custom-handle" style={{ borderColor: bgColor }} />
        </div>
    );
}

export default memo(CustomNode);
