import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  type: string;
  agent?: string;
  message?: string;
  text?: string;
  sessionId?: string;
  choices?: Array<{ id: string; label: string }>;
  id?: string;
  path?: string;
  diff?: string;
  patchId?: string;
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  steps?: string[];
  stage?: string;
}

export default function Chat() {
  const [log, setLog] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [autonomy, setAutonomy] = useState(false);
  const [llm, setLlm] = useState(true); // Enable LLM v2 by default
  const [model, setModel] = useState(''); // Optional model override
  const wsRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const wsUrl = `${protocol}://${host}/api/chat/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (e) => {
      try {
        const msg: ChatMessage = JSON.parse(e.data);
        setLog((l) => [...l, msg]);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const send = (msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const ask = () => {
    if (!text.trim()) return;
    send({ type: 'user', text, autonomy, llm, model: model.trim() });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      ask();
    }
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-title">
          AI Chat Builder
        </h1>
        <p className="text-muted-foreground">
          Live chat with swarm orchestrator. Ask me to build features, fix errors, or explain code.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Log */}
        <Card className="lg:col-span-2 p-4 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {log.map((m, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg bg-muted/50"
                  data-testid={`chat-message-${i}`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    {m.agent && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {m.agent}
                      </Badge>
                    )}
                    {m.type && !m.agent && (
                      <Badge variant="secondary" className="text-xs">
                        {m.type}
                      </Badge>
                    )}
                    {m.stage && (
                      <Badge variant="default" className="text-xs">
                        {m.stage}
                      </Badge>
                    )}
                  </div>

                  {/* Message content */}
                  {m.message && <p className="text-sm">{m.message}</p>}
                  {m.text && <p className="text-sm">{m.text}</p>}

                  {/* Multiple choice questions */}
                  {m.choices && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Choose an option:</p>
                      <div className="flex flex-wrap gap-2">
                        {m.choices.map((c) => (
                          <Button
                            key={c.id}
                            size="sm"
                            variant="outline"
                            onClick={() => send({ type: 'choice', id: c.id })}
                            data-testid={`button-choice-${c.id}`}
                          >
                            {c.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diff preview */}
                  {m.diff && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium hover:text-primary">
                        📝 Patch: {m.path}
                      </summary>
                      <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto">
                        {m.diff}
                      </pre>
                      {m.patchId && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() =>
                            send({ type: 'approve_patch', patchId: m.patchId })
                          }
                          data-testid={`button-apply-patch-${m.patchId}`}
                        >
                          Apply Patch
                        </Button>
                      )}
                    </details>
                  )}

                  {/* Terminal output */}
                  {(m.stdout || m.stderr) && (
                    <div className="mt-3 space-y-2">
                      {m.stdout && (
                        <details>
                          <summary className="cursor-pointer text-sm font-medium hover:text-primary">
                            📤 stdout
                          </summary>
                          <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto max-h-60">
                            {m.stdout}
                          </pre>
                        </details>
                      )}
                      {m.stderr && (
                        <details>
                          <summary className="cursor-pointer text-sm font-medium hover:text-primary text-destructive">
                            ❌ stderr
                          </summary>
                          <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto max-h-60">
                            {m.stderr}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Error explanation steps */}
                  {m.steps && m.steps.length > 0 && (
                    <ol className="mt-3 list-decimal list-inside space-y-1">
                      {m.steps.map((s, idx) => (
                        <li key={idx} className="text-sm">
                          {s}
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* Status indicator */}
                  {m.ok !== undefined && (
                    <div className="mt-2">
                      <Badge variant={m.ok ? 'default' : 'destructive'}>
                        {m.ok ? '✓ Success' : '✗ Failed'}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        </Card>

        {/* Input Panel */}
        <Card className="p-4 flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autonomy"
                checked={autonomy}
                onCheckedChange={(checked) => setAutonomy(checked === true)}
                data-testid="checkbox-autonomy"
              />
              <Label htmlFor="autonomy" className="text-sm">
                Auto-apply safe patches (autonomy mode)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="llm"
                checked={llm}
                onCheckedChange={(checked) => setLlm(checked === true)}
                data-testid="checkbox-llm"
              />
              <Label htmlFor="llm" className="text-sm">
                Use LLM Planner v2 (AI-powered planning)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm">
                Model (optional)
              </Label>
              <input
                id="model"
                type="text"
                placeholder="gpt-4o-mini, gpt-4o, etc."
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="input-model"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default from server config
              </p>
            </div>

            <div>
              <Label htmlFor="prompt" className="text-sm font-medium mb-2 block">
                What would you like to build?
              </Label>
              <Textarea
                id="prompt"
                rows={8}
                placeholder="Describe what you want... Try: 'Create a landing page and build the app'"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none"
                data-testid="textarea-prompt"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Press Cmd/Ctrl + Enter to send
              </p>
            </div>

            <Button onClick={ask} className="w-full" data-testid="button-send">
              Send Message
            </Button>
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-xs font-medium">💡 {llm ? 'LLM Planner v2' : 'Heuristic Planner'}</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {llm ? (
                <>
                  <p>• "Create a pricing page with checkout"</p>
                  <p>• "Build a dashboard with charts"</p>
                  <p>• "Add authentication to my app"</p>
                  <p>• "Fix TypeScript errors and rebuild"</p>
                </>
              ) : (
                <>
                  <p>• "Create a landing page"</p>
                  <p>• "Make the theme dark"</p>
                  <p>• "Add a custom button component"</p>
                  <p>• "Build and test the app"</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
