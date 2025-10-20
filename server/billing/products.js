/**
 * Collab Pay Product & SKU Configuration
 * Maps external product IDs to internal entitlements
 */

export const PRODUCTS = {
  PRO_MONTHLY: {
    sku: process.env.SKU_PRO_MONTHLY || 'pro_monthly_4900',
    name: 'Supernova Pro (Monthly)',
    price: 4900, // cents
    currency: 'USD',
    interval: 'month',
    features: {
      maxProjects: 50,
      aiMinutesPerMonth: 500,
      maxBuildsPerMonth: 100,
      prioritySupport: true,
      advancedTemplates: true,
    },
    entitlements: {
      plan: 'pro',
      coins: 0, // No one-time coins for subscription
    },
  },
  PRO_YEARLY: {
    sku: process.env.SKU_PRO_YEARLY || 'pro_yearly_49900',
    name: 'Supernova Pro (Yearly)',
    price: 49900, // cents (save ~15%)
    currency: 'USD',
    interval: 'year',
    features: {
      maxProjects: 50,
      aiMinutesPerMonth: 500,
      maxBuildsPerMonth: 100,
      prioritySupport: true,
      advancedTemplates: true,
    },
    entitlements: {
      plan: 'pro',
      coins: 5000, // Bonus coins for annual commitment
    },
  },
  COIN_PACK_1000: {
    sku: process.env.SKU_COINS_1000 || 'coins_1000_999',
    name: '1,000 AI Coins',
    price: 999, // cents
    currency: 'USD',
    interval: 'one_time',
    entitlements: {
      coins: 1000,
    },
  },
  COIN_PACK_5000: {
    sku: process.env.SKU_COINS_5000 || 'coins_5000_3999',
    name: '5,000 AI Coins',
    price: 3999, // cents
    currency: 'USD',
    interval: 'one_time',
    entitlements: {
      coins: 5000,
    },
  },
};

// Free tier limits
export const FREE_TIER = {
  maxProjects: 3,
  aiMinutesPerMonth: 50,
  maxBuildsPerMonth: 10,
  prioritySupport: false,
  advancedTemplates: false,
};

// Map SKU to product configuration
export function getProductBySKU(sku) {
  return Object.values(PRODUCTS).find(p => p.sku === sku);
}

// Check if a user has access to a feature
export function hasFeature(userPlan, featureName) {
  if (userPlan === 'pro') {
    return PRODUCTS.PRO_MONTHLY.features[featureName] ?? false;
  }
  return FREE_TIER[featureName] ?? false;
}

// Get usage limits for a plan
export function getLimits(userPlan) {
  if (userPlan === 'pro') {
    return PRODUCTS.PRO_MONTHLY.features;
  }
  return FREE_TIER;
}
