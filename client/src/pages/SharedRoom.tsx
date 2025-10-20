import { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import '../styles/workbench.css';

interface RoomData {
  id: string;
  name: string;
  created_at: string;
}

interface Message {
  role: string;
  type: string;
  text?: string;
  payload?: {
    text?: string;
    stdout?: string;
    stderr?: string;
    diff?: string;
  };
  ts: string;
}

interface State {
  loading: boolean;
  error: string;
  room: RoomData | null;
  messages: Message[];
}

export default function SharedRoom() {
  const params = useParams();
  const token = params.token;
  const [state, setState] = useState<State>({
    loading: true,
    error: '',
    room: null,
    messages: []
  });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/rooms/share/' + encodeURIComponent(token || '') + '/messages');
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'error');
        setState({ loading: false, error: '', room: j.room, messages: j.messages });
      } catch (e: any) {
        setState({ loading: false, error: String(e.message || e), room: null, messages: [] });
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.messages]);

  if (state.loading) {
    return (
      <div className="p-4">
        <div className="text-muted-foreground">Loading shared room...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-4">
        <div className="text-destructive">Error: {state.error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Shared Room — {state.room?.name}</h2>
      <div className="chat-embed" style={{ height: '70vh' }}>
        <div className="log" ref={logRef}>
          {state.messages.map((m, i) => (
            <div
              key={i}
              className={'msg ' + (m.role === 'user' ? 'user' : m.type === 'tool_result' ? 'tool' : '')}
            >
              <div className="text-xs opacity-70 mb-1">
                {m.role || m.type} · {new Date(m.ts).toLocaleString()}
              </div>
              {m.text && <div>{m.text}</div>}
              {m.payload?.stdout && (
                <pre className="whitespace-pre-wrap font-mono text-sm">{m.payload.stdout}</pre>
              )}
              {m.payload?.stderr && (
                <pre className="whitespace-pre-wrap font-mono text-sm text-destructive">
                  {m.payload.stderr}
                </pre>
              )}
              {m.payload?.diff && (
                <pre className="whitespace-pre-wrap font-mono text-sm">{m.payload.diff}</pre>
              )}
            </div>
          ))}
        </div>
        <div className="composer">
          <div className="text-muted-foreground text-sm">Read-only shared view</div>
        </div>
      </div>
    </div>
  );
}
