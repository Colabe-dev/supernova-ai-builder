import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  FileCode2, 
  Folder, 
  Play, 
  Save, 
  Terminal as TerminalIcon, 
  Eye,
  Palette
} from "lucide-react";

type FileEntry = {
  name: string;
  dir: boolean;
  size: number;
};

export default function DevConsole() {
  const [currentDir, setCurrentDir] = useState("client/src");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState("client/src/App.tsx");
  const [fileContent, setFileContent] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  async function listDirectory(dirPath: string) {
    try {
      const response = await fetch(`/api/dev/fs?path=${encodeURIComponent(dirPath)}`);
      const data = await response.json();
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      
      setCurrentDir(data.path);
      setEntries(data.entries ?? []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to list directory",
        variant: "destructive",
      });
    }
  }

  async function openFile(filePath: string) {
    try {
      const response = await fetch(`/api/dev/fs?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      
      if (data.content !== undefined) {
        setSelectedPath(data.path);
        setFileContent(data.content);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive",
      });
    }
  }

  async function saveFile() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/dev/fs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedPath, content: fileContent }),
      });
      const data = await response.json();
      
      if (!data.ok) {
        toast({
          title: "Error",
          description: data.error || "Save failed",
          variant: "destructive",
        });
      } else {
        toast({
          title: "File saved",
          description: `Saved ${selectedPath}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function runCommand(cmd: string) {
    try {
      const response = await fetch(`/api/dev/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd }),
      });
      const data = await response.json();
      setTerminalOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setTerminalOutput("Failed to run command");
    }
  }

  // SSE for preview refresh with heartbeat and reconnect
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource("/api/dev/preview/stream");
      
      eventSource.onmessage = () => {
        iframeRef.current?.contentWindow?.location.reload();
      };

      eventSource.addEventListener("ping", () => {
        // Heartbeat received, connection alive
      });

      eventSource.onerror = () => {
        eventSource?.close();
        // Reconnect after 2 seconds
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 2000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // Load initial directory
  useEffect(() => {
    listDirectory("client/src");
  }, []);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div>
        <h1 className="text-3xl font-bold">Dev Console</h1>
        <p className="text-muted-foreground">Edit files, run commands, and customize design tokens</p>
      </div>

      <div className="grid grid-cols-[280px_1fr_420px] gap-6 flex-1 min-h-0">
        {/* File Tree */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Files
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full px-4 pb-4">
              <div className="text-xs text-muted-foreground mb-2">{currentDir}</div>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <button
                    key={entry.name}
                    onClick={() =>
                      entry.dir
                        ? listDirectory(`${currentDir}/${entry.name}`)
                        : openFile(`${currentDir}/${entry.name}`)
                    }
                    className="w-full text-left px-2 py-1.5 rounded text-sm hover-elevate active-elevate-2 flex items-center gap-2"
                    data-testid={`file-${entry.name}`}
                  >
                    {entry.dir ? (
                      <Folder className="h-4 w-4 text-primary" />
                    ) : (
                      <FileCode2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{entry.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm truncate" title={selectedPath}>
                  {selectedPath}
                </CardTitle>
                <Button
                  size="sm"
                  onClick={saveFile}
                  disabled={isSaving}
                  data-testid="button-save-file"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="h-full font-mono text-sm resize-none border-0 focus-visible:ring-0 rounded-none"
                placeholder="Select a file to edit..."
                data-testid="textarea-editor"
              />
            </CardContent>
          </Card>

          <DesignMode />
        </div>

        {/* Preview & Terminal */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <iframe
                ref={iframeRef}
                src="/"
                className="w-full h-[300px] bg-background border rounded"
                title="Preview"
              />
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TerminalIcon className="h-4 w-4" />
                Terminal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runCommand("node -v")}
                  data-testid="button-run-node"
                >
                  <Play className="h-3 w-3 mr-1" />
                  node -v
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runCommand("npm -v")}
                >
                  <Play className="h-3 w-3 mr-1" />
                  npm -v
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">{terminalOutput}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DesignMode() {
  const [tokens, setTokens] = useState<any>({
    theme: {
      primary: "#a855f7",
      background: "#0f0f0f",
      text: "#ffffff",
      accent: "#ec4899",
    },
  });
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/design/tokens")
      .then((r) => r.json())
      .then(setTokens);
  }, []);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--token-primary", tokens?.theme?.primary);
    root.setProperty("--token-bg", tokens?.theme?.background);
    root.setProperty("--token-text", tokens?.theme?.text);
    root.setProperty("--token-accent", tokens?.theme?.accent);
  }, [tokens]);

  const saveTokens = async () => {
    try {
      await fetch("/api/design/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens),
      });
      toast({
        title: "Tokens saved",
        description: "Design tokens updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save tokens",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Design Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {["primary", "background", "text", "accent"].map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs capitalize">{key}</Label>
              <Input
                type="color"
                value={tokens.theme[key]}
                onChange={(e) =>
                  setTokens({
                    ...tokens,
                    theme: { ...tokens.theme, [key]: e.target.value },
                  })
                }
                className="h-8"
                data-testid={`input-token-${key}`}
              />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={saveTokens} className="w-full" data-testid="button-save-tokens">
          Save Tokens
        </Button>
        <Separator />
        <div
          className="p-3 rounded-lg space-y-2"
          style={{
            background: "var(--token-bg)",
            color: "var(--token-text)",
          }}
        >
          <div className="text-xs font-semibold">Preview</div>
          <Button
            size="sm"
            style={{
              background: "var(--token-primary)",
              color: "#000",
            }}
          >
            Primary Button
          </Button>
          <Button
            size="sm"
            variant="outline"
            style={{
              borderColor: "var(--token-accent)",
              color: "var(--token-accent)",
            }}
          >
            Accent Button
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
