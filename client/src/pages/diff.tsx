import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { GitCompare, Clock } from "lucide-react";
import { format } from "date-fns";
import { DiffSubmitBar } from "@/components/DiffSubmitBar";

type DiffItem = {
  id: string;
  title: string;
  diff: string;
  timestamp: number;
};

export default function DiffPage() {
  const [items, setItems] = useState<DiffItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleSubmitSuccess = () => {
    setSelectedIds([]);
    toast({
      title: "Success",
      description: "Check the Approvals page to review your submission",
    });
  };

  useEffect(() => {
    loadDiffs();
  }, []);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <GitCompare className="h-8 w-8 neon-text-cyan" />
            Code Diffs
          </h1>
          <p className="text-white/60">
            View all file changes recorded from the dev console
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button
              onClick={toggleSelectAll}
              variant="outline"
              className="neon-text-pink"
              style={{ borderColor: "var(--color-neon-pink)" }}
              data-testid="button-select-all"
            >
              {selectedIds.length === items.length ? "Deselect All" : "Select All"}
            </Button>
          )}
          <Button onClick={loadDiffs} variant="outline" data-testid="button-refresh-diffs">
            Refresh
          </Button>
        </div>
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
                className={`neon-card transition-all ${
                  selectedIds.includes(item.id) ? "ring-2 ring-cyan-500" : ""
                }`}
                data-testid={`diff-item-${item.id}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleSelection(item.id)}
                        data-testid={`checkbox-${item.id}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-2 neon-text-pink">{fileName}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Clock className="h-3 w-3" />
                        {item.timestamp && !isNaN(item.timestamp)
                          ? format(new Date(item.timestamp), "PPp")
                          : "Unknown time"}
                        <Badge className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {item.id}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      data-testid={`button-toggle-${item.id}`}
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </Button>
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
      
      <DiffSubmitBar selectedIds={selectedIds} onSubmitSuccess={handleSubmitSuccess} />
    </div>
  );
}
