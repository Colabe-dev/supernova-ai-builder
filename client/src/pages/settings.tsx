import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your Supernova workspace
        </p>
      </div>

      <Card className="border-card-border border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <SettingsIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg mb-2">Settings Coming Soon</CardTitle>
          <CardDescription className="max-w-sm">
            Configure API keys, team settings, and workspace preferences
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
