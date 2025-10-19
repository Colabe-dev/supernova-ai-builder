import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { submitApproval } from "@/api/approvals";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, X } from "lucide-react";

interface DiffSubmitBarProps {
  selectedIds: string[];
  onSubmitSuccess?: () => void;
}

export function DiffSubmitBar({ selectedIds, onSubmitSuccess }: DiffSubmitBarProps) {
  const [comment, setComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: submitApproval,
    onSuccess: () => {
      toast({
        title: "Submitted for approval",
        description: `${selectedIds.length} changes submitted successfully`,
      });
      setComment("");
      setIsExpanded(false);
      onSubmitSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit for approval",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast({
        title: "No changes selected",
        description: "Please select at least one change to submit",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      diffIds: selectedIds,
      comment: comment.trim() || undefined,
    });
  };

  if (selectedIds.length === 0 && !isExpanded) {
    return null;
  }

  return (
    <Card 
      className="neon-card fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl"
      data-testid="diff-submit-bar"
    >
      <div className="p-4">
        {!isExpanded ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20">
                <span className="neon-text-cyan font-bold text-sm" data-testid="text-selected-count">
                  {selectedIds.length}
                </span>
              </div>
              <span className="text-sm text-white/80">
                {selectedIds.length} change{selectedIds.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(true)}
                className="neon-text-cyan"
                style={{ borderColor: "var(--color-neon-cyan)" }}
                data-testid="button-submit-for-approval"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="neon-text-cyan font-semibold">Submit for Approval</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6"
                data-testid="button-close-submit"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Add a comment (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-20 bg-surface/50 border-cyan-500/30"
              data-testid="input-approval-comment"
            />

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">
                {selectedIds.length} change{selectedIds.length !== 1 ? "s" : ""} will be submitted
              </span>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExpanded(false)}
                  data-testid="button-cancel-submit"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="neon-text-cyan font-semibold"
                  style={{ 
                    background: "rgba(0, 255, 255, 0.1)", 
                    border: "2px solid var(--color-neon-cyan)" 
                  }}
                  data-testid="button-confirm-submit"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
