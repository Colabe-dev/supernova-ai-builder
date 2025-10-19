import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { nanoid } from '../util/nanoid';
import { orchestrate } from '../orchestrator/index';

export function initChatWS(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ noServer: true });
  
  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/api/chat/ws')) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    const sessionId = nanoid();
    
    const send = (msg: any) => {
      try {
        ws.send(JSON.stringify(msg));
      } catch (e) {
        // Connection closed, ignore
      }
    };

    send({
      type: 'system',
      sessionId,
      message: 'Connected. Ask me anything about your app. Toggle autonomy in the UI to auto-apply changes.',
    });

    ws.on('message', async (data: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return; // Invalid JSON
      }
      await orchestrate({ msg, sessionId, send });
    });

    ws.on('error', (error) => {
      console.error('[chat ws] error:', error);
    });
  });
}
