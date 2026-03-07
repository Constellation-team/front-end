import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBolt, FaPalette, FaLink, FaFlask, FaCubes, FaNetworkWired, FaCodeBranch, FaShieldAlt, FaPlay, FaChevronRight, FaRobot } from 'react-icons/fa';
import './LandingPage.css';

export default function LandingPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Node connection animation (n8n/Node-RED inspired)
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'];

        // Mouse position tracking
        const mouse = {
            x: 0,
            y: 0,
            radius: 120, // Interaction radius
            isActive: false
        };

        // Define nodes for background
        const nodes: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            width: number;
            height: number;
            baseColor: string;
            activeColor: string;
            color: string;
            targetScale: number;
            currentScale: number;
            connections: number[];
            id: number;
        }> = [];

        // Reduce node count for larger blocks
        const numNodes = Math.floor(window.innerWidth / 200);

        for (let i = 0; i < numNodes; i++) {
            const baseC = colors[Math.floor(Math.random() * colors.length)];
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                width: 40 + Math.random() * 20,
                height: 25 + Math.random() * 15,
                baseColor: '#1e2028',
                activeColor: baseC,
                color: '#1e2028',
                targetScale: 1,
                currentScale: 1,
                connections: [],
                id: i,
            });
        }

        // Establish static connections
        nodes.forEach((node, i) => {
            const numConnections = Math.floor(Math.random() * 2) + 1;
            for (let c = 0; c < numConnections; c++) {
                // Connect to nearest neighbors conceptually
                const targetId = Math.floor(Math.random() * numNodes);
                if (targetId !== i && !node.connections.includes(targetId)) {
                    node.connections.push(targetId);
                }
            }
        });

        // Data packets flowing between nodes
        const packets: Array<{
            sourceId: number;
            targetId: number;
            progress: number;
            speed: number;
            color: string;
        }> = [];

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.isActive = true;
        };

        const handleMouseLeave = () => {
            mouse.isActive = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update node positions and interactions
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x <= 0 || node.x >= canvas.width) node.vx *= -1;
                if (node.y <= 0 || node.y >= canvas.height) node.vy *= -1;

                // Mouse Interaction Logic
                let isHovered = false;
                if (mouse.isActive) {
                    const dx = mouse.x - node.x;
                    const dy = mouse.y - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.radius) {
                        isHovered = true;
                        // Push slightly away from cursor slowly
                        const force = (mouse.radius - distance) / mouse.radius;
                        node.x -= (dx / distance) * force * 1.5;
                        node.y -= (dy / distance) * force * 1.5;
                    }
                }

                if (isHovered) {
                    node.targetScale = 1.3;
                    node.color = node.activeColor;
                } else {
                    node.targetScale = 1;
                    node.color = node.baseColor;
                }

                // Smooth scale transition
                node.currentScale += (node.targetScale - node.currentScale) * 0.1;
            });

            // Randomly create new data packets
            if (Math.random() < 0.05 && packets.length < 15) {
                const source = nodes[Math.floor(Math.random() * nodes.length)];
                if (source.connections.length > 0) {
                    const targetId = source.connections[Math.floor(Math.random() * source.connections.length)];
                    packets.push({
                        sourceId: source.id,
                        targetId: targetId,
                        progress: 0,
                        speed: 0.005 + Math.random() * 0.01,
                        color: source.activeColor
                    });
                }
            }

            // Draw connections (edges)
            ctx.lineWidth = 1.5;
            nodes.forEach(node => {
                node.connections.forEach(targetId => {
                    const target = nodes[targetId];
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);

                    // Stepped path for "circuit" look instead of pure bezier
                    const midX = (node.x + target.x) / 2;
                    ctx.lineTo(midX, node.y);
                    ctx.lineTo(midX, target.y);
                    ctx.lineTo(target.x, target.y);

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';

                    // Highlight connection if either node is active
                    if (node.currentScale > 1.1 || target.currentScale > 1.1) {
                        ctx.strokeStyle = node.activeColor + '40'; // Add transparency
                        ctx.lineWidth = 2;
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = node.activeColor;
                    } else {
                        ctx.lineWidth = 1;
                        ctx.shadowBlur = 0;
                    }

                    ctx.stroke();
                    ctx.shadowBlur = 0; // reset
                });
            });

            // Draw data packets
            for (let i = packets.length - 1; i >= 0; i--) {
                const packet = packets[i];
                packet.progress += packet.speed;

                if (packet.progress >= 1) {
                    packets.splice(i, 1);
                    continue;
                }

                const source = nodes[packet.sourceId];
                const target = nodes[packet.targetId];

                // Calculate position along stepped path
                const t = packet.progress;
                let x, y;
                const midX = (source.x + target.x) / 2;

                if (t < 0.33) {
                    // Segment 1: source to midX
                    const segT = t / 0.33;
                    x = source.x + (midX - source.x) * segT;
                    y = source.y;
                } else if (t < 0.66) {
                    // Segment 2: midX, source.y to midX, target.y
                    const segT = (t - 0.33) / 0.33;
                    x = midX;
                    y = source.y + (target.y - source.y) * segT;
                } else {
                    // Segment 3: midX to target
                    const segT = (t - 0.66) / 0.34;
                    x = midX + (target.x - midX) * segT;
                    y = target.y;
                }

                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = packet.color;
                ctx.fill();
                ctx.shadowBlur = 10;
                ctx.shadowColor = packet.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Draw nodes (blocks)
            nodes.forEach(node => {
                const w = node.width * node.currentScale;
                const h = node.height * node.currentScale;
                const rx = node.x - w / 2;
                const ry = node.y - h / 2;

                // Draw Block Body
                ctx.beginPath();
                ctx.roundRect(rx, ry, w, h, 6);
                ctx.fillStyle = node.color;

                if (node.currentScale > 1.05) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = node.activeColor;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fill();

                // Draw Block Border
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = node.currentScale > 1.05 ? '#ffffff' : '#363945';
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Draw input/output handles (little dots on sides)
                ctx.beginPath();
                ctx.arc(rx, node.y, 3 * node.currentScale, 0, Math.PI * 2); // Left Handle
                ctx.fillStyle = '#363945';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(rx + w, node.y, 3 * node.currentScale, 0, Math.PI * 2); // Right Handle
                ctx.fillStyle = node.activeColor;
                ctx.fill();
            });

            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div className="landing-page">
            {/* Background Canvas */}
            <canvas ref={canvasRef} className="particles-canvas"></canvas>

            {/* Navigation */}
            <nav className="navbar">
                <div className="nav-container">
                    <div className="logo">
                        <FaNetworkWired className="logo-icon" />
                        <span className="logo-text">CRE</span>
                        <span className="logo-accent">ator</span>
                    </div>
                    <div className="nav-links">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="https://github.com/Constellation-team/front-end/blob/main/documentation/WORKFLOW_TESTING.md" target="_blank" rel="noopener noreferrer">Docs</a>
                        <button className="btn-primary" onClick={() => navigate('/builder')}>Launch Builder</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="grid-overlay"></div>

                <div className="hero-content">
                    <div className="hero-badge">
                        <FaBolt className="badge-icon" />
                        Powered by Chainlink CRE
                    </div>

                    <h1 className="hero-title">
                        Workflow Automation
                        <br />
                        <span className="gradient-text">for Web3</span>
                    </h1>

                    <p className="hero-subtitle">
                        Create, orchestrate, and deploy Chainlink Runtime Environment workflows visually.
                        <br />
                        Professional node-based architecture, zero code required.
                    </p>

                    <div className="hero-cta">
                        <button className="btn-hero" onClick={() => navigate('/builder')}>
                            Open FlowBuilder
                            <FaChevronRight className="btn-arrow" />
                        </button>
                        <button className="btn-secondary">
                            <FaPlay className="play-icon" />
                            Watch Demo
                        </button>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <div className="stat-number">100%</div>
                            <div className="stat-label">Visual Logic</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">20+</div>
                            <div className="stat-label">Node Types</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">1-Click</div>
                            <div className="stat-label">Deployments</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features">
                <div className="section-header">
                    <h2 className="section-title">Enterprise-Grade Automation</h2>
                    <p className="section-subtitle">
                        A familiar IDE-like environment for Chainlink developers
                    </p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon" style={{ color: '#6366f1' }}><FaNetworkWired size={36} /></div>
                        <h3>Visual Flow Builder</h3>
                        <p>Intuitive canvas with structured nodes, typed connections, and real-time validation.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon" style={{ color: '#3b82f6' }}><FaLink size={36} /></div>
                        <h3>Chainlink Native</h3>
                        <p>First-class support for Data Streams, Functions, CCIP, and Oracles embedded as nodes.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon" style={{ color: '#10b981' }}><FaCubes size={36} /></div>
                        <h3>Instant Export</h3>
                        <p>Download a complete <code>@chainlink/cre-sdk</code> project — TypeScript, workflow.yaml, and config — as a ZIP file ready to deploy with the CRE CLI.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon" style={{ color: '#f59e0b' }}><FaFlask size={36} /></div>
                        <h3>CRE Simulation</h3>
                        <p>Click Prove to run the simulation engine and see authentic CRE CLI output — <code>[SIMULATION]</code> and <code>[USER LOG]</code> markers — no CLI installation or authentication required.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon" style={{ color: '#ec4899' }}><FaRobot size={36} /></div>
                        <h3>AI Workflow Assistant</h3>
                        <p>Describe your workflow in plain English. The AI builds the canvas automatically — nodes placed, edges wired, ready to simulate.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon" style={{ color: '#8b5cf6' }}><FaShieldAlt size={36} /></div>
                        <h3>Secure by Default</h3>
                        <p>Built-in static analysis prevents insecure node connections and warns of vulnerabilities.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="how-it-works">
                <div className="section-header">
                    <h2 className="section-title">Workflow Execution</h2>
                </div>

                <div className="steps-container">
                    <div className="technical-step">
                        <div className="step-node">
                            <div className="step-icon"><FaCodeBranch size={24} /></div>
                            <div className="step-number">01</div>
                        </div>
                        <div className="step-content">
                            <h3>Connect Nodes</h3>
                            <p>Map triggers (time/webhook) to logic and Chainlink services using standard bezier handles.</p>
                        </div>
                    </div>

                    <div className="step-connector"></div>

                    <div className="technical-step">
                        <div className="step-node">
                            <div className="step-icon"><FaPalette size={24} /></div>
                            <div className="step-number">02</div>
                        </div>
                        <div className="step-content">
                            <h3>Configure Params</h3>
                            <p>Inject specific ABIs, endpoint URLs, and contract addresses into the node property panels.</p>
                        </div>
                    </div>

                    <div className="step-connector"></div>

                    <div className="technical-step">
                        <div className="step-node">
                            <div className="step-icon"><FaBolt size={24} /></div>
                            <div className="step-number">03</div>
                        </div>
                        <div className="step-content">
                            <h3>Simulate & Export</h3>
                            <p>Run the CRE simulation engine to validate your workflow, then download a deployable <code>@chainlink/cre-sdk</code> project in one click.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Start Automating</h2>
                    <p className="cta-subtitle">
                        Build your first Chainlink workflow in minutes
                    </p>
                    <button className="btn-hero" onClick={() => navigate('/builder')}>
                        Launch FlowBuilder
                        <FaChevronRight className="btn-arrow" />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-left">
                        <div className="logo">
                            <FaNetworkWired className="logo-icon" size={16} />
                            <span className="logo-text">CRE</span>
                            <span className="logo-accent">ator</span>
                        </div>
                        <p>Built for Chainlink Convergence Hackathon 2026</p>
                    </div>
                    <div className="footer-links">
                        <a href="https://github.com/Constellation-team/front-end/blob/main/documentation/WORKFLOW_TESTING.md" target="_blank" rel="noopener noreferrer">Documentation</a>
                        <a href="https://github.com/Constellation-team" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="https://github.com/Franci-343" target="_blank" rel="noopener noreferrer">Franci-343</a>
                        <a href="https://github.com/JHAMILCALI" target="_blank" rel="noopener noreferrer">JHAMILCALI</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
