import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  RefreshCw, 
  Wrench, 
  Bug,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SelfHealingProps {
  roomId?: string | null;
}

export default function SelfHealing({ roomId: propRoomId }: SelfHealingProps) {
  // Use provided roomId or default to a test UUID for standalone access
  const roomId = propRoomId || '00000000-0000-0000-0000-000000000001';
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  
  // Debug session form state
  const [triggerAction, setTriggerAction] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');

  // Fetch healing actions
  const { data: actionsData, isLoading: actionsLoading, refetch: refetchActions } = useQuery({
    queryKey: [`/api/healing/${roomId}/actions`],
    enabled: !!roomId,
  });

  // Fetch debug sessions
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: [`/api/healing/${roomId}/debug/sessions`],
    enabled: !!roomId,
  });

  // Fetch recent intent captures for healing trigger
  const { data: capturesData } = useQuery({
    queryKey: [`/api/intent/${roomId}/captures`],
    enabled: !!roomId,
  });

  // Initiate healing mutation
  const healMutation = useMutation({
    mutationFn: async (intentId: string) => {
      const res = await apiRequest('POST', `/api/healing/${roomId}/heal/${intentId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchActions();
      setSelectedIntent('');
    },
  });

  // Start debug session mutation
  const startDebugMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/healing/${roomId}/debug/sessions`, {
        trigger_action: triggerAction,
        user_intent: userIntent,
        expected_behavior: JSON.parse(expectedBehavior || '{}'),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchSessions();
      setTriggerAction('');
      setUserIntent('');
      setExpectedBehavior('');
    },
  });

  const healingActions = (actionsData as any)?.healing_actions || [];
  const debugSessions = (sessionsData as any)?.sessions || [];
  const captures = (capturesData as any)?.captures || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      executing: 'default',
      completed: 'default',
      failed: 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'executing':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6" data-testid="page-self-healing">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Self-Healing Engine & Intent Debugger</h1>
          <p className="text-muted-foreground mt-1">
            Automatic break prevention and intent-behavior discrepancy detection
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            refetchActions();
            refetchSessions();
          }}
          data-testid="button-refresh-all"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="healing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="healing" data-testid="tab-healing">
            <Shield className="w-4 h-4 mr-2" />
            Self-Healing
          </TabsTrigger>
          <TabsTrigger value="debugging" data-testid="tab-debugging">
            <Bug className="w-4 h-4 mr-2" />
            Intent Debugger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="healing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Initiate Healing</CardTitle>
              <CardDescription>
                Trigger self-healing for high-risk intent captures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Intent to Heal</label>
                <select
                  value={selectedIntent}
                  onChange={(e) => setSelectedIntent(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="select-intent"
                >
                  <option value="">Select an intent capture...</option>
                  {captures.map((capture: any) => (
                    <option key={capture.id} value={capture.id}>
                      {capture.user_action} (Confidence: {Math.round(capture.confidence_score * 100)}%)
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => selectedIntent && healMutation.mutate(selectedIntent)}
                disabled={!selectedIntent || healMutation.isPending}
                data-testid="button-initiate-healing"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {healMutation.isPending ? 'Healing...' : 'Initiate Healing'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Healing Actions</CardTitle>
              <CardDescription>
                Recent self-healing actions and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : healingActions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No healing actions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {healingActions.map((action: any) => (
                    <div
                      key={action.id}
                      className="border rounded-lg p-4 space-y-2"
                      data-testid={`healing-action-${action.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedAction(
                                expandedAction === action.id ? null : action.id
                              )
                            }
                            data-testid={`button-expand-action-${action.id}`}
                          >
                            {expandedAction === action.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                          {getStatusIcon(action.status)}
                          <div>
                            <div className="font-medium">{action.description}</div>
                            <div className="text-sm text-muted-foreground">
                              Type: {action.action_type}
                            </div>
                          </div>
                        </div>
                        <Badge variant={getStatusBadge(action.status)}>
                          {action.status}
                        </Badge>
                      </div>
                      
                      {expandedAction === action.id && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="text-sm">
                            <strong>Created:</strong>{' '}
                            {new Date(action.created_at).toLocaleString()}
                          </div>
                          {action.completed_at && (
                            <div className="text-sm">
                              <strong>Completed:</strong>{' '}
                              {new Date(action.completed_at).toLocaleString()}
                            </div>
                          )}
                          <div className="text-sm">
                            <strong>Execution Plan:</strong>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(action.execution_plan, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debugging" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Start Debug Session</CardTitle>
              <CardDescription>
                Create a new intent debugging session to track discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Trigger Action</label>
                <Input
                  value={triggerAction}
                  onChange={(e) => setTriggerAction(e.target.value)}
                  placeholder="e.g., Update user profile"
                  data-testid="input-trigger-action"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">User Intent</label>
                <Input
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="e.g., Save profile changes"
                  data-testid="input-user-intent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Behavior (JSON)</label>
                <Textarea
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder='{"outcome": {"status": "success"}, "execution_path": ["validate", "save", "confirm"]}'
                  rows={4}
                  data-testid="textarea-expected-behavior"
                />
              </div>
              <Button
                onClick={() => startDebugMutation.mutate()}
                disabled={
                  !triggerAction ||
                  !userIntent ||
                  !expectedBehavior ||
                  startDebugMutation.isPending
                }
                data-testid="button-start-debug"
              >
                <Bug className="w-4 h-4 mr-2" />
                {startDebugMutation.isPending ? 'Starting...' : 'Start Debug Session'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug Sessions</CardTitle>
              <CardDescription>
                Recent intent debugging sessions and discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : debugSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No debug sessions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {debugSessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="border rounded-lg p-4 space-y-2"
                      data-testid={`debug-session-${session.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedSession(
                                expandedSession === session.id ? null : session.id
                              )
                            }
                            data-testid={`button-expand-session-${session.id}`}
                          >
                            {expandedSession === session.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                          <div>
                            <div className="font-medium">{session.trigger_action}</div>
                            <div className="text-sm text-muted-foreground">
                              Intent: {session.user_intent}
                            </div>
                          </div>
                        </div>
                        {session.resolved_at ? (
                          <Badge variant="default">Resolved</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </div>

                      {expandedSession === session.id && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <div className="text-sm">
                            <strong>Created:</strong>{' '}
                            {new Date(session.created_at).toLocaleString()}
                          </div>
                          
                          {session.discrepancies && session.discrepancies.length > 0 && (
                            <div className="space-y-2">
                              <strong className="text-sm">Discrepancies:</strong>
                              {session.discrepancies.map((disc: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm"
                                >
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                    <div>
                                      <div className="font-medium">{disc.type}</div>
                                      {disc.differences &&
                                        disc.differences.map((diff: string, i: number) => (
                                          <div key={i} className="text-xs mt-1">
                                            {diff}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {session.fixes_applied && session.fixes_applied.length > 0 && (
                            <div className="space-y-2">
                              <strong className="text-sm">Fixes Applied:</strong>
                              {session.fixes_applied.map((fix: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm"
                                >
                                  <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                    <div>
                                      <div className="font-medium">{fix.type}</div>
                                      <div className="text-xs mt-1">{fix.description}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
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
