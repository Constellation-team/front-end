import { useState, useEffect } from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [privateKey, setPrivateKey] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCurrentConfig();
        }
    }, [isOpen]);

    const loadCurrentConfig = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/get-env-config');
            if (response.ok) {
                const data = await response.json();
                setIsConfigured(data.hasPrivateKey);
                if (data.hasPrivateKey) {
                    setPrivateKey('••••••••••••••••'); // Show masked value
                }
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    };

    const handleSave = async () => {
        if (!privateKey || privateKey === '••••••••••••••••') {
            setErrorMessage('Please enter a valid private key');
            setSaveStatus('error');
            return;
        }

        // Basic validation for Ethereum private key format
        const cleanKey = privateKey.trim().replace(/^0x/, '');
        if (cleanKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            setErrorMessage('Invalid private key format. Should be 64 hex characters (with or without 0x prefix)');
            setSaveStatus('error');
            return;
        }

        setIsSaving(true);
        setSaveStatus('idle');
        setErrorMessage('');

        try {
            const response = await fetch('http://localhost:3001/api/set-env-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    privateKey: cleanKey.startsWith('0x') ? cleanKey : `0x${cleanKey}`
                }),
            });

            if (response.ok) {
                setSaveStatus('success');
                setIsConfigured(true);
                setTimeout(() => {
                    setSaveStatus('idle');
                    onClose();
                }, 1500);
            } else {
                const data = await response.json();
                setErrorMessage(data.error || 'Failed to save configuration');
                setSaveStatus('error');
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        if (confirm('Are you sure you want to remove your private key? The default key will be used for simulations.')) {
            setPrivateKey('');
            setIsConfigured(false);
            handleSave();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2 className="settings-modal-title">
                        ⚙️ Simulation Settings
                    </h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="settings-modal-content">
                    <div className="settings-section">
                        <div className="settings-section-header">
                            <h3>🔐 Ethereum Private Key</h3>
                            <span className={`config-status ${isConfigured ? 'configured' : 'not-configured'}`}>
                                {isConfigured ? '✓ Configured' : '⚠️ Using Default Key'}
                            </span>
                        </div>
                        
                        <p className="settings-description">
                            Configure your MetaMask private key for blockchain simulations. 
                            This will be stored securely in your local <code>.env</code> file.
                        </p>

                        <div className="settings-warning">
                            <strong>⚠️ Security Warning:</strong>
                            <ul>
                                <li>Never share your private key with anyone</li>
                                <li>Only use test/development keys for simulations</li>
                                <li>Your key is stored locally and never sent to external servers</li>
                            </ul>
                        </div>

                        <div className="input-group">
                            <label htmlFor="privateKey">Private Key</label>
                            <div className="input-with-toggle">
                                <input
                                    id="privateKey"
                                    type={showKey ? 'text' : 'password'}
                                    value={privateKey}
                                    onChange={(e) => {
                                        setPrivateKey(e.target.value);
                                        setSaveStatus('idle');
                                        setErrorMessage('');
                                    }}
                                    placeholder="0x..."
                                    className="settings-input"
                                    disabled={isSaving}
                                />
                                <button
                                    type="button"
                                    className="toggle-visibility-btn"
                                    onClick={() => setShowKey(!showKey)}
                                    title={showKey ? 'Hide key' : 'Show key'}
                                >
                                    {showKey ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            <small className="input-hint">
                                64 hexadecimal characters (with or without 0x prefix)
                            </small>
                        </div>

                        {errorMessage && (
                            <div className="settings-error">
                                ❌ {errorMessage}
                            </div>
                        )}

                        {saveStatus === 'success' && (
                            <div className="settings-success">
                                ✓ Configuration saved successfully!
                            </div>
                        )}

                        <div className="settings-help">
                            <details>
                                <summary>🔍 How to export your private key from MetaMask</summary>
                                <ol>
                                    <li>Open MetaMask extension</li>
                                    <li>Click the three dots menu</li>
                                    <li>Select "Account details"</li>
                                    <li>Click "Show private key"</li>
                                    <li>Enter your MetaMask password</li>
                                    <li>Copy the private key and paste it here</li>
                                </ol>
                                <p><strong>Recommended:</strong> Use a separate test account for development!</p>
                            </details>
                        </div>
                    </div>
                </div>

                <div className="settings-modal-footer">
                    {isConfigured && (
                        <button 
                            className="btn-modal btn-danger" 
                            onClick={handleClear}
                            disabled={isSaving}
                        >
                            🗑️ Remove Key
                        </button>
                    )}
                    <div style={{ flex: 1 }}></div>
                    <button 
                        className="btn-modal btn-secondary" 
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn-modal btn-primary" 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : '💾 Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
