import { useState, useRef, useEffect, useCallback } from 'react';
import { useFlowStore } from '../store/flowStore';
import type { NodeCategory } from '../store/flowStore';
import './ChatBot.css';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface WorkflowSpec {
    nodes: { type: string; label: string }[];
    edges: { from: number; to: number }[];
}

// Maps node type to its full metadata
const NODE_CATALOG: Record<string, { label: string; category: NodeCategory; icon: string }> = {
    'cron-trigger': { label: 'Cron Trigger', category: 'trigger', icon: '⏰' },
    'webhook-trigger': { label: 'Webhook', category: 'trigger', icon: '🔔' },
    'manual-trigger': { label: 'Manual', category: 'trigger', icon: '🎯' },
    'http-request': { label: 'HTTP Request', category: 'datasource', icon: '🌐' },
    'data-streams': { label: 'Data Streams', category: 'datasource', icon: '📊' },
    'if-else': { label: 'If/Else', category: 'logic', icon: '🔀' },
    'transform': { label: 'Transform', category: 'logic', icon: '🔧' },
    'merge': { label: 'Merge', category: 'logic', icon: '🔗' },
    'oracle': { label: 'Oracle', category: 'chainlink', icon: '🔮' },
    'ccip': { label: 'CCIP', category: 'chainlink', icon: '🌉' },
    'functions': { label: 'Functions', category: 'chainlink', icon: '⚡' },
    'contract-call': { label: 'Contract Call', category: 'blockchain', icon: '📝' },
    'event-listener': { label: 'Event Listener', category: 'blockchain', icon: '👂' },
    'simple-storage': { label: 'SimpleStorage', category: 'blockchain', icon: '📦' },
    'erc20-token': { label: 'ERC20 Token', category: 'blockchain', icon: '🪙' },
    'erc721-nft': { label: 'ERC721 NFT', category: 'blockchain', icon: '🖼️' },
    'crowdfunding': { label: 'Crowdfunding', category: 'blockchain', icon: '💰' },
    'voting': { label: 'Voting', category: 'blockchain', icon: '🗳️' },
    'multisig-wallet': { label: 'MultiSig Wallet', category: 'blockchain', icon: '🔐' },
    'llm': { label: 'LLM', category: 'ai', icon: '🤖' },
};

const SYSTEM_PROMPT = `Eres el asistente experto de CREator, la herramienta visual para diseñar workflows de Chainlink CRE (Chainlink Runtime Environment).

Tu trabajo principal es ayudar a los usuarios a diseñar workflows usando los nodos y reglas de conexión exactas de CREator.

═══ NODOS DISPONIBLES ═══

🎬 TRIGGER (Solo 1 por workflow, no recibe conexiones entrantes)
  - ⏰ Cron Trigger (type: "cron-trigger")
  - 🔔 Webhook (type: "webhook-trigger")
  - 🎯 Manual (type: "manual-trigger")

📡 DATA SOURCE
  - 🌐 HTTP Request (type: "http-request")
  - 📊 Data Streams (type: "data-streams")

🧠 LOGIC
  - 🔀 If/Else (type: "if-else")
  - 🔧 Transform (type: "transform")
  - 🔗 Merge (type: "merge")

🔗 CHAINLINK
  - 🔮 Oracle (type: "oracle")
  - 🌉 CCIP (type: "ccip")
  - ⚡ Functions (type: "functions")

⛓️ BLOCKCHAIN
  - 📝 Contract Call (type: "contract-call")
  - 👂 Event Listener (type: "event-listener")
  - 📦 SimpleStorage Contract (type: "simple-storage") - Deploy basic storage contract
  - 🪙 ERC20 Token (type: "erc20-token") - Deploy fungible token
  - 🖼️ ERC721 NFT (type: "erc721-nft") - Deploy NFT collection
  - 💰 Crowdfunding (type: "crowdfunding") - Deploy fundraising contract
  - 🗳️ Voting (type: "voting") - Deploy voting system
  - 🔐 MultiSig Wallet (type: "multisig-wallet") - Deploy multi-signature wallet

🤖 AI
  - 🤖 LLM (type: "llm")

═══ REGLAS DE CONEXIÓN (OBLIGATORIAS) ═══

🎬 Trigger     → Data Source, Logic, Chainlink, Blockchain, AI
📡 Data Source  → Logic, Chainlink, Blockchain, AI
🔗 Chainlink   → Logic, Blockchain, AI
🧠 Logic       → Logic, Chainlink, Blockchain, AI, Data Source (el más flexible)
⛓️ Blockchain  → Logic, AI
🤖 AI          → Logic, Blockchain

Reglas adicionales:
- Solo 1 Trigger por workflow
- Triggers NO reciben conexiones entrantes
- Todo workflow debe empezar con un Trigger

═══ INSTRUCCIONES ═══

Cuando el usuario proponga una idea de workflow CRE:

1. **Nodos necesarios**: Lista los nodos específicos que se necesitan
2. **Flujo de conexiones**: Muestra el flujo paso a paso con emojis y flechas →
3. **Explicación de cada paso**: Describe qué hace cada nodo en el flujo
4. **Validación**: Asegúrate de que TODAS las conexiones respeten las reglas

5. **IMPORTANTE - Bloque JSON**: Al final de CADA respuesta que involucre un diseño de workflow, SIEMPRE incluye un bloque JSON con el esquema exacto. Usa EXACTAMENTE este formato con la etiqueta json-workflow:

\`\`\`json-workflow
{
  "nodes": [
    { "type": "cron-trigger", "label": "Cron Trigger" },
    { "type": "http-request", "label": "HTTP Request" },
    { "type": "if-else", "label": "If/Else" },
    { "type": "contract-call", "label": "Contract Call" }
  ],
  "edges": [
    { "from": 0, "to": 1 },
    { "from": 1, "to": 2 },
    { "from": 2, "to": 3 }
  ]
}
\`\`\`

Los "type" DEBEN ser exactamente uno de los types listados arriba. Los "edges" usan los índices del array "nodes" (0-based). Cada "from"/"to" es el índice del nodo en el array.

Responde siempre en español a menos que el usuario escriba en otro idioma.
Sé conciso pero completo.
Si no sabes algo, dilo honestamente.`;


const SUGGESTIONS = [
    '💡 Quiero un workflow que monitoree precios de cripto',
    '🔧 Diseña un workflow con Oracle y Contract Call',
    '🪙 Necesito deployar un token ERC20 cuando se cumpla una condición',
];

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBuilding, setIsBuilding] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [isClosing, setIsClosing] = useState(false);

    const { addNode } = useFlowStore();

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 350);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 250);
    }, []);

    const handleToggle = useCallback(() => {
        if (isOpen) {
            handleClose();
        } else {
            setIsOpen(true);
        }
    }, [isOpen, handleClose]);

    // Parse workflow JSON from message
    const parseWorkflowJSON = useCallback((content: string): WorkflowSpec | null => {
        const match = content.match(/```json-workflow\s*\n?([\s\S]*?)\n?\s*```/);
        if (!match) return null;

        try {
            const spec = JSON.parse(match[1]) as WorkflowSpec;
            // Validate structure
            if (!spec.nodes || !Array.isArray(spec.nodes) || spec.nodes.length === 0) return null;
            if (!spec.edges || !Array.isArray(spec.edges)) return null;
            // Validate all node types exist in catalog
            for (const node of spec.nodes) {
                if (!NODE_CATALOG[node.type]) return null;
            }
            return spec;
        } catch {
            return null;
        }
    }, []);

    // Build workflow on canvas with animation
    const buildWorkflowOnCanvas = useCallback(async (spec: WorkflowSpec) => {
        setIsBuilding(true);

        // Ask user confirmation if canvas has nodes
        const currentNodes = useFlowStore.getState().nodes;
        if (currentNodes.length > 0) {
            const proceed = confirm('⚠️ El canvas tiene nodos existentes.\n¿Quieres limpiar el canvas y crear el nuevo workflow?');
            if (!proceed) {
                setIsBuilding(false);
                return;
            }
            // Clear canvas
            useFlowStore.setState({ nodes: [], edges: [], selectedNode: null });
            await new Promise(r => setTimeout(r, 300));
        }

        const nodeIds: string[] = [];
        const startX = 250;
        const startY = 80;
        const spacingX = 300;
        const spacingY = 150;

        // Layout: cascade diagonal for readability
        for (let i = 0; i < spec.nodes.length; i++) {
            const nodeSpec = spec.nodes[i];
            const catalogEntry = NODE_CATALOG[nodeSpec.type];
            if (!catalogEntry) continue;

            const nodeId = `ai-node-${Date.now()}-${i}`;
            nodeIds.push(nodeId);

            // Calculate position in a nice cascade
            const col = i % 3;
            const row = Math.floor(i / 3);
            const position = {
                x: startX + col * spacingX,
                y: startY + row * spacingY + (col * 40), // slight diagonal
            };

            const newNode = {
                id: nodeId,
                type: 'custom' as const,
                position,
                data: {
                    label: catalogEntry.label,
                    category: catalogEntry.category,
                    icon: catalogEntry.icon,
                    nodeType: nodeSpec.type, // Add node type for contract identification
                },
            };

            addNode(newNode);

            // Animated delay between nodes
            await new Promise(r => setTimeout(r, 400));
        }

        // Add edges after all nodes are placed
        await new Promise(r => setTimeout(r, 300));

        const newEdges = spec.edges
            .filter(e => e.from >= 0 && e.from < nodeIds.length && e.to >= 0 && e.to < nodeIds.length)
            .map((e, idx) => ({
                id: `ai-edge-${Date.now()}-${idx}`,
                source: nodeIds[e.from],
                target: nodeIds[e.to],
                animated: true,
                style: { stroke: '#667eea', strokeWidth: 2 },
            }));

        useFlowStore.setState((state) => ({
            edges: [...state.edges, ...newEdges],
        }));

        setIsBuilding(false);

        // Close chat to show canvas
        handleClose();
    }, [addNode, handleClose]);

    // Strip the json-workflow block from visible text
    const stripWorkflowJSON = useCallback((content: string): string => {
        return content.replace(/```json-workflow\s*\n?[\s\S]*?\n?\s*```/g, '').trim();
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        setError(null);
        const userMessage: Message = { role: 'user', content: content.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Build messages array with system prompt
            const apiMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
            ];

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    model: 'deepseek-chat',
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 2048,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errData.error || `Error ${response.status}`);
            }

            const data = await response.json();
            const assistantContent = data.choices?.[0]?.message?.content || 'Sin respuesta del modelo.';

            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: assistantContent },
            ]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [messages, isLoading]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    }, [input, sendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    }, [input, sendMessage]);

    // Auto-resize textarea
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }, []);

    const retryLastMessage = useCallback(() => {
        if (messages.length > 0) {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
                setMessages(prev => prev.slice(0, -1));
                setError(null);
                sendMessage(lastUserMsg.content);
            }
        }
    }, [messages, sendMessage]);

    // Render inline markdown (bold, italic, inline code)
    const renderInline = (text: string, keyPrefix: string = '') => {
        const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
        return tokens.map((token, i) => {
            const key = `${keyPrefix}-${i}`;
            if (token.startsWith('**') && token.endsWith('**')) {
                return <strong key={key}>{token.slice(2, -2)}</strong>;
            }
            if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
                return <em key={key}>{token.slice(1, -1)}</em>;
            }
            if (token.startsWith('`') && token.endsWith('`')) {
                return <code key={key} className="md-inline-code">{token.slice(1, -1)}</code>;
            }
            return <span key={key}>{token}</span>;
        });
    };

    // Full markdown rendering (hides json-workflow blocks)
    const renderContent = (text: string) => {
        // Remove json-workflow block from visible content
        const visibleText = stripWorkflowJSON(text);

        const codeBlockParts = visibleText.split(/(```[\s\S]*?```)/g);
        const elements: React.ReactNode[] = [];

        codeBlockParts.forEach((segment, segIdx) => {
            if (segment.startsWith('```')) {
                const langMatch = segment.match(/^```(\w*)\n?/);
                const lang = langMatch?.[1] || '';
                const code = segment.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                elements.push(
                    <div key={`code-${segIdx}`} className="md-code-block">
                        {lang && <span className="md-code-lang">{lang}</span>}
                        <pre><code>{code}</code></pre>
                    </div>
                );
                return;
            }

            const lines = segment.split('\n');
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];
                const trimmed = line.trim();

                if (!trimmed) { i++; continue; }

                // Headers
                const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
                if (headerMatch) {
                    const level = headerMatch[1].length;
                    const content = headerMatch[2];
                    const inlineContent = renderInline(content, `h-${segIdx}-${i}`);
                    if (level === 1) {
                        elements.push(<h3 key={`h-${segIdx}-${i}`} className="md-heading">{inlineContent}</h3>);
                    } else if (level === 2) {
                        elements.push(<h4 key={`h-${segIdx}-${i}`} className="md-heading">{inlineContent}</h4>);
                    } else {
                        elements.push(<h5 key={`h-${segIdx}-${i}`} className="md-heading">{inlineContent}</h5>);
                    }
                    i++; continue;
                }

                // Unordered list
                if (/^[-*•]\s+/.test(trimmed)) {
                    const listItems: { content: string; idx: number }[] = [];
                    while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i].trim())) {
                        const itemContent = lines[i].trim().replace(/^[-*•]\s+/, '');
                        listItems.push({ content: itemContent, idx: i });
                        i++;
                    }
                    elements.push(
                        <ul key={`ul-${segIdx}-${listItems[0].idx}`} className="md-list">
                            {listItems.map(item => (
                                <li key={`li-${segIdx}-${item.idx}`}>
                                    {renderInline(item.content, `li-${segIdx}-${item.idx}`)}
                                </li>
                            ))}
                        </ul>
                    );
                    continue;
                }

                // Ordered list
                if (/^\d+[.)]\s+/.test(trimmed)) {
                    const listItems: { content: string; idx: number }[] = [];
                    while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i].trim())) {
                        const itemContent = lines[i].trim().replace(/^\d+[.)]\s+/, '');
                        listItems.push({ content: itemContent, idx: i });
                        i++;
                    }
                    elements.push(
                        <ol key={`ol-${segIdx}-${listItems[0].idx}`} className="md-list md-ol">
                            {listItems.map(item => (
                                <li key={`li-${segIdx}-${item.idx}`}>
                                    {renderInline(item.content, `li-${segIdx}-${item.idx}`)}
                                </li>
                            ))}
                        </ol>
                    );
                    continue;
                }

                // Regular paragraph
                elements.push(
                    <p key={`p-${segIdx}-${i}`} className="md-paragraph">
                        {renderInline(trimmed, `p-${segIdx}-${i}`)}
                    </p>
                );
                i++;
            }
        });

        return elements;
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
                onClick={handleToggle}
                title="Chat con IA"
                id="chatbot-toggle-btn"
            >
                <span className="toggle-icon">{isOpen ? '✕' : '🤖'}</span>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className={`chatbot-window ${isClosing ? 'closing' : ''}`} id="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="chatbot-avatar">🤖</div>
                            <div className="chatbot-header-text">
                                <h3>CREator AI Assistant</h3>
                                <span>
                                    <span className="chatbot-status-dot"></span>
                                    DeepSeek · Online
                                </span>
                            </div>
                        </div>
                        <button className="chatbot-close" onClick={handleClose} title="Cerrar chat">
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.length === 0 && !isLoading && (
                            <div className="chat-welcome">
                                <span className="welcome-icon">🚀</span>
                                <h4>¡Hola! Soy tu asistente CREator</h4>
                                <p>
                                    Pregúntame sobre Chainlink CRE, workflows, smart contracts o cualquier cosa relacionada con blockchain.
                                </p>
                                <div className="chat-suggestions">
                                    {SUGGESTIONS.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            className="suggestion-btn"
                                            onClick={() => sendMessage(suggestion)}
                                        >
                                            💬 {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => {
                            const workflowSpec = msg.role === 'assistant' ? parseWorkflowJSON(msg.content) : null;

                            return (
                                <div key={idx} className={`chat-message ${msg.role}`}>
                                    <div className="message-avatar">
                                        {msg.role === 'user' ? '👤' : '🤖'}
                                    </div>
                                    <div className="message-content">
                                        {renderContent(msg.content)}

                                        {/* Build Workflow Button */}
                                        {workflowSpec && (
                                            <button
                                                className="build-workflow-btn"
                                                onClick={() => buildWorkflowOnCanvas(workflowSpec)}
                                                disabled={isBuilding}
                                            >
                                                {isBuilding ? (
                                                    <>
                                                        <span className="build-spinner"></span>
                                                        Construyendo...
                                                    </>
                                                ) : (
                                                    <>🔨 Crear en Canvas</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="chat-message assistant">
                                <div className="message-avatar">🤖</div>
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="chat-error">
                                ❌ {error}
                                <br />
                                <button onClick={retryLastMessage}>🔄 Reintentar</button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form className="chatbot-input-area" onSubmit={handleSubmit}>
                        <div className="chatbot-input-wrapper">
                            <textarea
                                ref={inputRef}
                                className="chatbot-input"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu pregunta..."
                                rows={1}
                                disabled={isLoading}
                                id="chatbot-input"
                            />
                            <button
                                type="submit"
                                className="chatbot-send"
                                disabled={!input.trim() || isLoading}
                                title="Enviar mensaje"
                                id="chatbot-send-btn"
                            >
                                ➤
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
