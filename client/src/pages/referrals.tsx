import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Download, CheckCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ReferralStats {
  affiliate_id: string;
  code: string;
  email: string;
  total_clicks: number;
  total_signups: number;
  total_purchases: number;
  total_revenue_usd: number;
}

export default function Referrals() {
  const [email, setEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const { toast } = useToast();

  const statsQuery = useQuery<ReferralStats[]>({
    queryKey: ['/api/referrals/stats'],
    refetchInterval: 30000, // Refresh every 30s
  });

  const createAffiliateMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/referrals/affiliate', { email });
      return response.json();
    },
    onSuccess: (data: any) => {
      setGeneratedLink(data.link);
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/stats'] });
      toast({
        title: 'Success',
        description: 'Your referral link has been generated!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create affiliate link',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const downloadCSV = () => {
    window.open('/api/referrals/export.csv', '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      createAffiliateMutation.mutate(email);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Referral Program</h1>
        <p className="text-muted-foreground">Generate referral links and track your performance</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Your Referral Link</CardTitle>
          <CardDescription>
            Create a unique referral link to share with others. Earn rewards when they sign up or make purchases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <Button
              type="submit"
              disabled={createAffiliateMutation.isPending}
              data-testid="button-generate-link"
            >
              {createAffiliateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Link
            </Button>
          </form>

          {generatedLink && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="flex-1"
                    data-testid="input-generated-link"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Referral Statistics</CardTitle>
              <CardDescription>Track clicks, signups, and revenue from your referrals</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={downloadCSV}
              data-testid="button-export-csv"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statsQuery.isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {statsQuery.data && statsQuery.data.length === 0 && (
            <Alert>
              <AlertDescription>
                No referral data yet. Generate your first link above to get started!
              </AlertDescription>
            </Alert>
          )}

          {statsQuery.data && statsQuery.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Code</th>
                    <th className="text-right p-2">Clicks</th>
                    <th className="text-right p-2">Signups</th>
                    <th className="text-right p-2">Purchases</th>
                    <th className="text-right p-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {statsQuery.data.map((stat) => (
                    <tr key={stat.affiliate_id} className="border-b" data-testid={`row-affiliate-${stat.code}`}>
                      <td className="p-2">{stat.email}</td>
                      <td className="p-2 font-mono text-sm">{stat.code}</td>
                      <td className="text-right p-2">{stat.total_clicks}</td>
                      <td className="text-right p-2">{stat.total_signups}</td>
                      <td className="text-right p-2">{stat.total_purchases}</td>
                      <td className="text-right p-2">${parseFloat(stat.total_revenue_usd as any || '0').toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
