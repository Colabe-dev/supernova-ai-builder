export async function creditCoins(profileId, amount, source) {
  console.log(`[Collab Pay Stub] Credit ${amount} coins to ${profileId} from ${source}`);
  return {
    success: true,
    profileId,
    balance: amount,
    transaction: {
      id: `txn_${Date.now()}`,
      amount,
      source,
      timestamp: new Date().toISOString()
    }
  };
}

export async function createSubscription(profileId, plan) {
  console.log(`[Collab Pay Stub] Create subscription ${plan} for ${profileId}`);
  return {
    success: true,
    profileId,
    subscription: {
      id: `sub_${Date.now()}`,
      plan,
      status: 'active',
      startDate: new Date().toISOString()
    }
  };
}
