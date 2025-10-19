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
  draft: { label: "Draft", icon: Clock, color: "text-muted-foreground" },
  building: { label: "Building", icon: Clock, color: "text-chart-3" },
  ready: { label: "Ready", icon: CheckCircle2, color: "text-chart-2" },
  error: { label: "Error", icon: AlertCircle, color: "text-destructive" },
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and build your applications
          </p>
        </div>
        <Button onClick={() => setIsNewProjectOpen(true)} className="gap-2" data-testid="button-new-project">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-card-border">
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
                <Card className="border-card-border hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base font-semibold">
                        {project.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {project.type}
                      </Badge>
                      <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-card-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Folder className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Get started by creating your first project with AI-powered agents
            </p>
            <Button onClick={() => setIsNewProjectOpen(true)} className="gap-2" data-testid="button-create-first">
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
