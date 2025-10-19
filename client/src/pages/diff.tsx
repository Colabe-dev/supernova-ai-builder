import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { GitCompare, Clock, Send } from "lucide-react";
import { format } from "date-fns";

type DiffItem = {
  id: string;
  title: string;
  diff: string;
  timestamp: number;
};

export default function DiffPage() {
  const [items, setItems] = useState<DiffItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  async function loadDiffs() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/diff/list");
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load diffs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function submitForApproval(diffId: string) {
    toast({
      title: "Coming soon",
      description: "Submit to approvals workflow will be integrated in the next update",
    });
  }

  useEffect(() => {
    loadDiffs();
  }, []);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GitCompare className="h-8 w-8 text-primary" />
            Code Diffs
          </h1>
          <p className="text-muted-foreground">
            View all file changes recorded from the dev console
          </p>
        </div>
        <Button onClick={loadDiffs} variant="outline" data-testid="button-refresh-diffs">
          Refresh
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading diffs...
              </CardContent>
            </Card>
          )}

          {!isLoading && items.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No diffs yet</h3>
                <p className="text-sm text-muted-foreground">
                  Edit and save files in the dev console to create diffs
                </p>
              </CardContent>
            </Card>
          )}

          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const lines = item.diff.split("\n");
            const fileName = lines[0]?.replace("--- a/", "") || "Unknown file";

            return (
              <Card
                key={item.id}
                className="hover-elevate"
                data-testid={`diff-item-${item.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-2">{fileName}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.timestamp), "PPp")}
                        <Badge variant="outline" className="text-xs">
                          {item.id}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitForApproval(item.id)}
                        data-testid={`button-submit-${item.id}`}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Submit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        data-testid={`button-toggle-${item.id}`}
                      >
                        {isExpanded ? "Collapse" : "Expand"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {lines.map((line, idx) => {
                          let className = "";
                          if (line.startsWith("+++") || line.startsWith("---")) {
                            className = "text-muted-foreground font-semibold";
                          } else if (line.startsWith("+")) {
                            className = "text-green-500 bg-green-500/10";
                          } else if (line.startsWith("-")) {
                            className = "text-red-500 bg-red-500/10";
                          }

                          return (
                            <div key={idx} className={className}>
                              {line}
                            </div>
                          );
                        })}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
