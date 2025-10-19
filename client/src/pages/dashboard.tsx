import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Folder, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NewProjectDialog } from "@/components/new-project-dialog";
import type { Project } from "@shared/schema";
import { Link } from "wouter";

const statusConfig = {
  draft: { label: "Draft", icon: Clock, color: "neon-text-yellow" },
  building: { label: "Building", icon: Clock, color: "neon-text-cyan" },
  ready: { label: "Ready", icon: CheckCircle2, color: "neon-text-green" },
  error: { label: "Error", icon: AlertCircle, color: "neon-text-pink" },
};

export default function Dashboard() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold gradient-text" data-testid="text-page-title">
            Projects
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage and build your applications
          </p>
        </div>
        <Button onClick={() => setIsNewProjectOpen(true)} className="gap-2 neon-text-cyan font-semibold" data-testid="button-new-project" style={{ background: 'rgba(0, 255, 255, 0.1)', border: '2px solid var(--color-neon-cyan)' }}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="neon-card">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const status = statusConfig[project.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="neon-card cursor-pointer" data-testid={`card-project-${project.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 neon-text-cyan" />
                      <CardTitle className="text-base font-semibold neon-text-cyan">
                        {project.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {project.description && (
                      <CardDescription className="line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {project.description}
                      </CardDescription>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge className="text-xs capitalize neon-text-pink" style={{ background: 'rgba(255, 0, 255, 0.1)', border: '1px solid rgba(255, 0, 255, 0.3)' }}>
                        {project.type}
                      </Badge>
                      <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="neon-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ background: 'rgba(0, 255, 255, 0.1)' }}>
              <Folder className="h-10 w-10 neon-text-cyan" />
            </div>
            <h3 className="text-lg font-semibold mb-2 gradient-text">No projects yet</h3>
            <p className="text-sm mb-6 max-w-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Get started by creating your first project with AI-powered agents
            </p>
            <Button onClick={() => setIsNewProjectOpen(true)} className="gap-2 neon-text-yellow font-semibold" data-testid="button-create-first" style={{ background: 'rgba(255, 255, 0, 0.1)', border: '2px solid var(--color-neon-yellow)' }}>
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}

      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
      />
    </div>
  );
}
