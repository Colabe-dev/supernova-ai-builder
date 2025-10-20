import { useQuery } from "@tanstack/react-query";

export interface Entitlements {
  profileId: string;
  plan: 'free' | 'pro';
  coins: {
    balance: number;
    total: number;
  };
  subscriptions: any[];
  features: {
    maxProjects: number;
    aiMinutesPerMonth: number;
    maxBuildsPerMonth: number;
    prioritySupport?: boolean;
    advancedTemplates?: boolean;
  };
}

export function useEntitlements(profileId: string = 'demo_user') {
  const query = useQuery<Entitlements>({
    queryKey: ['/api/billing/entitlements', profileId],
    enabled: !!profileId,
  });

  const hasFeature = (feature: string): boolean => {
    if (!query.data) return false;
    return !!query.data.features[feature as keyof typeof query.data.features];
  };

  const canPerformAction = (action: 'create_project' | 'use_ai' | 'build'): boolean => {
    if (!query.data) return false;
    
    // TODO: Track actual usage and compare against limits
    // For now, just check if they have the plan
    return query.data.plan === 'pro';
  };

  const isPro = query.data?.plan === 'pro';
  const coinBalance = query.data?.coins?.balance || 0;

  return {
    ...query,
    entitlements: query.data,
    hasFeature,
    canPerformAction,
    isPro,
    coinBalance,
  };
}
