import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, X, FileText, FolderOpen, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Approval } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "text-chart-3" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-chart-2" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-destructive" },
};

export default function Approvals() {
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const { data: approvals, isLoading } = useQuery<Approval[]>({
    queryKey: ["/api/approvals"],
  });

  const updateApprovalMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
      const res = await apiRequest("PATCH", `/api/approvals/${id}`, { status, comment });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setSelectedApproval(null);
      setComment("");
      toast({
        title: "Approval updated",
        description: "The approval status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update approval. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (selectedApproval) {
      updateApprovalMutation.mutate({
        id: selectedApproval.id,
        status: "approved",
        comment: comment || undefined,
      });
    }
  };

  const handleReject = () => {
    if (selectedApproval) {
      updateApprovalMutation.mutate({
        id: selectedApproval.id,
        status: "rejected",
        comment,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve AI-generated code changes
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-card-border lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : approvals && approvals.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-card-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Pending Reviews</CardTitle>
              <CardDescription>
                {approvals.filter(a => a.status === "pending").length} awaiting review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvals.map((approval) => {
                  const status = statusConfig[approval.status as keyof typeof statusConfig];
                  const StatusIcon = status.icon;
                  const files = approval.files as any[];

                  return (
                    <Card
                      key={approval.id}
                      className={`border-card-border cursor-pointer hover-elevate ${
                        selectedApproval?.id === approval.id
                          ? "border-primary ring-2 ring-primary/20"
                          : ""
                      }`}
                      onClick={() => setSelectedApproval(approval)}
                      data-testid={`card-approval-${approval.id}`}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {files.length} file{files.length !== 1 ? "s" : ""} changed
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(approval.createdAt).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedApproval ? (
            <Card className="border-card-border lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Code Changes</CardTitle>
                    <CardDescription>
                      Review the generated changes below
                    </CardDescription>
                  </div>
                  {selectedApproval.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReject}
                        disabled={updateApprovalMutation.isPending}
                        className="gap-2"
                        data-testid="button-reject"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={updateApprovalMutation.isPending}
                        className="gap-2"
                        data-testid="button-approve"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(selectedApproval.files as any[]).map((file: any, index: number) => (
                  <div key={index} className="space-y-3" data-testid={`file-${index}`}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium">{file.path}</span>
                      <Badge variant="secondary" className="text-xs">
                        {file.status}
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-card-border overflow-hidden">
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="bg-muted/30">
                          <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-card-border">
                            Before
                          </div>
                          <pre className="p-4 text-xs font-mono overflow-x-auto">
                            {file.before || "(new file)"}
                          </pre>
                        </div>
                        <div className="bg-muted/30">
                          <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-card-border">
                            After
                          </div>
                          <pre className="p-4 text-xs font-mono overflow-x-auto">
                            {file.after}
                          </pre>
                        </div>
                      </div>
                    </div>
                    {index < (selectedApproval.files as any[]).length - 1 && (
                      <Separator />
                    )}
                  </div>
                ))}

                {selectedApproval.status === "pending" && (
                  <div className="space-y-2 pt-4">
                    <label className="text-sm font-medium">
                      Comment (Optional)
                    </label>
                    <Textarea
                      placeholder="Add a comment about these changes..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      data-testid="input-comment"
                    />
                  </div>
                )}

                {selectedApproval.comment && (
                  <div className="rounded-lg bg-muted p-4 space-y-1">
                    <div className="text-sm font-medium">Comment</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedApproval.comment}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-card-border border-dashed lg:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select an approval to review changes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-card-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No approvals yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              When agents generate code changes, they'll appear here for your review
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
