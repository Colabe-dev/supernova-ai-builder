import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, CheckCircle, Code2, Smartphone, Rocket, Sparkles, X, Check } from "lucide-react";
import { SharedHeader } from "@/components/shared-header";

export default function Landing() {
  const features = [
    {
      icon: Brain,
      title: "AI Planner",
      description: "Intelligent project planning with automated architecture decisions",
      color: "neon-text-cyan",
    },
    {
      icon: Code2,
      title: "Code Generator",
      description: "Production-ready code generation for web and mobile apps",
      color: "neon-text-pink",
    },
    {
      icon: Zap,
      title: "Auto Testing",
      description: "Automated testing and quality assurance with AI-powered insights",
      color: "neon-text-yellow",
    },
    {
      icon: CheckCircle,
      title: "Smart Approvals",
      description: "Review and approve AI-generated changes with visual diffs",
      color: "neon-text-green",
    },
  ];

  const templates = [
    {
      name: "Next.js 14",
      type: "Web",
      stack: ["React", "TypeScript", "Tailwind"],
    },
    {
      name: "Expo SDK 51",
      type: "Mobile",
      stack: ["React Native", "TypeScript"],
    },
  ];

  return (
    <div className="min-h-screen">
      <SharedHeader />

      <main>
        <section className="container px-6 py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-6">
              <Badge className="text-xs neon-text-yellow" data-testid="badge-version" style={{ background: 'rgba(255, 255, 0, 0.1)', border: '1px solid rgba(255, 255, 0, 0.3)' }}>
                v1.0 Beta
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                <span className="hero-title-gradient" style={{ fontSize: '1.1em' }}>
                  Your AI Agent Swarm
                </span>
              </h1>
              <p className="text-lg leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                Supernova doesn't just assist—it autonomously builds. Our patented agent swarm technology coordinates multiple specialized AIs that work in concert, handling the complete development lifecycle from concept to production.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2 neon-text-cyan font-semibold" data-testid="button-launch-swarm" style={{ background: 'rgba(0, 255, 255, 0.1)', border: '2px solid var(--color-neon-cyan)' }}>
                    <Rocket className="h-4 w-4" />
                    Launch Your Swarm
                  </Button>
                </Link>
                <Link href="/workbench">
                  <Button size="lg" data-testid="button-watch-swarm" className="neon-text-pink font-semibold" style={{ background: 'rgba(255, 0, 255, 0.1)', border: '2px solid var(--color-neon-pink)' }}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Watch the Swarm in Action
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-8 pt-4 text-sm">
                <div data-testid="stat-projects">
                  <div className="text-2xl font-bold neon-text-cyan">1000+</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Projects Built</div>
                </div>
                <div data-testid="stat-developers">
                  <div className="text-2xl font-bold neon-text-pink">500+</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Developers</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,255,255,0.2) 0%, rgba(255,0,255,0.1) 50%, transparent 70%)' }} />
              <Card className="relative neon-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full neon-text-green animate-pulse" style={{ background: 'currentColor' }} />
                    <span className="neon-text-green font-semibold">Agent: Planner</span>
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>// Analyzing requirements...</div>
                    <div className="neon-text-green">✓ Project structure defined</div>
                    <div className="neon-text-green">✓ Dependencies resolved</div>
                    <div className="neon-text-green">✓ Architecture planned</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container px-6 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-semibold gradient-text">How It Works</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }} className="max-w-2xl mx-auto">
              Four specialized AI agents work together to build your application
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="neon-card" data-testid={`card-feature-${index}`}>
                <CardContent className="p-6 space-y-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`} style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-2 ${feature.color}`}>{feature.title}</h3>
                    <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container px-6 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-semibold gradient-text" data-testid="comparison-heading">Why Supernova's Swarm Beats Everything Else</h2>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="neon-card" style={{ background: 'rgba(255, 0, 0, 0.05)', borderColor: 'rgba(255, 0, 0, 0.3)' }} data-testid="card-single-ai">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'rgba(255, 0, 0, 0.2)' }}>
                      <X className="h-5 w-5" style={{ color: 'rgba(255, 100, 100, 0.9)' }} />
                    </div>
                    <h3 className="text-xl font-semibold" style={{ color: 'rgba(255, 100, 100, 0.9)' }}>Single AI Tools</h3>
                  </div>
                  <div className="space-y-6">
                    <div data-testid="comparison-single-1">
                      <h4 className="font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Lone Worker</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>One AI trying to do everything</p>
                    </div>
                    <div data-testid="comparison-single-2">
                      <h4 className="font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Fragmented Output</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Inconsistent quality and patterns</p>
                    </div>
                    <div data-testid="comparison-single-3">
                      <h4 className="font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Rigid Solutions</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Limited to predefined patterns</p>
                    </div>
                    <div data-testid="comparison-single-4">
                      <h4 className="font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Single Point of Failure</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>One AI, one perspective</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="neon-card" style={{ background: 'rgba(0, 255, 0, 0.05)', borderColor: 'rgba(0, 255, 0, 0.3)' }} data-testid="card-agent-swarm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'rgba(0, 255, 0, 0.2)' }}>
                      <Check className="h-5 w-5 neon-text-green" />
                    </div>
                    <h3 className="text-xl font-semibold neon-text-green">Agent Swarm</h3>
                  </div>
                  <div className="space-y-6">
                    <div data-testid="comparison-swarm-1">
                      <h4 className="font-semibold mb-2 neon-text-cyan">Swarm Mind</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Multiple specialists collaborating</p>
                    </div>
                    <div data-testid="comparison-swarm-2">
                      <h4 className="font-semibold mb-2 neon-text-pink">Harmonized Code</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Uniform quality across entire project</p>
                    </div>
                    <div data-testid="comparison-swarm-3">
                      <h4 className="font-semibold mb-2 neon-text-yellow">Matrix Architecture</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Dynamically adapts to your needs</p>
                    </div>
                    <div data-testid="comparison-swarm-4">
                      <h4 className="font-semibold mb-2 neon-text-green">Cross-Validation</h4>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Multiple agents verify every decision</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container px-6 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-semibold gradient-text">Start with Templates</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }} className="max-w-2xl mx-auto">
              Production-ready templates for web and mobile applications
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {templates.map((template, index) => (
              <Card key={index} className="neon-card" data-testid={`card-template-${index}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1 neon-text-cyan">{template.name}</h3>
                      <Badge className="text-xs neon-text-pink" style={{ background: 'rgba(255, 0, 255, 0.1)', border: '1px solid rgba(255, 0, 255, 0.3)' }}>
                        {template.type === "Web" ? <Code2 className="h-3 w-3 mr-1" /> : <Smartphone className="h-3 w-3 mr-1" />}
                        {template.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.stack.map((tech) => (
                      <Badge key={tech} className="text-xs" style={{ background: 'rgba(0, 255, 255, 0.1)', border: '1px solid rgba(0, 255, 255, 0.2)', color: 'rgba(0, 255, 255, 0.9)' }}>
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container px-6 py-16">
          <Card className="neon-card" style={{ background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15) 0%, rgba(18,18,24,0.8) 70%)' }}>
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl font-semibold gradient-text neon-pulse">Ready to Build?</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }} className="max-w-2xl mx-auto">
                Start your first project and experience the power of AI-assisted development
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 neon-text-yellow font-semibold" data-testid="button-cta" style={{ background: 'rgba(255, 255, 0, 0.1)', border: '2px solid var(--color-neon-yellow)' }}>
                  <Sparkles className="h-4 w-4" />
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(0, 255, 255, 0.2)' }} className="py-16">
        <div className="container px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-semibold mb-4 neon-text-cyan" data-testid="footer-heading-platform">Platform</h3>
              <ul className="space-y-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <li data-testid="footer-item-react">React</li>
                <li data-testid="footer-item-typescript">TypeScript</li>
                <li data-testid="footer-item-tailwind">Tailwind</li>
                <li data-testid="footer-item-nodejs">Node.js</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 neon-text-pink" data-testid="footer-heading-technology">Technology</h3>
              <ul className="space-y-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <li data-testid="footer-item-swarm">Agent Swarm</li>
                <li data-testid="footer-item-architect">Architect Matrix™</li>
                <li data-testid="footer-item-harmony">Harmony Engine</li>
                <li data-testid="footer-item-resolver">Live Resolver</li>
                <li data-testid="footer-item-guardian">Guardian System</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 neon-text-yellow" data-testid="footer-heading-resources">Resources</h3>
              <ul className="space-y-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <li data-testid="footer-item-docs">Documentation</li>
                <li data-testid="footer-item-api">API Reference</li>
                <li data-testid="footer-item-academy">Swarm Academy</li>
                <li data-testid="footer-item-forum">Community Forum</li>
                <li data-testid="footer-item-enterprise">Enterprise</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 space-y-4 text-center text-sm" style={{ borderColor: 'rgba(0, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.5)' }}>
            <p data-testid="footer-company">
              Project of <span className="neon-text-cyan">Colabe Solutions Limited</span> under <span className="neon-text-pink">Colabe Creative Studio</span>. Part of <span className="neon-text-yellow">Colabe Ecosystem</span>. All rights reserved.
            </p>
            <p data-testid="footer-copyright">
              © 2025 <span className="gradient-text font-semibold">Supernova</span>. The only platform with coordinated AI agent swarm technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
