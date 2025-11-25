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
    if (typeof window === 'undefined') return 'project';
    try {
      const saved = window.localStorage.getItem('workbench.activeTab');
      return saved || 'project';
    } catch {
      return 'project';
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

  return (
    <div className="workspace-tabs">
      <div className="tabbar">
        {['project', 'diffs', 'preview', 'receipts', 'lpm', 'intent', 'swarm', 'usage', 'settings'].map(t => (
          <div
            key={t}
            className={'tab ' + (tab === t ? 'active' : '')}
            onClick={() => setTabAndPersist(t)}
            data-testid={`tab-${t}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>
      <div className={'content ' + (tab === 'receipts' || tab === 'lpm' || tab === 'intent' || tab === 'swarm' || tab === 'usage' || tab === 'settings' ? 'scroll' : '')}>
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
