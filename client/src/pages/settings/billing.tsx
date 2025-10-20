import { useEntitlements } from "@/hooks/use-entitlements";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CreditCard, Calendar, Coins, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function BillingSettings() {
  const { entitlements, isLoading, isPro, coinBalance } = useEntitlements();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const planName = isPro ? 'Pro' : 'Free';
  const features = entitlements?.features || {
    maxProjects: 3,
    aiMinutesPerMonth: 50,
    maxBuildsPerMonth: 10,
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your plan, payment methods, and usage.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              <Badge variant={isPro ? "default" : "secondary"}>
                {isPro && <Sparkles className="h-3 w-3 mr-1" />}
                {planName}
              </Badge>
            </div>
            <CardDescription>
              {isPro 
                ? 'You have access to all Pro features'
                : 'Upgrade to unlock advanced features'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {isPro ? 'Billed monthly' : 'Free tier'}
              </span>
            </div>
            
            {isPro && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Projects</span>
                <span className="font-medium">
                  0 / {features.maxProjects ?? 3}
                </span>
              </div>
              <Progress value={0} className="h-2" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI Minutes</span>
                <span className="font-medium">
                  0 / {features.aiMinutesPerMonth ?? 50}
                </span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </CardContent>
          <CardFooter>
            {!isPro && (
              <Button 
                className="w-full"
                onClick={() => setLocation('/pricing')}
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
                  borderColor: 'rgba(124, 58, 237, 0.4)',
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
            {isPro && (
              <Button variant="outline" className="w-full">
                Manage Subscription
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* AI Coins Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              AI Coins Balance
            </CardTitle>
            <CardDescription>
              Use coins for additional AI operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-5xl font-bold mb-2">
                {coinBalance.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                Available coins
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation('/pricing')}
            >
              Purchase More Coins
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>

        {/* Payment Method Card (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              Manage your payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No payment method on file
              </p>
            )}
          </CardContent>
          <CardFooter>
            {isPro && (
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Billing History Card (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View past invoices and receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground py-4">
              No billing history available
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              View All Invoices
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
