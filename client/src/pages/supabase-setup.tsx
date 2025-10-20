import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface HealthCheckResponse {
  ok: boolean;
  error?: string;
  usersSeen?: number;
}

export default function SupabaseSetup() {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  
  const [existingUrl, setExistingUrl] = useState('');
  const [existingAnonKey, setExistingAnonKey] = useState('');
  const [existingServiceRole, setExistingServiceRole] = useState('');
  
  const [newOrgId, setNewOrgId] = useState('');
  const [newRegion, setNewRegion] = useState('us-east-1');
  const [newDbPassword, setNewDbPassword] = useState('');
  const [newAccessToken, setNewAccessToken] = useState('');

  const healthQuery = useQuery<HealthCheckResponse>({
    queryKey: ['/api/db/health'],
    refetchInterval: 10000,
    retry: false,
  });

  const connectMutation = useMutation({
    mutationFn: async (data: {
      url: string;
      anonKey: string;
      serviceRole: string;
    }) => {
      return apiRequest('POST', '/api/supabase/connect', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/db/health'] });
    },
  });

  const provisionMutation = useMutation({
    mutationFn: async (data: {
      orgId: string;
      region: string;
      dbPassword: string;
      accessToken: string;
    }) => {
      return apiRequest('POST', '/api/supabase/provision', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/db/health'] });
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/supabase/bootstrap');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/db/health'] });
    },
  });

  const handleConnectExisting = () => {
    connectMutation.mutate({
      url: existingUrl,
      anonKey: existingAnonKey,
      serviceRole: existingServiceRole,
    });
  };

  const handleProvisionNew = () => {
    provisionMutation.mutate({
      orgId: newOrgId,
      region: newRegion,
      dbPassword: newDbPassword,
      accessToken: newAccessToken,
    });
  };

  const isConfigured = healthQuery.data?.ok ?? false;
  const isHealthy = healthQuery.data?.ok ?? false;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Supabase Integration
        </h1>
        <p className="text-muted-foreground">
          One-click setup for Supabase authentication, database, and storage
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Connection Status
            {healthQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!healthQuery.isLoading && isHealthy && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {!healthQuery.isLoading && !isHealthy && isConfigured && (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            {!healthQuery.isLoading && !isConfigured && (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Configuration:</span>
              {isConfigured ? (
                <Badge variant="default" data-testid="badge-configured">
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-not-configured">
                  Not Configured
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Health:</span>
              {healthQuery.isLoading ? (
                <Badge variant="outline">Checking...</Badge>
              ) : isHealthy ? (
                <Badge variant="default" data-testid="badge-healthy">
                  Healthy ({healthQuery.data?.usersSeen ?? 0} users)
                </Badge>
              ) : isConfigured ? (
                <Badge variant="destructive" data-testid="badge-unhealthy">
                  Unhealthy
                </Badge>
              ) : (
                <Badge variant="secondary">Not Set Up</Badge>
              )}
            </div>
            {healthQuery.data?.error && (
              <Alert variant="destructive">
                <AlertDescription data-testid="text-health-error">
                  {healthQuery.data.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {isConfigured && isHealthy && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Bootstrap</CardTitle>
            <CardDescription>
              Initialize starter tables with RLS policies (profiles, system_health). Run the SQL script manually via{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                Supabase SQL Editor
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Copy the SQL from <code className="px-1 py-0.5 bg-muted rounded">server/integrations/supabase-bootstrap.sql</code> and run it in your Supabase Dashboard SQL Editor.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => bootstrapMutation.mutate()}
                disabled={bootstrapMutation.isPending}
                data-testid="button-bootstrap"
                variant="outline"
              >
                {bootstrapMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check Tables
              </Button>
            </div>
            {bootstrapMutation.isSuccess && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {(bootstrapMutation.data as any)?.message || 'Database check completed successfully!'}
                </AlertDescription>
              </Alert>
            )}
            {bootstrapMutation.isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  {(bootstrapMutation.error as Error)?.message || 'Bootstrap failed'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {!isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Supabase</CardTitle>
            <CardDescription>
              Choose how you want to set up Supabase for your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" data-testid="tab-existing">
                  Use Existing Project
                </TabsTrigger>
                <TabsTrigger value="new" data-testid="tab-new">
                  Create New Project
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4 pt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connect to your existing Supabase project. Get your credentials from{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline"
                    >
                      Supabase Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Project URL</Label>
                    <Input
                      id="url"
                      placeholder="https://abcd1234.supabase.co"
                      value={existingUrl}
                      onChange={(e) => setExistingUrl(e.target.value)}
                      data-testid="input-url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anon-key">Anon Key (Client)</Label>
                    <Input
                      id="anon-key"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={existingAnonKey}
                      onChange={(e) => setExistingAnonKey(e.target.value)}
                      data-testid="input-anon-key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-role">Service Role Key (Server)</Label>
                    <Input
                      id="service-role"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={existingServiceRole}
                      onChange={(e) => setExistingServiceRole(e.target.value)}
                      data-testid="input-service-role"
                    />
                  </div>

                  <Button
                    onClick={handleConnectExisting}
                    disabled={
                      connectMutation.isPending ||
                      !existingUrl ||
                      !existingAnonKey ||
                      !existingServiceRole
                    }
                    className="w-full"
                    data-testid="button-connect-existing"
                  >
                    {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Connect to Existing Project
                  </Button>

                  {connectMutation.isError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {(connectMutation.error as Error)?.message || 'Connection failed'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="new" className="space-y-4 pt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Automatically provision a new Supabase project via the Management API. Requires
                    a Personal Access Token from your{' '}
                    <a
                      href="https://supabase.com/dashboard/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline"
                    >
                      Account Settings
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-id">Organization ID</Label>
                    <Input
                      id="org-id"
                      placeholder="abcdef123456"
                      value={newOrgId}
                      onChange={(e) => setNewOrgId(e.target.value)}
                      data-testid="input-org-id"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      placeholder="us-east-1"
                      value={newRegion}
                      onChange={(e) => setNewRegion(e.target.value)}
                      data-testid="input-region"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="db-password">Database Password</Label>
                    <Input
                      id="db-password"
                      type="password"
                      placeholder="Strong password for database"
                      value={newDbPassword}
                      onChange={(e) => setNewDbPassword(e.target.value)}
                      data-testid="input-db-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access-token">Personal Access Token</Label>
                    <Input
                      id="access-token"
                      type="password"
                      placeholder="sbp_..."
                      value={newAccessToken}
                      onChange={(e) => setNewAccessToken(e.target.value)}
                      data-testid="input-access-token"
                    />
                  </div>

                  <Button
                    onClick={handleProvisionNew}
                    disabled={
                      provisionMutation.isPending ||
                      !newOrgId ||
                      !newRegion ||
                      !newDbPassword ||
                      !newAccessToken
                    }
                    className="w-full"
                    data-testid="button-provision-new"
                  >
                    {provisionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Provision New Project
                  </Button>

                  {provisionMutation.isError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {(provisionMutation.error as Error)?.message || 'Provisioning failed'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
