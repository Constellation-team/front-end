import { useEffect, useRef } from 'react';
import './SimulationModal.css';

interface SimulationModalProps {
    isOpen: boolean;
    output: string;
    status: 'idle' | 'running' | 'success' | 'error';
    onClose: () => void;
    onRunAgain?: () => void;
}

export default function SimulationModal({ 
    isOpen, 
    output, 
    status, 
    onClose, 
    onRunAgain 
}: SimulationModalProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll to bottom when new output is added
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [output]);

    if (!isOpen) return null;

    const formatOutput = (text: string) => {
        if (!text) return <div className="simulation-empty">No output yet...</div>;

        return text.split('\n').map((line, index) => {
            let className = 'simulation-output-line';
            
            if (line.includes('[USER LOG]')) {
                className += ' user-log';
            } else if (line.includes('[SIMULATION]') || line.includes('Warning:')) {
                className += ' warning';
            } else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
                className += ' error';
            } else if (line.includes('✓') || line.toLowerCase().includes('success') || line.includes('finished')) {
                className += ' success';
            } else if (line.includes('Workflow') || line.includes('Running')) {
                className += ' info';
            }

            return (
                <div key={index} className={className}>
                    {line || '\u00A0'}
                </div>
            );
        });
    };

    return (
        <div className="simulation-modal-overlay" onClick={onClose}>
            <div className="simulation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="simulation-modal-header">
                    <h2 className="simulation-modal-title">
                        🧪 Workflow Simulation
                        <span className={`simulation-status ${status}`}>
                            <span className="simulation-status-icon"></span>
                            {status === 'running' && 'Running...'}
                            {status === 'success' && 'Completed'}
                            {status === 'error' && 'Error'}
                            {status === 'idle' && 'Ready'}
                        </span>
                    </h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="simulation-modal-content" ref={contentRef}>
                    <div className="simulation-output">
                        {formatOutput(output)}
                    </div>
                </div>

                <div className="simulation-modal-footer">
                    <button 
                        className="btn-modal btn-secondary" 
                        onClick={onClose}
                    >
                        Close
                    </button>
                    {onRunAgain && (
                        <button 
                            className="btn-modal btn-primary" 
                            onClick={onRunAgain}
                            disabled={status === 'running'}
                        >
                            {status === 'running' ? 'Running...' : '🔄 Run Again'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
