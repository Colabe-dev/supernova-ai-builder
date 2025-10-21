import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, GitFork, Eye, Plus, Code, Users } from "lucide-react";

export default function GitHubPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");

  const { data: user, isLoading: loadingUser } = useQuery<any>({
    queryKey: ["/api/github/user"],
  });

  const { data: repos = [], isLoading: loadingRepos } = useQuery<any[]>({
    queryKey: ["/api/github/repos"],
  });

  const createRepoMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; private: boolean }) => {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create repository");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      setNewRepoName("");
      setNewRepoDesc("");
      toast({
        title: "Repository created",
        description: "Your new GitHub repository has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create repository",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCreateRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) {
      toast({
        title: "Repository name required",
        description: "Please enter a repository name",
        variant: "destructive",
      });
      return;
    }
    createRepoMutation.mutate({
      name: newRepoName.trim(),
      description: newRepoDesc.trim(),
      private: false,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GitHub Integration</h1>
          <p className="text-muted-foreground">
            Manage your GitHub repositories and user profile
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList data-testid="tabs-github">
          <TabsTrigger value="profile" data-testid="tab-profile">
            Profile
          </TabsTrigger>
          <TabsTrigger value="repositories" data-testid="tab-repositories">
            Repositories
          </TabsTrigger>
          <TabsTrigger value="create" data-testid="tab-create">
            Create Repo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {loadingUser ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Loading user data...</p>
              </CardContent>
            </Card>
          ) : user ? (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="w-20 h-20 rounded-full"
                      data-testid="img-avatar"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle data-testid="text-username">{user.name || user.login}</CardTitle>
                    <CardDescription data-testid="text-login">@{user.login}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.bio && (
                  <p className="text-sm" data-testid="text-bio">
                    {user.bio}
                  </p>
                )}
                <div className="flex gap-4 flex-wrap">
                  <Badge variant="secondary" data-testid="badge-repos">
                    <Code className="w-3 h-3 mr-1" />
                    {user.public_repos} Repositories
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-followers">
                    <Users className="w-3 h-3 mr-1" />
                    {user.followers} Followers
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-following">
                    {user.following} Following
                  </Badge>
                </div>
                {user.html_url && (
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                    data-testid="link-github-profile"
                  >
                    View on GitHub →
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No user data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="repositories" className="space-y-4">
          {loadingRepos ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Loading repositories...</p>
              </CardContent>
            </Card>
          ) : repos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {repos.map((repo: any) => (
                <Card key={repo.id} data-testid={`card-repo-${repo.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-repo-name-${repo.id}`}>
                          {repo.name}
                        </CardTitle>
                        {repo.description && (
                          <CardDescription className="mt-1" data-testid={`text-repo-desc-${repo.id}`}>
                            {repo.description}
                          </CardDescription>
                        )}
                      </div>
                      {repo.private && (
                        <Badge variant="secondary" data-testid={`badge-private-${repo.id}`}>
                          Private
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      {repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1" data-testid={`text-stars-${repo.id}`}>
                          <Star className="w-4 h-4" />
                          {repo.stargazers_count}
                        </span>
                      )}
                      {repo.forks_count > 0 && (
                        <span className="flex items-center gap-1" data-testid={`text-forks-${repo.id}`}>
                          <GitFork className="w-4 h-4" />
                          {repo.forks_count}
                        </span>
                      )}
                      {repo.watchers_count > 0 && (
                        <span className="flex items-center gap-1" data-testid={`text-watchers-${repo.id}`}>
                          <Eye className="w-4 h-4" />
                          {repo.watchers_count}
                        </span>
                      )}
                    </div>
                    {repo.language && (
                      <Badge variant="outline" data-testid={`badge-language-${repo.id}`}>
                        {repo.language}
                      </Badge>
                    )}
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm inline-block"
                      data-testid={`link-repo-${repo.id}`}
                    >
                      View on GitHub →
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No repositories found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Repository</CardTitle>
              <CardDescription>
                Create a new public repository on your GitHub account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRepo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-name">Repository Name</Label>
                  <Input
                    id="repo-name"
                    placeholder="my-awesome-project"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    data-testid="input-repo-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-desc">Description (optional)</Label>
                  <Textarea
                    id="repo-desc"
                    placeholder="A short description of your project"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    data-testid="input-repo-description"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createRepoMutation.isPending}
                  data-testid="button-create-repo"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createRepoMutation.isPending ? "Creating..." : "Create Repository"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
