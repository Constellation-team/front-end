import { useState } from 'react';
import { getEtherscanUrl } from '../lib/blockchain/deploy';
import type { DeployedContract } from '../lib/blockchain/contractStorage';
import './ContractDetailsModal.css';

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: DeployedContract | null;
}

export default function ContractDetailsModal({
  isOpen,
  onClose,
  contract,
}: ContractDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'abi'>('info');

  if (!isOpen || !contract) return null;

  const deployDate = new Date(contract.deployedAt).toLocaleString();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contract-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="contract-icon">📋</span>
            <h2>{contract.name}</h2>
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📊 Contract Info
          </button>
          <button
            className={`tab ${activeTab === 'abi' ? 'active' : ''}`}
            onClick={() => setActiveTab('abi')}
          >
            🔧 ABI Preview
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'info' ? (
            <div className="info-tab">
              <div className="info-section">
                <h3>🚀 Deployment Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Contract Type</label>
                    <div className="info-value">{contract.type}</div>
                  </div>
                  <div className="info-item">
                    <label>Network</label>
                    <div className="info-value network">{contract.network.toUpperCase()}</div>
                  </div>
                  <div className="info-item">
                    <label>Deployed At</label>
                    <div className="info-value">{deployDate}</div>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>📍 Contract Address</h3>
                <div className="address-box">
                  <code className="address">{contract.address}</code>
                  <button
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(contract.address);
                      alert('Address copied to clipboard!');
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <a
                  href={getEtherscanUrl(contract.address, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etherscan-link"
                >
                  🔍 View on Etherscan
                </a>
              </div>

              <div className="info-section">
                <h3>📝 Transaction Hash</h3>
                <div className="address-box">
                  <code className="address">{contract.txHash}</code>
                  <button
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(contract.txHash);
                      alert('Transaction hash copied to clipboard!');
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <a
                  href={getEtherscanUrl(contract.txHash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etherscan-link"
                >
                  🔍 View Transaction on Etherscan
                </a>
              </div>

              <div className="info-section">
                <h3>📄 Source Code</h3>
                <div className="source-preview">
                  <pre>{contract.sourceCode}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="abi-tab">
              <div className="abi-section">
                <div className="abi-header">
                  <h3>🔧 Contract ABI</h3>
                  <button
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(contract.abi, null, 2));
                      alert('ABI copied to clipboard!');
                    }}
                  >
                    📋 Copy ABI
                  </button>
                </div>
                <div className="abi-preview">
                  <pre>{JSON.stringify(contract.abi, null, 2)}</pre>
                </div>
              </div>

              <div className="abi-functions">
                <h4>📚 Functions & Events</h4>
                <div className="functions-list">
                  {(contract.abi as Array<{ type: string; name?: string; inputs?: unknown[] }>)
                    .filter(item => item.type === 'function' || item.type === 'event')
                    .map((item, idx) => (
                      <div key={idx} className={`function-item ${item.type}`}>
                        <span className="function-type">{item.type}</span>
                        <span className="function-name">{item.name || 'constructor'}</span>
                        <span className="function-params">
                          ({(item.inputs || []).length} params)
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
