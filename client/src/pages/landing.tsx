import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, CheckCircle, Code2, Smartphone, Rocket } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  const features = [
    {
      icon: Brain,
      title: "AI Planner",
      description: "Intelligent project planning with automated architecture decisions",
    },
    {
      icon: Code2,
      title: "Code Generator",
      description: "Production-ready code generation for web and mobile apps",
    },
    {
      icon: Zap,
      title: "Auto Testing",
      description: "Automated testing and quality assurance with AI-powered insights",
    },
    {
      icon: CheckCircle,
      title: "Smart Approvals",
      description: "Review and approve AI-generated changes with visual diffs",
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Supernova</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container px-6 py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-6">
              <Badge className="text-xs" data-testid="badge-version">
                v1.0 Beta
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                Build Apps with
                <span className="text-primary block mt-2">AI-Powered Agents</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Supernova accelerates development with intelligent agents that plan,
                implement, test, and fix your code. Focus on ideas while AI handles
                the heavy lifting.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2" data-testid="button-create-project">
                    <Rocket className="h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
                <Button variant="outline" size="lg" data-testid="button-view-templates">
                  View Templates
                </Button>
              </div>
              <div className="flex flex-wrap gap-8 pt-4 text-sm">
                <div data-testid="stat-projects">
                  <div className="text-2xl font-bold">1000+</div>
                  <div className="text-muted-foreground">Projects Built</div>
                </div>
                <div data-testid="stat-developers">
                  <div className="text-2xl font-bold">500+</div>
                  <div className="text-muted-foreground">Developers</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl blur-3xl" />
              <Card className="relative border-card-border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-chart-2 animate-pulse" />
                    <span className="text-muted-foreground">Agent: Planner</span>
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="text-muted-foreground">// Analyzing requirements...</div>
                    <div className="text-chart-2">✓ Project structure defined</div>
                    <div className="text-chart-2">✓ Dependencies resolved</div>
                    <div className="text-chart-2">✓ Architecture planned</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container px-6 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-semibold">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four specialized AI agents work together to build your application
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-card-border" data-testid={`card-feature-${index}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
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
            <h2 className="text-3xl font-semibold">Start with Templates</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Production-ready templates for web and mobile applications
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {templates.map((template, index) => (
              <Card key={index} className="border-card-border hover-elevate" data-testid={`card-template-${index}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {template.type === "Web" ? <Code2 className="h-3 w-3 mr-1" /> : <Smartphone className="h-3 w-3 mr-1" />}
                        {template.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.stack.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
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
          <Card className="border-card-border bg-gradient-to-r from-primary/10 to-transparent">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl font-semibold">Ready to Build?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start your first project and experience the power of AI-assisted development
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="gap-2" data-testid="button-cta">
                  <Sparkles className="h-4 w-4" />
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container px-6 text-center text-sm text-muted-foreground">
          © 2025 Supernova. AI-powered application builder.
        </div>
      </footer>
    </div>
  );
}
