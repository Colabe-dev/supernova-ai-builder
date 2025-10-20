import { useRef, useState } from 'react';
import '../styles/workbench.css';
import ChatEmbedded from '../components/ChatEmbedded';
import WorkspaceTabs from '../components/WorkspaceTabs';

export default function Workbench() {
  const [leftPct, setLeftPct] = useState(38);
  const dragging = useRef(false);

  const onDown = (e: React.MouseEvent) => {
    dragging.current = true;
    e.preventDefault();
  };

  const onMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(20, Math.min(70, (x / rect.width) * 100));
    setLeftPct(pct);
  };

  const onUp = () => {
    dragging.current = false;
  };

  return (
    <div 
      className="workbench" 
      style={{ gridTemplateColumns: `${leftPct}% 8px 1fr` }} 
      onMouseMove={onMove} 
      onMouseUp={onUp} 
      onMouseLeave={onUp}
      data-testid="workbench-container"
    >
      <div className="pane" data-testid="pane-chat">
        <ChatEmbedded />
      </div>
      <div className="resizer" onMouseDown={onDown} data-testid="resizer" />
      <div className="pane" data-testid="pane-workspace">
        <WorkspaceTabs />
      </div>
    </div>
  );
}
