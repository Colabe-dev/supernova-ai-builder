import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, MessageSquare, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Discussion {
  id: string;
  room_id: string;
  problem_statement: string;
  context: any;
  status: 'active' | 'resolved';
  consensus_solution: any;
  confidence_score: number;
  contribution_count: number;
  interaction_count: number;
  created_at: string;
  resolved_at?: string;
}

interface Contribution {
  id: string;
  discussion_id: string;
  agent_type: string;
  contribution_type: string;
  content: string;
  reasoning: string;
  confidence: number;
  votes_for: number;
  votes_against: number;
  round: number;
  created_at: string;
}

interface Interaction {
  id: string;
  discussion_id: string;
  from_agent: string;
  to_agent: string;
  interaction_type: string;
  content: string;
  created_at: string;
}

interface DiscussionDetails extends Discussion {
  contributions: Contribution[];
  interactions: Interaction[];
  consensus: any;
}

interface CollaborativeSwarmProps {
  roomId: string | null;
}

export default function CollaborativeSwarm({ roomId }: CollaborativeSwarmProps) {
  const { toast } = useToast();
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [problemStatement, setProblemStatement] = useState('');

  const effectiveRoomId = roomId || '00000000-0000-0000-0000-000000000001';

  const { data: discussions, isLoading, refetch } = useQuery<Discussion[]>({
    queryKey: [`/api/swarm/${effectiveRoomId}/discussions`],
    enabled: !!effectiveRoomId,
    refetchInterval: 10000,
  });

  const { data: discussionDetails } = useQuery<DiscussionDetails>({
    queryKey: [`/api/swarm/${effectiveRoomId}/discussions`, selectedDiscussionId],
    enabled: !!selectedDiscussionId,
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (data: { problemStatement: string }) => {
      const response = await apiRequest('POST', `/api/swarm/${effectiveRoomId}/discussions`, {
        problemStatement: data.problemStatement,
        context: {}
      });
      return response.json();
    },
    onSuccess: (newDiscussion) => {
      queryClient.invalidateQueries({ queryKey: [`/api/swarm/${effectiveRoomId}/discussions`] });
      setShowNewDiscussion(false);
      setProblemStatement('');
      setSelectedDiscussionId(newDiscussion.id);
      
      facilitateDebateMutation.mutate(newDiscussion.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create discussion',
        variant: 'destructive'
      });
    }
  });

  const facilitateDebateMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const response = await apiRequest('POST', `/api/swarm/${effectiveRoomId}/discussions/${discussionId}/debate`, {
        maxRounds: 3
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/swarm/${effectiveRoomId}/discussions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/swarm/${effectiveRoomId}/discussions`, selectedDiscussionId] });
      toast({
        title: 'Debate Complete',
        description: 'The swarm has reached a consensus',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to facilitate debate',
        variant: 'destructive'
      });
    }
  });

  const getAgentColor = (agentType: string) => {
    const colors: Record<string, string> = {
      architect: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      critic: 'bg-red-500/10 text-red-500 border-red-500/20',
      optimizer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      innovator: 'bg-green-500/10 text-green-500 border-green-500/20',
      pragmatist: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    return colors[agentType] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getInteractionIcon = (type: string) => {
    const icons: Record<string, string> = {
      agreement: '✓',
      challenge: '⚠',
      build_on: '↗',
      question: '?',
    };
    return icons[type] || '•';
  };

  if (!effectiveRoomId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        <p data-testid="text-no-room">Select a room to use collaborative swarm</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-swarm">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <Card data-testid="card-swarm-header">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Collaborative AI Swarm</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowNewDiscussion(true)}
                data-testid="button-new-discussion"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                New Discussion
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Multiple AI agents collaborate to solve complex problems through debate and consensus
            </p>
          </CardContent>
        </Card>

        {showNewDiscussion && (
          <Card data-testid="card-new-discussion">
            <CardHeader>
              <CardTitle className="text-base">Start New Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the problem you want the swarm to solve..."
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={4}
                data-testid="input-problem-statement"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => createDiscussionMutation.mutate({ problemStatement })}
                  disabled={!problemStatement.trim() || createDiscussionMutation.isPending}
                  data-testid="button-submit-discussion"
                >
                  {createDiscussionMutation.isPending ? 'Creating...' : 'Start Discussion'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewDiscussion(false);
                    setProblemStatement('');
                  }}
                  data-testid="button-cancel-discussion"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="card-discussions-list">
            <CardHeader>
              <CardTitle className="text-base">Discussions</CardTitle>
            </CardHeader>
            <CardContent>
              {!discussions || discussions.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-discussions">
                  No discussions yet. Start one to see AI agents collaborate.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {discussions.map((discussion) => (
                      <button
                        key={discussion.id}
                        onClick={() => setSelectedDiscussionId(discussion.id)}
                        className={`w-full text-left p-3 rounded-md border transition-colors hover-elevate ${
                          selectedDiscussionId === discussion.id
                            ? 'bg-muted border-primary'
                            : 'border-border'
                        }`}
                        data-testid={`button-discussion-${discussion.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">
                              {discussion.problem_statement}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className={
                                  discussion.status === 'resolved'
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-blue-500/10 text-blue-500'
                                }
                              >
                                {discussion.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {discussion.contribution_count || 0} contributions
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-discussion-details">
            <CardHeader>
              <CardTitle className="text-base">Discussion Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!discussionDetails ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-selection">
                  Select a discussion to view details
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Problem</h4>
                      <p className="text-sm text-muted-foreground">
                        {discussionDetails.problem_statement}
                      </p>
                    </div>

                    {discussionDetails.status === 'resolved' && discussionDetails.consensus_solution && (
                      <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <h4 className="text-sm font-medium text-green-500">Consensus Reached</h4>
                        </div>
                        <p className="text-sm">
                          {typeof discussionDetails.consensus_solution === 'string'
                            ? discussionDetails.consensus_solution
                            : discussionDetails.consensus_solution?.solution || 'View consensus in contributions below'}
                        </p>
                        {discussionDetails.confidence_score > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Confidence: {(discussionDetails.confidence_score * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-2">Agent Contributions</h4>
                      <div className="space-y-3">
                        {discussionDetails.contributions && discussionDetails.contributions.length > 0 ? (
                          discussionDetails.contributions.map((contribution) => (
                            <div
                              key={contribution.id}
                              className="p-3 rounded-md border"
                              data-testid={`contribution-${contribution.id}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant="outline"
                                  className={getAgentColor(contribution.agent_type)}
                                >
                                  {contribution.agent_type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {contribution.contribution_type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Round {contribution.round}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {(contribution.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm">{contribution.content}</p>
                              {contribution.reasoning && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {contribution.reasoning}
                                </p>
                              )}
                              {(contribution.votes_for > 0 || contribution.votes_against > 0) && (
                                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                                  <span>👍 {contribution.votes_for}</span>
                                  <span>👎 {contribution.votes_against}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No contributions yet</p>
                        )}
                      </div>
                    </div>

                    {discussionDetails.interactions && discussionDetails.interactions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Agent Interactions</h4>
                        <div className="space-y-2">
                          {discussionDetails.interactions.map((interaction) => (
                            <div
                              key={interaction.id}
                              className="p-2 rounded-md bg-muted/50 text-sm"
                              data-testid={`interaction-${interaction.id}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={getAgentColor(interaction.from_agent)} size="sm">
                                  {interaction.from_agent}
                                </Badge>
                                <span className="text-xs">{getInteractionIcon(interaction.interaction_type)}</span>
                                <Badge variant="outline" className={getAgentColor(interaction.to_agent)} size="sm">
                                  {interaction.to_agent}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {interaction.interaction_type}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{interaction.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {facilitateDebateMutation.isPending && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Agents are debating...</p>
                  <p className="text-xs text-muted-foreground">
                    The swarm is working toward consensus. This may take a moment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
