import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Lightbulb, Target, FileText } from 'lucide-react';

interface LPMProps {
  roomId: string | null;
}

interface Impact {
  summary: string;
  components_affected: number;
  data_changes: number;
  api_endpoints: number;
  considerations: string[];
  estimated_effort: string;
}

interface Advice {
  stack: string;
  steps: string[];
  estimated_complexity: string;
  security_notes?: string[];
  best_practices?: string[];
  considerations?: string[];
  recommendations?: string[];
}

export default function LPM({ roomId }: LPMProps) {
  const [featureDescription, setFeatureDescription] = useState('');
  const [adviceFeature, setAdviceFeature] = useState('');

  // Fetch LPM for the room
  const { data: lpmData, isLoading: lpmLoading } = useQuery({
    queryKey: [`/api/lpm/${roomId}/lpm`],
    enabled: !!roomId,
  });

  // Fetch decision history
  const { data: decisionsData, refetch: refetchDecisions } = useQuery({
    queryKey: [`/api/lpm/${roomId}/decisions`],
    enabled: !!roomId,
  });

  // Analyze feature mutation
  const analyzeFeatureMutation = useMutation({
    mutationFn: async (description: string) => {
      return apiRequest('POST', `/api/lpm/${roomId}/analyze-feature`, {
        feature_description: description,
      });
    },
    onSuccess: () => {
      refetchDecisions();
    },
  });

  // Get architecture advice mutation
  const getAdviceMutation = useMutation({
    mutationFn: async (feature: string) => {
      return apiRequest('POST', `/api/lpm/${roomId}/advise`, {
        feature,
        context: {},
      });
    },
    onSuccess: () => {
      refetchDecisions();
    },
  });

  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card>
          <CardHeader>
            <CardTitle>Living Project Model</CardTitle>
            <CardDescription>Select a room to access the project model</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const lpm = lpmData?.lpm;
  const decisions = decisionsData?.decisions || [];
  const impact: Impact | undefined = analyzeFeatureMutation.data?.impact;
  const advice: Advice | undefined = getAdviceMutation.data?.advice;

  return (
    <div className="h-full overflow-auto p-6 space-y-6" data-testid="page-lpm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Living Project Model</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent architecture guidance and impact analysis
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchDecisions()}
          data-testid="button-refresh-lpm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze" data-testid="tab-analyze">
            <Target className="w-4 h-4 mr-2" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="advise" data-testid="tab-advise">
            <Lightbulb className="w-4 h-4 mr-2" />
            Advise
          </TabsTrigger>
          <TabsTrigger value="model" data-testid="tab-model">
            <FileText className="w-4 h-4 mr-2" />
            Model
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History
          </TabsTrigger>
        </TabsList>

        {/* Feature Impact Analysis */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Impact Analysis</CardTitle>
              <CardDescription>
                Analyze how a new feature will affect your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the feature you want to add (e.g., 'Add user authentication with email and password')"
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                rows={4}
                data-testid="input-feature-description"
              />
              <Button
                onClick={() => analyzeFeatureMutation.mutate(featureDescription)}
                disabled={!featureDescription || analyzeFeatureMutation.isPending}
                data-testid="button-analyze-feature"
              >
                {analyzeFeatureMutation.isPending ? 'Analyzing...' : 'Analyze Impact'}
              </Button>

              {impact && (
                <div className="mt-6 space-y-4" data-testid="card-impact-result">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Impact Summary</h3>
                    <p>{impact.summary}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{impact.components_affected}</div>
                      <div className="text-sm text-muted-foreground">Components</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{impact.api_endpoints}</div>
                      <div className="text-sm text-muted-foreground">API Endpoints</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{impact.data_changes}</div>
                      <div className="text-sm text-muted-foreground">Data Changes</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Estimated Effort</h3>
                    <Badge variant="secondary">{impact.estimated_effort}</Badge>
                  </div>

                  {impact.considerations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Considerations</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {impact.considerations.map((item, idx) => (
                          <li key={idx} className="text-sm">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Architecture Advice */}
        <TabsContent value="advise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Architecture Advice</CardTitle>
              <CardDescription>
                Get tailored architecture recommendations for your feature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What feature do you need advice on? (e.g., 'authentication', 'real-time chat', 'payment processing')"
                value={adviceFeature}
                onChange={(e) => setAdviceFeature(e.target.value)}
                rows={3}
                data-testid="input-advice-feature"
              />
              <Button
                onClick={() => getAdviceMutation.mutate(adviceFeature)}
                disabled={!adviceFeature || getAdviceMutation.isPending}
                data-testid="button-get-advice"
              >
                {getAdviceMutation.isPending ? 'Generating...' : 'Get Advice'}
              </Button>

              {advice && (
                <div className="mt-6 space-y-4" data-testid="card-advice-result">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Recommended Stack</h3>
                    <p className="font-mono text-sm">{advice.stack}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Complexity</h3>
                    <Badge variant="outline">{advice.estimated_complexity}</Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Implementation Steps</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {advice.steps.map((step, idx) => (
                        <li key={idx} className="text-sm">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {advice.security_notes && advice.security_notes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-orange-600">Security Notes</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {advice.security_notes.map((note, idx) => (
                          <li key={idx} className="text-sm">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {advice.best_practices && advice.best_practices.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Best Practices</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {advice.best_practices.map((practice, idx) => (
                          <li key={idx} className="text-sm">{practice}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {advice.considerations && advice.considerations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Considerations</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {advice.considerations.map((item, idx) => (
                          <li key={idx} className="text-sm">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Model */}
        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Project Model</CardTitle>
              <CardDescription>
                The living understanding of your project's architecture
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lpmLoading ? (
                <div>Loading project model...</div>
              ) : lpm ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Tech Stack</h3>
                    <div className="flex gap-2 flex-wrap">
                      {lpm.project_model.tech_stack.map((tech: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{tech}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-auto max-h-96">
                    <pre>{JSON.stringify(lpm.project_model, null, 2)}</pre>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Version: {lpm.version} • Last updated: {new Date(lpm.updated_at).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div>No project model available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decision History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision History</CardTitle>
              <CardDescription>
                Track of architectural decisions and analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No decisions recorded yet. Start by analyzing a feature or getting architecture advice.
                </div>
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision: any) => (
                    <div key={decision.id} className="p-4 border rounded-lg" data-testid={`decision-${decision.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {decision.decision_type.replace('_', ' ')}
                          </Badge>
                          <h4 className="font-semibold">{decision.description}</h4>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(decision.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {decision.rationale && (
                        <p className="text-sm text-muted-foreground mt-2">{decision.rationale}</p>
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
