import type { DiffApproval } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export interface SubmitApprovalRequest {
  diffIds: string[];
  comment?: string;
}

export interface ApprovalWithSnapshots extends DiffApproval {
  snapshots: Array<{
    id: string;
    diffId: string;
    path: string;
    previousContent: string | null;
    newContent: string;
    timestamp: Date;
  }>;
}

export async function submitApproval(data: SubmitApprovalRequest): Promise<DiffApproval> {
  const response = await apiRequest("POST", "/api/approvals/submit", data);
  return response.json();
}

export async function listApprovals(): Promise<DiffApproval[]> {
  const response = await fetch("/api/approvals");
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getApproval(id: string): Promise<ApprovalWithSnapshots | null> {
  const response = await fetch(`/api/approvals/${id}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function approveApproval(id: string): Promise<DiffApproval> {
  const response = await apiRequest("POST", `/api/approvals/${id}/approve`);
  return response.json();
}

export async function rejectApproval(id: string, comment?: string): Promise<DiffApproval> {
  const response = await apiRequest("POST", `/api/approvals/${id}/reject`, { comment });
  return response.json();
}
