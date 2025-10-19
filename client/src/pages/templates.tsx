import { useQuery } from "@tanstack/react-query";
import { Code2, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Template } from "@shared/schema";

export default function Templates() {
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Production-ready templates for your projects
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card
              key={template.id}
              className="border-card-border hover-elevate"
              data-testid={`card-template-${template.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {template.type === "web-next" ? (
                      <Code2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Smartphone className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs capitalize">
                      {template.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{template.description}</CardDescription>
                <div className="flex flex-wrap gap-2">
                  {template.techStack.map((tech) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
