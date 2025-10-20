import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Eye, Play } from 'lucide-react';

interface Receipt {
  id: string;
  room_id: string;
  kind: 'plan' | 'edit' | 'command' | 'test' | 'fix';
  status: 'planned' | 'applied' | 'ok' | 'fail' | 'skipped';
  path?: string;
  diff?: string;
  input?: any;
  output?: any;
  created_at: string;
}

interface ReceiptsProps {
  roomId: string | null;
}

export default function Receipts({ roomId }: ReceiptsProps) {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Fetch receipts list
  const { data: receiptsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/receipts', roomId],
    enabled: !!roomId,
    refetchInterval: 5000, // Auto-refresh every 5s
  });

  // Fetch selected receipt details
  const { data: receiptDetails } = useQuery({
    queryKey: ['/api/receipts', selectedReceiptId],
    enabled: !!selectedReceiptId,
  });

  // Rerun mutation
  const rerunMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      return apiRequest('POST', `/api/receipts/${receiptId}/rerun`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts', roomId] });
    },
  });

  const receipts: Receipt[] = receiptsData?.receipts || [];
  const selectedReceipt: Receipt | undefined = receiptDetails;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'applied':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'fail':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'planned':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'skipped':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getKindIcon = (kind: string) => {
    return kind[0].toUpperCase() + kind.slice(1);
  };

  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        <p data-testid="text-no-room">Select a room to view receipts</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-receipts">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Receipts Table */}
        <Card data-testid="card-receipts-list">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-lg">Swarm Receipts</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {receipts.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-receipts">
                No receipts yet. Run some AI actions to see them here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow
                      key={receipt.id}
                      className={selectedReceiptId === receipt.id ? 'bg-muted/50' : ''}
                      data-testid={`row-receipt-${receipt.id}`}
                    >
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-kind-${receipt.kind}`}>
                          {getKindIcon(receipt.kind)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(receipt.status)}
                          data-testid={`badge-status-${receipt.status}`}
                        >
                          {receipt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`text-path-${receipt.id}`}>
                        {receipt.path || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(receipt.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedReceiptId(receipt.id)}
                            data-testid={`button-view-${receipt.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => rerunMutation.mutate(receipt.id)}
                            disabled={rerunMutation.isPending}
                            data-testid={`button-rerun-${receipt.id}`}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Receipt Details */}
        {selectedReceipt && (
          <Card data-testid="card-receipt-details">
            <CardHeader>
              <CardTitle className="text-lg">Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Kind:</span> {selectedReceipt.kind}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedReceipt.status}
                </div>
                {selectedReceipt.path && (
                  <div className="col-span-2">
                    <span className="font-medium">Path:</span>{' '}
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedReceipt.path}
                    </code>
                  </div>
                )}
              </div>

              {selectedReceipt.diff && (
                <div>
                  <div className="font-medium mb-2">Diff:</div>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                    <code>{selectedReceipt.diff}</code>
                  </pre>
                </div>
              )}

              {selectedReceipt.input && (
                <div>
                  <div className="font-medium mb-2">Input:</div>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                    <code>{JSON.stringify(selectedReceipt.input, null, 2)}</code>
                  </pre>
                </div>
              )}

              {selectedReceipt.output && (
                <div>
                  <div className="font-medium mb-2">Output:</div>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                    <code>{JSON.stringify(selectedReceipt.output, null, 2)}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
