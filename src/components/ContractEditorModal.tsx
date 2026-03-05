import { useState, useEffect } from 'react';
import { getTemplate, CONTRACT_TEMPLATES, extractContractName } from '../lib/blockchain/solidityTemplates';
import { compileSolidity } from '../lib/blockchain/compile';
import type { CompilationResult } from '../lib/blockchain/compile';
import { deployContract, getEtherscanUrl } from '../lib/blockchain/deploy';
import './ContractEditorModal.css';

interface ContractEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractType: string;
  preConnectedWallet?: string;
  onDeploy: (result: {
    address: string;
    txHash: string;
    abi: unknown[];
    sourceCode: string;
    name: string;
  }) => void;
}

type CompilationState = 'idle' | 'compiling' | 'success' | 'error';
type DeploymentState = 'idle' | 'connecting' | 'deploying' | 'success' | 'error';

export default function ContractEditorModal({
  isOpen,
  onClose,
  contractType,
  preConnectedWallet,
  onDeploy,
}: ContractEditorModalProps) {
  const [sourceCode, setSourceCode] = useState('');
  const [compilationState, setCompilationState] = useState<CompilationState>('idle');
  const [deploymentState, setDeploymentState] = useState<DeploymentState>('idle');
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [txHash, setTxHash] = useState('');

  // Load template when modal opens or contract type changes
  useEffect(() => {
    if (isOpen) {
      const templateName = getTemplateName(contractType);
      const template = getTemplate(templateName);
      setSourceCode(template);
      resetState();
    }
  }, [isOpen, contractType]);

  // Set pre-connected wallet if available
  useEffect(() => {
    if (isOpen && preConnectedWallet) {
      setWalletAddress(preConnectedWallet);
    }
  }, [isOpen, preConnectedWallet]);

  const resetState = () => {
    setCompilationState('idle');
    setDeploymentState('idle');
    setCompilationResult(null);
    setErrorMessage('');
    // Only reset wallet if no pre-connected wallet
    if (!preConnectedWallet) {
      setWalletAddress('');
    }
    setDeployedAddress('');
    setTxHash('');
  };

  const getTemplateName = (type: string): string => {
    const mapping: Record<string, string> = {
      'simple-storage': 'SimpleStorage',
      'erc20-token': 'ERC20',
      'erc721-nft': 'ERC721',
      'crowdfunding': 'Crowdfunding',
      'voting': 'Voting',
      'multisig-wallet': 'MultiSig',
    };
    return mapping[type] || 'SimpleStorage';
  };

  const getContractIcon = (type: string): string => {
    const template = CONTRACT_TEMPLATES.find((t: { name: string }) => getTemplateName(type) === t.name);
    return template?.icon || '📦';
  };

  const handleCompile = async () => {
    setCompilationState('compiling');
    setErrorMessage('');
    
    try {
      const result = await compileSolidity(sourceCode);
      
      if (result.success) {
        setCompilationResult(result.result);
        setCompilationState('success');
      } else {
        setCompilationState('error');
        const errorMsg = result.errors.map((e: { formattedMessage: string }) => e.formattedMessage).join('\n');
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      setCompilationState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Compilation failed');
    }
  };

  const handleDeploy = async () => {
    if (!compilationResult) {
      setErrorMessage('Please compile the contract first');
      return;
    }

    setDeploymentState('deploying');
    setErrorMessage('');
    
    try {
      const result = await deployContract(compilationResult.abi, compilationResult.bytecode);
      setDeployedAddress(result.address);
      setTxHash(result.txHash);
      setDeploymentState('success');
      
      // Call parent callback with deployment info
      onDeploy({
        address: result.address,
        txHash: result.txHash,
        abi: compilationResult.abi,
        sourceCode,
        name: extractContractName(sourceCode),
      });
    } catch (error) {
      setDeploymentState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Deployment failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contract-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="contract-icon">{getContractIcon(contractType)}</span>
            <h2>Contract Editor - {getTemplateName(contractType)}</h2>
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Editor Section */}
          <div className="editor-section">
            <div className="section-header">
              <h3>📝 Solidity Code</h3>
              <button 
                className="compile-button"
                onClick={handleCompile}
                disabled={compilationState === 'compiling'}
              >
                {compilationState === 'compiling' ? '⏳ Compiling...' : '🔨 Compile'}
              </button>
            </div>
            <textarea
              className="code-editor"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Compilation Status */}
          {compilationState !== 'idle' && (
            <div className={`status-box ${compilationState}`}>
              {compilationState === 'compiling' && '⏳ Compiling contract...'}
              {compilationState === 'success' && '✅ Compilation successful!'}
              {compilationState === 'error' && (
                <>
                  <strong>❌ Compilation failed:</strong>
                  <pre>{errorMessage}</pre>
                </>
              )}
            </div>
          )}

          {/* Deployment Section */}
          {compilationState === 'success' && (
            <div className="deployment-section">
              <div className="section-header">
                <h3>🚀 Deploy to Sepolia</h3>
              </div>

              {!walletAddress ? (
                <div className="wallet-required-message">
                  <div className="message-icon">🔒</div>
                  <div className="message-content">
                    <h4>Wallet Connection Required</h4>
                    <p>
                      Please connect your MetaMask wallet using the 
                      <strong> "🦊 Connect Wallet" </strong> 
                      button in the Flow Builder header before deploying contracts.
                    </p>
                    <div className="message-hint">
                      💡 This allows you to deploy multiple contracts without reconnecting each time.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="deployment-controls">
                  <div className="wallet-info">
                    <strong>Connected:</strong>
                    <code>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</code>
                  </div>
                  
                  {deploymentState !== 'success' ? (
                    <button 
                      className="deploy-button"
                      onClick={handleDeploy}
                      disabled={deploymentState === 'deploying'}
                    >
                      {deploymentState === 'deploying' ? '⏳ Deploying...' : '🚀 Deploy Contract'}
                    </button>
                  ) : (
                    <div className="deployment-success">
                      <div className="success-header">✅ Contract Deployed!</div>
                      <div className="deployment-info">
                        <div className="info-row">
                          <strong>Contract:</strong>
                          <a 
                            href={getEtherscanUrl(deployedAddress, 'address')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {deployedAddress.slice(0, 10)}...{deployedAddress.slice(-8)}
                          </a>
                        </div>
                        <div className="info-row">
                          <strong>Transaction:</strong>
                          <a 
                            href={getEtherscanUrl(txHash, 'tx')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {txHash.slice(0, 10)}...{txHash.slice(-8)}
                          </a>
                        </div>
                      </div>
                      <button className="close-success-button" onClick={onClose}>
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}

              {deploymentState === 'error' && (
                <div className="status-box error">
                  <strong>❌ Deployment failed:</strong>
                  <p>{errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
