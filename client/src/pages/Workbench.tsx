import { useRef, useState } from 'react';
import '../styles/workbench.css';
import ChatEmbedded from '../components/ChatEmbedded';
import WorkspaceTabs from '../components/WorkspaceTabs';
import { RoomsSidebar } from '../components/RoomsSidebar';

export default function Workbench() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatPct, setChatPct] = useState(35);
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

  return (
    <div 
      className="workbench workbench-with-rooms" 
      onMouseMove={onMove} 
      onMouseUp={onUp} 
      onMouseLeave={onUp}
      data-testid="workbench-container"
    >
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
      <div className="resizer" onMouseDown={onDown} data-testid="resizer" />

      {/* Workspace Tabs Pane (fills remaining space) */}
      <div className="pane" style={{ flex: 1 }} data-testid="pane-workspace">
        <WorkspaceTabs roomId={selectedRoomId} />
      </div>
    </div>
  );
}
