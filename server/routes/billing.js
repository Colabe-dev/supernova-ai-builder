/**
 * Billing & Checkout API Routes
 */

import express from 'express';
import { createCheckoutSession, getPricingData } from '../billing/checkout.js';
import { logger } from '../observability/index.js';

const router = express.Router();

// GET /api/billing/pricing - Get pricing information
router.get('/pricing', (req, res) => {
  try {
    const pricing = getPricingData();
    res.json(pricing);
  } catch (err) {
    logger.error({ err }, 'Error fetching pricing data');
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

// POST /api/billing/checkout - Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { productKey, profileId, metadata } = req.body;

    if (!productKey) {
      return res.status(400).json({ error: 'productKey is required' });
    }

    if (!profileId || profileId === 'undefined') {
      return res.status(401).json({ 
        error: 'Authentication required. Please provide a valid profileId.' 
      });
    }

    // Include referral code from cookies if present
    const refCode = req.cookies?.ref_code;
    const checkoutMetadata = {
      ...metadata,
      ...(refCode && { ref_code: refCode }),
    };

    const session = await createCheckoutSession(
      productKey,
      profileId,
      {
        metadata: checkoutMetadata,
        successUrl: req.body.successUrl,
        cancelUrl: req.body.cancelUrl,
        req,
      }
    );

    logger.info({ profileId, productKey, refCode }, 'Checkout session created');

    res.json(session);
  } catch (err) {
    logger.error({ err, body: req.body }, 'Checkout session creation failed');
    res.status(500).json({ error: err.message || 'Checkout failed' });
  }
});

// GET /api/billing/entitlements/:profileId - Get user entitlements
router.get('/entitlements/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    
    if (!profileId || profileId === 'undefined') {
      return res.status(400).json({ error: 'Valid profileId required' });
    }

    // Import DB functions
    const { getEntitlements } = await import('../entitlements/db.js');
    const { getLimits } = await import('../billing/products.js');
    
    const entitlements = await getEntitlements(profileId);
    
    // Determine plan from active subscriptions
    const hasProSubscription = entitlements.subscriptions?.some(
      sub => sub.plan === 'pro' && sub.status === 'active'
    );
    const plan = hasProSubscription ? 'pro' : 'free';
    const features = getLimits(plan);

    res.json({
      profileId,
      plan,
      coins: entitlements.coins || { balance: 0, total: 0 },
      subscriptions: entitlements.subscriptions || [],
      features,
    });
  } catch (err) {
    logger.error({ err, profileId: req.params.profileId }, 'Error fetching entitlements');
    res.status(500).json({ error: 'Failed to fetch entitlements' });
  }
});

export default router;
