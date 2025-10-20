import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: Array<{ key: string; value: any }>;
}

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<PricingPlan[]>({
    queryKey: ['/api/billing/pricing'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (productKey: string) => {
      const data = await apiRequest('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          productKey,
          profileId: 'demo_user', // TODO: Get from auth context
        }),
      });
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Collab Pay checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = (productKey: string) => {
    checkoutMutation.mutate(productKey);
  };

  const filteredPlans = plans?.filter(plan => 
    plan.interval === billingInterval
  ) || [];

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 hero-title-gradient">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that works best for your team. All plans include core features.
        </p>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex justify-center gap-2 mb-12">
        <Button
          variant={billingInterval === 'month' ? 'default' : 'outline'}
          onClick={() => setBillingInterval('month')}
          data-testid="button-billing-monthly"
        >
          Monthly
        </Button>
        <Button
          variant={billingInterval === 'year' ? 'default' : 'outline'}
          onClick={() => setBillingInterval('year')}
          data-testid="button-billing-yearly"
        >
          Yearly
          <Badge variant="secondary" className="ml-2">Save 15%</Badge>
        </Button>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Free Tier */}
        <Card className="hover-elevate" data-testid="card-plan-free">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">3 Projects</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">50 AI Minutes/Month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">10 Builds/Month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Community Support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" disabled>
              Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plans */}
        {isLoading ? (
          <Card className="md:col-span-2">
            <CardContent className="p-12 text-center">
              <Zap className="h-8 w-8 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Loading plans...</p>
            </CardContent>
          </Card>
        ) : (
          filteredPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className="hover-elevate border-primary/20" 
              style={{ borderWidth: '2px' }}
              data-testid={`card-plan-${plan.id.toLowerCase()}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pro</CardTitle>
                  <Badge variant="default">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                </div>
                <CardDescription>For serious builders</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ${(plan.price / 100).toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {formatFeature(feature.key, feature.value)}
                      </span>
                    </li>
                  ))}
                  {plan.interval === 'year' && (
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-semibold">
                        + 5,000 Bonus AI Coins
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout(plan.id)}
                  disabled={checkoutMutation.isPending}
                  data-testid={`button-checkout-${plan.id.toLowerCase()}`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
                    borderColor: 'rgba(124, 58, 237, 0.4)',
                  }}
                >
                  {checkoutMutation.isPending ? 'Processing...' : 'Upgrade to Pro'}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-16 text-center text-sm text-muted-foreground">
        <p>All plans include 14-day money-back guarantee</p>
        <p className="mt-2">Questions? Contact support@supernova.dev</p>
      </div>
    </div>
  );
}

function formatFeature(key: string, value: any): string {
  const labels: Record<string, string> = {
    maxProjects: `${value} Projects`,
    aiMinutesPerMonth: `${value} AI Minutes/Month`,
    maxBuildsPerMonth: `${value} Builds/Month`,
    prioritySupport: 'Priority Support',
    advancedTemplates: 'Advanced Templates',
  };
  
  return labels[key] || `${key}: ${value}`;
}
