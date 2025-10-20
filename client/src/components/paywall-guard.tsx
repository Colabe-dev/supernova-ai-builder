import { ReactNode, useState } from "react";
import { useEntitlements } from "@/hooks/use-entitlements";
import { UpgradeModal } from "./upgrade-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface PaywallGuardProps {
  children: ReactNode;
  feature: string;
  requiresPro?: boolean;
  showUpgradeModal?: boolean;
  fallback?: ReactNode;
}

export function PaywallGuard({ 
  children, 
  feature, 
  requiresPro = true,
  showUpgradeModal = true,
  fallback 
}: PaywallGuardProps) {
  const { isPro, isLoading } = useEntitlements();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requiresPro && !isPro) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgradeModal) {
      return (
        <>
          <Alert>
            <AlertDescription>
              This feature requires a Pro plan. {' '}
              <button 
                onClick={() => setShowModal(true)}
                className="underline font-semibold"
              >
                Upgrade now
              </button>
            </AlertDescription>
          </Alert>
          <UpgradeModal 
            open={showModal} 
            onOpenChange={setShowModal}
            feature={feature}
          />
        </>
      );
    }

    return null;
  }

  return <>{children}</>;
}
