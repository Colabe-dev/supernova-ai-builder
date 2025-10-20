import { useEffect } from 'react';
import '../styles/theme.css';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  useEffect(() => {
    // Sync design tokens to CSS variables
    fetch('/api/design/tokens')
      .then(r => r.json())
      .then(tokens => {
        const theme = tokens?.theme || {};
        const root = document.documentElement;
        
        // Map to the actual CSS variables used by the theme system
        if (theme.bg) root.style.setProperty('--color-bg', theme.bg);
        if (theme.text) root.style.setProperty('--color-text', theme.text);
        if (theme.primary) root.style.setProperty('--color-primary', theme.primary);
        
        // Brand gradient colors will be set by SharedHeader component
      })
      .catch(err => {
        console.warn('Could not load design tokens:', err);
      });
  }, []);

  return <div className="app-shell w-full h-full">{children}</div>;
}
