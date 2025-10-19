import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Play, ArrowLeft, Brain, Code2, TestTube, Wrench, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { Project, AgentRun } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const agentConfig = {
  planner: { label: "Planner", icon: Brain, color: "text-chart-4" },
  implementer: { label: "Implementer", icon: Code2, color: "text-primary" },
  tester: { label: "Tester", icon: TestTube, color: "text-chart-2" },
  fixer: { label: "Fixer", icon: Wrench, color: "text-chart-3" },
};

const statusConfig = {
  running: { label: "Running", icon: Clock, color: "text-chart-3" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-chart-2" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-destructive" },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: agentRuns, isLoading: runsLoading } = useQuery<AgentRun[]>({
    queryKey: ["/api/projects", id, "agent-runs"],
  });

  const runAgentMutation = useMutation({
    mutationFn: async (agentType: string) => {
      const res = await apiRequest("POST", `/api/projects/${id}/run-agent`, { agentType });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "agent-runs"] });
      toast({
        title: "Agent started",
        description: "The agent is now running on your project.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start agent. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="border-card-border">
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Project not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="mb-4 gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-project-name">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {project.description}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="capitalize">
            {project.type}
          </Badge>
        </div>
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">Run AI Agents</CardTitle>
          <CardDescription>
            Execute specialized agents to build and improve your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(agentConfig).map(([type, config]) => {
              const AgentIcon = config.icon;
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => runAgentMutation.mutate(type)}
                  disabled={runAgentMutation.isPending}
                  data-testid={`button-run-${type}`}
                >
                  <AgentIcon className={`h-6 w-6 ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">Agent Activity</CardTitle>
          <CardDescription>
            Recent agent runs and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : agentRuns && agentRuns.length > 0 ? (
            <div className="space-y-4">
              {agentRuns.map((run, index) => {
                const agent = agentConfig[run.agentType as keyof typeof agentConfig];
                const status = statusConfig[run.status as keyof typeof statusConfig];
                const AgentIcon = agent.icon;
                const StatusIcon = status.icon;

                return (
                  <div key={run.id} data-testid={`agent-run-${run.id}`}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted`}>
                        <AgentIcon className={`h-5 w-5 ${agent.color}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{agent.label}</span>
                          <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(run.createdAt).toLocaleString()}
                        </div>
                        {run.output && (
                          <div className="mt-2 rounded-lg bg-muted p-3 text-sm font-mono">
                            {run.output}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No agent runs yet. Start by running an agent above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
