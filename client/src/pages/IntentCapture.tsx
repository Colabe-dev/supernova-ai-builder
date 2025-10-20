import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  RefreshCw, 
  Target, 
  Network, 
  Zap,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface IntentCaptureProps {
  roomId: string | null;
}

export default function IntentCapture({ roomId }: IntentCaptureProps) {
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('file');
  const [targetId, setTargetId] = useState('');
  const [changeType, setChangeType] = useState('modification');

  // Fetch recent captures
  const { data: capturesData, isLoading: capturesLoading, refetch: refetchCaptures } = useQuery({
    queryKey: [`/api/intent/${roomId}/captures`],
    enabled: !!roomId,
  });

  // Capture user intent
  const captureIntentMutation = useMutation({
    mutationFn: async (userAction: string) => {
      const res = await apiRequest('POST', `/api/intent/${roomId}/capture`, {
        action: userAction,
        context: {},
      });
      return res.json();
    },
    onSuccess: () => {
      refetchCaptures();
      setAction('');
    },
  });

  // Analyze impact
  const analyzeImpactMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/intent/${roomId}/analyze-impact`, {
        targetType,
        targetId,
        changeType,
      });
      return res.json();
    },
  });

  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card>
          <CardHeader>
            <CardTitle>Intent Capture & Impact Analysis</CardTitle>
            <CardDescription>Select a room to access intent capture features</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const captures = (capturesData as any)?.captures || [];
  const captureResult = captureIntentMutation.data as any;
  const impactResult = (analyzeImpactMutation.data as any)?.impact;

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'destructive';
    if (severity >= 5) return 'default';
    return 'secondary';
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-500';
    if (risk >= 40) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6" data-testid="page-intent-capture">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intent Capture & Impact Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent dependency tracking and breaking change detection
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchCaptures()}
          data-testid="button-refresh-captures"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="capture" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="capture" data-testid="tab-capture">
            <Zap className="w-4 h-4 mr-2" />
            Capture
          </TabsTrigger>
          <TabsTrigger value="analyze" data-testid="tab-analyze">
            <Network className="w-4 h-4 mr-2" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History
          </TabsTrigger>
        </TabsList>

        {/* Capture Intent */}
        <TabsContent value="capture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Capture User Intent</CardTitle>
              <CardDescription>
                Describe what you're trying to do, and we'll analyze the potential impact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: Rename UserProfile component to ProfileCard"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                rows={4}
                data-testid="input-action"
              />
              <Button
                onClick={() => captureIntentMutation.mutate(action)}
                disabled={!action || captureIntentMutation.isPending}
                data-testid="button-capture"
              >
                {captureIntentMutation.isPending ? 'Analyzing...' : 'Capture & Analyze'}
              </Button>

              {captureResult?.intentCapture && captureResult?.impactAnalysis && (
                <div className="mt-6 space-y-4" data-testid="card-capture-result">
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Detected Intent</h3>
                      <Badge variant="outline">{captureResult.intentCapture.user_intent}</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Confidence: {(captureResult.intentCapture.confidence_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Overall Risk</h3>
                      <div className={`text-3xl font-bold ${getRiskColor(captureResult.impactAnalysis.overallRisk)}`}>
                        {captureResult.impactAnalysis.overallRisk}
                      </div>
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{captureResult.impactAnalysis.directImpact}</div>
                      <div className="text-sm text-muted-foreground">Direct Dependencies</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{captureResult.impactAnalysis.transitiveImpact}</div>
                      <div className="text-sm text-muted-foreground">Transitive Dependencies</div>
                    </div>
                  </div>

                  {captureResult.impactAnalysis.predictions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Predicted Issues</h3>
                      <div className="space-y-2">
                        {captureResult.impactAnalysis.predictions.map((pred: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={getSeverityColor(pred.severity)}>
                                  Severity {pred.severity}/10
                                </Badge>
                                <Badge variant="outline">{pred.prediction_type}</Badge>
                              </div>
                              <p className="text-sm">{pred.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {captureResult.impactAnalysis.suggestions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Suggestions</h3>
                      <div className="space-y-2">
                        {captureResult.impactAnalysis.suggestions.map((sugg: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{sugg.type}</Badge>
                                <Badge variant={sugg.priority === 'high' ? 'default' : 'secondary'}>
                                  {sugg.priority}
                                </Badge>
                              </div>
                              <p className="text-sm">{sugg.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyze Impact */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Impact Analysis</CardTitle>
              <CardDescription>
                Analyze the impact of changes without capturing intent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Type</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    data-testid="select-target-type"
                  >
                    <option value="file">File</option>
                    <option value="api">API Endpoint</option>
                    <option value="data_model">Data Model</option>
                    <option value="component">Component</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Change Type</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                    data-testid="select-change-type"
                  >
                    <option value="modification">Modification</option>
                    <option value="deletion">Deletion</option>
                    <option value="rename">Rename</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Target ID</label>
                <Input
                  placeholder="e.g., client/src/App.tsx or /api/users"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  data-testid="input-target-id"
                />
              </div>

              <Button
                onClick={() => analyzeImpactMutation.mutate()}
                disabled={!targetId || analyzeImpactMutation.isPending}
                data-testid="button-analyze-impact"
              >
                {analyzeImpactMutation.isPending ? 'Analyzing...' : 'Analyze Impact'}
              </Button>

              {impactResult && (
                <div className="mt-6 space-y-4" data-testid="card-impact-result">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{impactResult.direct_dependencies.length}</div>
                      <div className="text-sm text-muted-foreground">Direct Dependencies</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{impactResult.transitive_dependencies.length}</div>
                      <div className="text-sm text-muted-foreground">Transitive Dependencies</div>
                    </div>
                  </div>

                  {impactResult.breaking_changes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Breaking Changes</h3>
                      <div className="space-y-2">
                        {impactResult.breaking_changes.map((bc: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="destructive">Severity {bc.severity}/10</Badge>
                                <Badge variant="outline">{bc.change_type}</Badge>
                              </div>
                              <p className="text-sm">{bc.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {impactResult.suggestions.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Mitigation Strategies</h3>
                      <div className="space-y-2">
                        {impactResult.suggestions.map((sugg: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{sugg.type}</Badge>
                                <Badge variant={sugg.priority === 'high' ? 'default' : 'secondary'}>
                                  {sugg.priority}
                                </Badge>
                              </div>
                              <p className="text-sm">{sugg.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intent Capture History</CardTitle>
              <CardDescription>
                Review past intent captures and their predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {capturesLoading ? (
                <div>Loading history...</div>
              ) : captures.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No intent captures yet. Start by capturing user actions above.
                </div>
              ) : (
                <div className="space-y-3">
                  {captures.map((capture: any) => (
                    <div key={capture.id} className="p-4 border rounded-lg" data-testid={`capture-${capture.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {capture.user_intent}
                          </Badge>
                          <p className="font-medium">{capture.user_action}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(capture.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {capture.prediction_count > 0 && (
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{capture.prediction_count} predictions</span>
                          {capture.avg_severity && (
                            <span>Avg severity: {parseFloat(capture.avg_severity).toFixed(1)}/10</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
