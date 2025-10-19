import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { listApprovals, getApproval, approveApproval, rejectApproval } from "@/api/approvals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, GitBranch, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";

export default function ApprovalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const { toast } = useToast();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["/api/approvals"],
    queryFn: listApprovals,
  });

  const { data: selected } = useQuery({
    queryKey: ["/api/approvals", selectedId],
    queryFn: () => getApproval(selectedId!),
    enabled: !!selectedId,
  });

  const approveMutation = useMutation({
    mutationFn: approveApproval,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      toast({
        title: "Approved",
        description: data.branchName ? `Branch ${data.branchName} created` : "Approved",
      });
      setSelectedId(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => rejectApproval(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      toast({ title: "Rejected", description: "Changes rejected" });
      setSelectedId(null);
      setRejectComment("");
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", icon: Clock },
      approved: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", icon: CheckCircle },
      rejected: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30", icon: XCircle },
    }[status] || null;

    if (!config) return null;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bg} ${config.text} ${config.border}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold gradient-text mb-6" data-testid="heading-approvals">Approvals</h1>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2" data-testid="heading-approvals">Code Approvals</h1>
        <p className="text-white/60">Review and approve submitted code changes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold neon-text-cyan mb-4">Submissions ({approvals?.length || 0})</h2>
          
          {!approvals || approvals.length === 0 ? (
            <Card className="neon-card">
              <CardContent className="pt-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/60">No approvals yet</p>
                <p className="text-sm text-white/40 mt-2">Submit changes from the Diff page</p>
              </CardContent>
            </Card>
          ) : (
            approvals.map((approval) => (
              <Card
                key={approval.id}
                className={`neon-card cursor-pointer transition-all ${
                  selectedId === approval.id ? "ring-2 ring-cyan-500" : "hover:ring-1 hover:ring-cyan-500/50"
                }`}
                onClick={() => setSelectedId(approval.id)}
                data-testid={`card-approval-${approval.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {approval.snapshotIds.length} change{approval.snapshotIds.length !== 1 ? "s" : ""}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {format(new Date(approval.createdAt), "MMM d, h:mm a")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(approval.status)}
                  </div>
                  {approval.comment && (
                    <p className="text-sm text-white/70 line-clamp-2 mt-2">{approval.comment}</p>
                  )}
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="neon-card h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60">Select an approval to view details</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="neon-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="gradient-text text-2xl">Approval Details</CardTitle>
                      <CardDescription>
                        Submitted by {selected.submittedBy} on {format(new Date(selected.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(selected.status)}
                  </div>
                  
                  {selected.comment && (
                    <div className="mt-4 p-3 bg-surface/50 rounded-md border border-cyan-500/20">
                      <p className="text-sm font-medium neon-text-cyan mb-1">Comment:</p>
                      <p className="text-sm text-white/80">{selected.comment}</p>
                    </div>
                  )}

                  {selected.branchName && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <GitBranch className="w-4 h-4 neon-text-green" />
                      <span className="text-white/70">Branch:</span>
                      <code className="neon-text-green font-mono text-xs">{selected.branchName}</code>
                    </div>
                  )}

                  {selected.prUrl && (
                    <a href={selected.prUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm neon-text-cyan hover:underline">
                      <ExternalLink className="w-4 h-4" />
                      View Pull Request
                    </a>
                  )}
                </CardHeader>
              </Card>

              <Card className="neon-card">
                <CardHeader>
                  <CardTitle className="neon-text-pink">Changed Files ({selected.snapshots?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.snapshots?.map((snapshot) => (
                    <div key={snapshot.id} className="p-3 bg-surface/30 rounded-md border border-pink-500/20" data-testid={`snapshot-${snapshot.id}`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 neon-text-pink" />
                        <code className="text-sm font-mono text-white/90">{snapshot.path}</code>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {selected.status === "pending" && (
                <Card className="neon-card">
                  <CardHeader>
                    <CardTitle className="neon-text-yellow">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => approveMutation.mutate(selected.id)}
                      disabled={approveMutation.isPending}
                      className="w-full neon-text-green font-semibold"
                      style={{ background: "rgba(0, 255, 136, 0.1)", border: "2px solid var(--color-neon-green)" }}
                      data-testid="button-approve"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveMutation.isPending ? "Approving..." : "Approve & Create Branch"}
                    </Button>

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Rejection reason (optional)"
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        className="bg-surface/50 border-pink-500/30"
                        data-testid="input-reject-comment"
                      />
                      <Button
                        variant="outline"
                        onClick={() => rejectMutation.mutate({ id: selected.id, comment: rejectComment || undefined })}
                        disabled={rejectMutation.isPending}
                        className="w-full neon-text-pink"
                        style={{ borderColor: "var(--color-neon-pink)" }}
                        data-testid="button-reject"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {rejectMutation.isPending ? "Rejecting..." : "Reject Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
