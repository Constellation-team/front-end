import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../store/flowStore';
import './CustomNode.css';

const categoryColors: Record<string, string> = {
    trigger: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    datasource: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    logic: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    chainlink: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    blockchain: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ai: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
};

function CustomNode({ data, selected }: NodeProps<NodeData>) {
    const bgGradient = categoryColors[data.category] || categoryColors.trigger;

    return (
        <div className={`custom-node ${selected ? 'selected' : ''}`}>
            <Handle type="target" position={Position.Left} className="custom-handle" />

            <div className="node-header" style={{ background: bgGradient }}>
                <span className="node-icon">{data.icon}</span>
            </div>

            <div className="node-body">
                <div className="node-label">{data.label}</div>
                <div className="node-category">{data.category}</div>
            </div>

            <Handle type="source" position={Position.Right} className="custom-handle" />
        </div>
    );
}

export default memo(CustomNode);
