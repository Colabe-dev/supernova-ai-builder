import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Check } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  limit?: string;
}

export function UpgradeModal({ open, onOpenChange, feature, limit }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation('/pricing');
  };

  const features = [
    '50 Projects (vs 3 on Free)',
    '500 AI Minutes/Month (vs 50)',
    '100 Builds/Month (vs 10)',
    'Priority Support',
    'Advanced Templates',
    'Team Collaboration',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ 
                background: 'linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)',
              }}
            >
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <Badge variant="default">
              <Zap className="h-3 w-3 mr-1" />
              Upgrade Required
            </Badge>
          </div>
          <DialogTitle className="text-2xl">Unlock Pro Features</DialogTitle>
          <DialogDescription>
            {feature && (
              <p className="mb-4">
                <strong>{feature}</strong> requires a Pro plan.
                {limit && ` You've reached the ${limit} limit on the Free tier.`}
              </p>
            )}
            <p>
              Upgrade to Pro to unlock unlimited potential and build amazing applications.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgrade}
            style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
              borderColor: 'rgba(124, 58, 237, 0.4)',
            }}
            data-testid="button-upgrade-modal"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            View Pro Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
