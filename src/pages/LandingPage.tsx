import { useEffect, useRef } from 'react';
import './LandingPage.css';

export default function LandingPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Floating particles animation (Antigravity-inspired)
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Mouse position tracking
        const mouse = {
            x: 0,
            y: 0,
            radius: 150, // Attraction radius
        };

        // Color palette for particles
        const colors = [
            'rgba(102, 126, 234, ', // Purple
            'rgba(118, 75, 162, ',  // Deep Purple
            'rgba(240, 147, 251, ', // Pink
            'rgba(79, 172, 254, ',  // Blue
            'rgba(0, 242, 254, ',   // Cyan
        ];

        const particles: Array<{
            x: number;
            y: number;
            baseX: number;
            baseY: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            color: string;
        }> = [];

        // Create particles (increased from 50 to 100)
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const colorBase = colors[Math.floor(Math.random() * colors.length)];
            particles.push({
                x,
                y,
                baseX: x,
                baseY: y,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                color: colorBase,
            });
        }

        // Mouse move handler
        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((particle) => {
                // Calculate distance from mouse
                const dx = mouse.x - particle.x;
                const dy = mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Attraction effect when mouse is near
                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    particle.x += Math.cos(angle) * force * 3;
                    particle.y += Math.sin(angle) * force * 3;
                } else {
                    // Return to base position slowly
                    particle.x += (particle.baseX - particle.x) * 0.05;
                    particle.y += (particle.baseY - particle.y) * 0.05;
                }

                // Normal movement
                particle.baseX += particle.speedX;
                particle.baseY += particle.speedY;

                // Wrap around edges for base position
                if (particle.baseX < 0) particle.baseX = canvas.width;
                if (particle.baseX > canvas.width) particle.baseX = 0;
                if (particle.baseY < 0) particle.baseY = canvas.height;
                if (particle.baseY > canvas.height) particle.baseY = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `${particle.color}${particle.opacity})`;
                ctx.fill();

                // Add glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = `${particle.color}0.5)`;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Draw connections
                particles.forEach((otherParticle) => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        // Mix colors for connections
                        const opacity = 0.2 * (1 - distance / 150);
                        ctx.strokeStyle = `${particle.color}${opacity})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                });
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
        };
    }, []);

    return (
        <div className="landing-page">
            {/* Floating Particles Canvas */}
            <canvas ref={canvasRef} className="particles-canvas"></canvas>

            {/* Navigation */}
            <nav className="navbar">
                <div className="nav-container">
                    <div className="logo">
                        <span className="logo-text">CRE</span>
                        <span className="logo-accent">ator</span>
                    </div>
                    <div className="nav-links">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#docs">Docs</a>
                        <button className="btn-primary">Launch App</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-background">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                    <div className="gradient-orb orb-3"></div>
                    <div className="grid-overlay"></div>
                </div>

                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-icon">⚡</span>
                        Powered by Chainlink CRE
                    </div>

                    <h1 className="hero-title">
                        Build Smart Contracts
                        <br />
                        <span className="gradient-text">Visually</span>
                    </h1>

                    <p className="hero-subtitle">
                        Create, orchestrate, and deploy Chainlink Runtime Environment workflows
                        <br />
                        without writing a single line of code. Like Node-RED, but for Web3.
                    </p>

                    <div className="hero-cta">
                        <button className="btn-hero">
                            Start Building
                            <span className="btn-arrow">→</span>
                        </button>
                        <button className="btn-secondary">
                            <span className="play-icon">▶</span>
                            Watch Demo
                        </button>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <div className="stat-number">100%</div>
                            <div className="stat-label">No-Code</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">10+</div>
                            <div className="stat-label">Node Types</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">∞</div>
                            <div className="stat-label">Possibilities</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features">
                <div className="section-header">
                    <h2 className="section-title">Why CREator?</h2>
                    <p className="section-subtitle">
                        The fastest way to prototype and deploy Chainlink workflows
                    </p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🎨</div>
                        <h3>Visual Flow Builder</h3>
                        <p>Drag, drop, and connect nodes to create complex workflows. No coding required.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🔗</div>
                        <h3>Chainlink Native</h3>
                        <p>Built on CRE with native support for Oracles, CCIP, Functions, and more.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3>Instant Export</h3>
                        <p>Generate production-ready CRE projects with proper structure and configuration.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🧪</div>
                        <h3>Local Simulation</h3>
                        <p>Test your workflows locally before deploying to testnet or mainnet.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📦</div>
                        <h3>Template Library</h3>
                        <p>Start from pre-built templates for DeFi, NFTs, and cross-chain apps.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🔐</div>
                        <h3>Secure by Default</h3>
                        <p>Best practices built-in. Secrets management and validation included.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="how-it-works">
                <div className="section-header">
                    <h2 className="section-title">How It Works</h2>
                </div>

                <div className="steps">
                    <div className="step">
                        <div className="step-number">01</div>
                        <div className="step-content">
                            <h3>Design Your Flow</h3>
                            <p>Use the visual canvas to connect triggers, oracles, and smart contracts.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">02</div>
                        <div className="step-content">
                            <h3>Configure Nodes</h3>
                            <p>Set parameters, API endpoints, and contract addresses through intuitive forms.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-number">03</div>
                        <div className="step-content">
                            <h3>Test & Export</h3>
                            <p>Simulate locally, then export a complete CRE project ready to deploy.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Ready to Create?</h2>
                    <p className="cta-subtitle">
                        Join the future of smart contract development
                    </p>
                    <button className="btn-hero">
                        Launch CREator
                        <span className="btn-arrow">→</span>
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-left">
                        <div className="logo">
                            <span className="logo-text">CRE</span>
                            <span className="logo-accent">ator</span>
                        </div>
                        <p>Built for Chainlink Convergence Hackathon 2026</p>
                    </div>
                    <div className="footer-links">
                        <a href="#docs">Documentation</a>
                        <a href="#github">GitHub</a>
                        <a href="#twitter">Twitter</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
