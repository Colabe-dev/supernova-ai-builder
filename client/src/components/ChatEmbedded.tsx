import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const WS_PATH = import.meta?.env?.VITE_WS_PATH || '/api/chat/ws';

function wsUrl(path = WS_PATH) {
  const u = new URL(path, window.location.origin);
  u.protocol = u.protocol.replace('http', 'ws');
  return u.toString();
}

interface Message {
  type: string;
  text?: string;
  stdout?: string;
  stderr?: string;
  diff?: string;
  path?: string;
}

interface ChatEmbeddedProps {
  roomId: string | null;
}

export default function ChatEmbedded({ roomId }: ChatEmbeddedProps) {
  const [log, setLog] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [autonomy, setAutonomy] = useState(false);
  const [llm, setLlm] = useState(true);
  const [model, setModel] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Load room messages when roomId changes
  const { data: messagesData } = useQuery({
    queryKey: ['/api/rooms', roomId, 'messages'],
    enabled: !!roomId,
  });

  // Load messages from room when data arrives
  useEffect(() => {
    if (messagesData?.messages) {
      const loadedMessages = messagesData.messages.map((m: any) => ({
        type: m.role === 'user' ? 'user' : m.type,
        text: m.text,
        ...((m.payload || {}) as any),
      }));
      setLog(loadedMessages);
    } else if (!roomId) {
      setLog([]);
    }
  }, [messagesData, roomId]);

  // Persist message to room
  const persistMessage = async (message: Message) => {
    if (!roomId) return;
    
    try {
      await apiRequest('POST', `/api/rooms/${roomId}/messages`, {
        role: message.type === 'user' ? 'user' : 'assistant',
        type: message.type,
        text: message.text || '',
        payload: {
          stdout: message.stdout,
          stderr: message.stderr,
          diff: message.diff,
          path: message.path,
        },
      });
    } catch (error) {
      console.error('Failed to persist message:', error);
    }
  };

  useEffect(() => {
    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;
    ws.addEventListener('message', (e) => {
      try {
        const m = JSON.parse(e.data);
        setLog(prev => prev.concat(m));
        persistMessage(m);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
    ws.addEventListener('open', () => {
      const statusMsg = { type: 'status', text: 'Connected' };
      setLog(prev => prev.concat(statusMsg));
    });
    ws.addEventListener('close', () => {
      const statusMsg = { type: 'status', text: 'Disconnected' };
      setLog(prev => prev.concat(statusMsg));
    });
    return () => ws.close();
  }, [roomId]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const send = () => {
    if (!text.trim()) return;
    const userMessage = { type: 'user', text };
    const payload = { type: 'user', text, autonomy, llm, model };
    
    try {
      wsRef.current?.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    
    setLog(prev => prev.concat(userMessage));
    persistMessage(userMessage);
    setText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      send();
    }
  };

  if (!roomId) {
    return (
      <div className="chat-embed">
        <div className="log" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>
          Select a room from the sidebar to start chatting. If you don't have one yet, click the + button to create your first room.
        </div>
      </div>
    );
  }

  return (
    <div className="chat-embed">
      <div className="log" ref={logRef}>
        {log.map((m, i) => (
          <div key={i} className={'msg ' + (m.type === 'user' ? 'user' : m.type === 'tool_result' ? 'tool' : '')}>
            <div style={{ opacity: .7, fontSize: 12 }}>{m.type}</div>
            {m.text && <div>{m.text}</div>}
            {m.stdout && <pre style={{ whiteSpace: 'pre-wrap' }}>{m.stdout}</pre>}
            {m.stderr && <pre style={{ whiteSpace: 'pre-wrap', color: '#ffb3b3' }}>{m.stderr}</pre>}
            {m.diff && <pre style={{ whiteSpace: 'pre-wrap' }}>{m.diff}</pre>}
            {m.path && <div style={{ opacity: .8 }}>file: <code>{m.path}</code></div>}
          </div>
        ))}
      </div>
      <div className="composer">
        <div className="row">
          <label>
            <input 
              type="checkbox" 
              checked={autonomy} 
              onChange={e => setAutonomy(e.target.checked)} 
              data-testid="checkbox-autonomy"
            /> Autonomy
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={llm} 
              onChange={e => setLlm(e.target.checked)} 
              data-testid="checkbox-llm"
            /> LLM Planner v2
          </label>
          <input 
            className="input" 
            placeholder="Model (optional, e.g. gpt-4o-mini)" 
            value={model} 
            onChange={e => setModel(e.target.value)} 
            data-testid="input-model"
          />
        </div>
        <textarea 
          className="input" 
          placeholder="Describe what you want..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyDown={handleKeyPress}
          data-testid="input-chat"
        />
        <div className="row">
          <button className="btn" onClick={send} data-testid="button-send">Send</button>
          <div style={{ opacity: .7, fontSize: 12 }}>Tip: Cmd/Ctrl+Enter to send</div>
        </div>
      </div>
    </div>
  );
}
