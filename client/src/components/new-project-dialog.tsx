import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, Smartphone, Loader2 } from "lucide-react";
import { insertProjectSchema, type Template } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type NewProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: templates, isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    enabled: open,
  });

  const form = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "web",
      templateId: "",
      status: "draft",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created",
        description: "Your project has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      setSelectedTemplate(null);
      setLocation(`/projects/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!selectedTemplate) {
      toast({
        title: "Select a template",
        description: "Please select a template for your project.",
        variant: "destructive",
      });
      return;
    }

    const template = templates?.find(t => t.id === selectedTemplate);
    createProjectMutation.mutate({
      ...data,
      templateId: selectedTemplate,
      type: template?.type === "web-next" ? "web" : "mobile",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-new-project">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Choose a template and configure your project details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Select Template</h3>
            {templatesLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="p-4">
                      <Skeleton className="h-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates?.map((template) => (
                  <Card
                    key={template.id}
                    className={`border-card-border cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {template.type === "web-next" ? (
                            <Code2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Smartphone className="h-5 w-5 text-primary" />
                          )}
                          <h4 className="font-semibold">{template.name}</h4>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {template.techStack.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="my-awesome-app"
                        {...field}
                        data-testid="input-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project..."
                        {...field}
                        data-testid="input-project-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedTemplate || createProjectMutation.isPending}
                  data-testid="button-create"
                >
                  {createProjectMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Project
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
