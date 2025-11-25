import { useEffect, useState } from 'react';
import DevConsole from '../pages/dev-console';
import DiffPage from '../pages/diff';
import Usage from '../pages/usage';
import Receipts from '../pages/Receipts';
import LPM from '../pages/LPM';
import IntentCapture from '../pages/IntentCapture';
import CollaborativeSwarm from '../pages/CollaborativeSwarm';

interface WorkspaceTabsProps {
  roomId?: string | null;
}

export default function WorkspaceTabs({ roomId }: WorkspaceTabsProps) {
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'builder';
    try {
      const saved = window.localStorage.getItem('workbench.activeTab');
      return saved || 'builder';
    } catch {
      return 'builder';
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('workbench.activeTab', tab);
    } catch {
      // ignore persistence failures
    }
  }, [tab]);

  const setTabAndPersist = (value: string) => {
    setTab(value);
  };

  const tabs = [
    { id: 'builder', label: 'Live builder' },
    { id: 'project', label: 'Dev console' },
    { id: 'diffs', label: 'Diffs' },
    { id: 'preview', label: 'Preview' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'lpm', label: 'LPM' },
    { id: 'intent', label: 'Intent' },
    { id: 'swarm', label: 'Swarm' },
    { id: 'usage', label: 'Usage' },
    { id: 'settings', label: 'Settings' },
  ];

  const scrollTabs = new Set(['receipts', 'lpm', 'intent', 'swarm', 'usage', 'settings']);

  const LiveBuilderPane = () => (
    <div className="live-builder">
      <div className="live-builder-panel">
        <div className="panel-header">Code & Commands</div>
        <DevConsole />
      </div>
      <div className="live-builder-panel preview-panel">
        <div className="panel-header">Live preview</div>
        <iframe className="full" title="Live preview" src="/" />
      </div>
    </div>
  );

  return (
    <div className="workspace-tabs">
      <div className="tabbar">
        {tabs.map(({ id, label }) => (
          <div
            key={id}
            className={'tab ' + (tab === id ? 'active' : '')}
            onClick={() => setTabAndPersist(id)}
            data-testid={`tab-${id}`}
          >
            {label}
          </div>
        ))}
      </div>
      <div className={'content ' + (scrollTabs.has(tab) ? 'scroll' : '')}>
        {tab === 'builder' && <LiveBuilderPane />}
        {tab === 'project' && <DevConsole />}
        {tab === 'diffs' && <DiffPage />}
        {tab === 'preview' && <iframe className="full" title="Preview" src="/" />}
        {tab === 'receipts' && <Receipts roomId={roomId || null} />}
        {tab === 'lpm' && <LPM roomId={roomId || null} />}
        {tab === 'intent' && <IntentCapture roomId={roomId || null} />}
        {tab === 'swarm' && <CollaborativeSwarm roomId={roomId || null} />}
        {tab === 'usage' && <Usage />}
        {tab === 'settings' && (
          <div style={{ padding: 16, display: 'grid', gap: 8 }}>
            <a className="btn" href="/supabase" data-testid="link-supabase">Supabase</a>
            <a className="btn" href="/referrals" data-testid="link-referrals">Referrals</a>
            <a className="btn" href="/pricing" data-testid="link-pricing">Pricing</a>
          </div>
        )}
      </div>
    </div>
  );
}
