import { useEffect, useRef, useState } from 'react';
import '../styles/workbench.css';
import ChatEmbedded from '../components/ChatEmbedded';
import WorkspaceTabs from '../components/WorkspaceTabs';
import { RoomsSidebar } from '../components/RoomsSidebar';

export default function Workbench() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatPct, setChatPct] = useState(() => {
    if (typeof window === 'undefined') return 35;
    try {
      const saved = window.localStorage.getItem('workbench.chatPct');
      if (!saved) return 35;
      const value = Number(saved);
      return Number.isFinite(value) ? value : 35;
    } catch {
      return 35;
    }
  });
  const dragging = useRef(false);

  const onDown = (e: React.MouseEvent) => {
    dragging.current = true;
    e.preventDefault();
  };

  const onMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Calculate percentage based on position after the fixed sidebar (240px)
    const chatStart = 240;
    const remainingWidth = rect.width - chatStart;
    const chatX = x - chatStart;
    const pct = Math.max(20, Math.min(70, (chatX / remainingWidth) * 100));
    setChatPct(pct);
  };

  const onUp = () => {
    dragging.current = false;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('workbench.chatPct', chatPct.toString());
    } catch {
      // ignore persistence failures (private mode etc.)
    }
  }, [chatPct]);

  const adjustPct = (pct: number) => {
    setChatPct(Math.max(20, Math.min(70, pct)));
  };

  const handleKeyResize = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      adjustPct(chatPct - 5);
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      adjustPct(chatPct + 5);
      e.preventDefault();
    }
    if (e.key === 'Home') {
      adjustPct(25);
      e.preventDefault();
    }
    if (e.key === 'End') {
      adjustPct(60);
      e.preventDefault();
    }
  };

  const roomLabel = selectedRoomId
    ? `Room ${selectedRoomId.slice(0, 6)}…`
    : 'No room selected';

  return (
    <div
      className="workbench workbench-with-rooms"
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      data-testid="workbench-container"
    >
      <div className="workbench-toolbar">
        <div className="toolbar-meta">
          <div className="chip" aria-live="polite">{roomLabel}</div>
          <div className="chip">Chat width: {Math.round(chatPct)}%</div>
          <div className="chip subtle">Drag or use ←/→ to resize</div>
        </div>
        <div className="toolbar-actions" aria-label="Layout quick actions">
          <button className="btn ghost" onClick={() => adjustPct(25)} data-testid="layout-focus-workspace">
            Focus workspace
          </button>
          <button className="btn ghost" onClick={() => adjustPct(50)} data-testid="layout-balanced">
            Balanced
          </button>
          <button className="btn ghost" onClick={() => adjustPct(60)} data-testid="layout-focus-chat">
            Focus chat
          </button>
          <button className="btn" onClick={() => adjustPct(35)} data-testid="layout-reset">
            Reset layout
          </button>
        </div>
      </div>
      <div className="workbench-body">
        {/* Rooms Sidebar (fixed width) */}
        <div className="rooms-sidebar" data-testid="pane-rooms">
          <RoomsSidebar
            selectedRoomId={selectedRoomId}
            onRoomSelect={setSelectedRoomId}
          />
        </div>

        {/* Chat Pane (resizable) */}
        <div className="pane" style={{ flex: `0 0 ${chatPct}%` }} data-testid="pane-chat">
          <ChatEmbedded roomId={selectedRoomId} />
        </div>

        {/* Resizer */}
        <div
          className="resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat and workspace panes"
          tabIndex={0}
          onMouseDown={onDown}
          onDoubleClick={() => adjustPct(35)}
          onKeyDown={handleKeyResize}
          data-testid="resizer"
        />

        {/* Workspace Tabs Pane (fills remaining space) */}
        <div className="pane" style={{ flex: 1 }} data-testid="pane-workspace">
          <WorkspaceTabs roomId={selectedRoomId} />
        </div>
      </div>
    </div>
  );
}
