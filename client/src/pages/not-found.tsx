import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-card-border">
        <CardContent className="pt-16 pb-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">404 - Page Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The page you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button className="gap-2" data-testid="button-home">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
