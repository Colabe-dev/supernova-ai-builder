import { useEffect } from 'react';
import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';

export function SharedHeader() {
  useEffect(() => {
    // Set brand gradient CSS variables to match header colors
    const root = document.documentElement;
    root.style.setProperty('--brand-1', '#7c3aed'); // Purple
    root.style.setProperty('--brand-2', '#22d3ee'); // Cyan
  }, []);

  return (
    <header 
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-black/30" 
      style={{ borderBottom: '1px solid rgba(124, 58, 237, 0.2)' }}
    >
      <div className="container flex h-14 items-center justify-between px-6">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ 
                background: 'linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)',
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold gradient-text-soft">
              Supernova
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/dashboard">
              <span className="text-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                Dashboard
              </span>
            </Link>
            <Link href="/templates">
              <span className="text-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                Templates
              </span>
            </Link>
            <Link href="/supabase">
              <span className="text-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                Supabase
              </span>
            </Link>
            <Link href="/referrals">
              <span className="text-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                Referrals
              </span>
            </Link>
          </nav>
          
          <ThemeToggle />
          
          <Link href="/dashboard">
            <Button 
              size="sm" 
              data-testid="button-header-get-started"
              style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
                borderColor: 'rgba(124, 58, 237, 0.4)',
              }}
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
