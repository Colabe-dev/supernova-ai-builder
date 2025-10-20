import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, CreditCard, Bell, Shield } from "lucide-react";
import BillingSettings from "./settings/billing";

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

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="general" disabled>
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" disabled>
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" disabled>
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-6">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="general">
          <div className="text-center py-12 text-muted-foreground">
            General settings coming soon
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="text-center py-12 text-muted-foreground">
            Notification settings coming soon
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="text-center py-12 text-muted-foreground">
            Security settings coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
