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
    const { productKey, metadata } = req.body;
    
    // TODO: Get profileId from authenticated session
    // For now, use a placeholder or require it in request
    const profileId = req.body.profileId || 'guest_' + Date.now();

    if (!productKey) {
      return res.status(400).json({ error: 'productKey is required' });
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
    
    // TODO: Implement actual entitlements lookup from DB
    // For now, return mock data
    res.json({
      profileId,
      plan: 'free',
      coins: { balance: 50, total: 50 },
      subscriptions: [],
      features: {
        maxProjects: 3,
        aiMinutesPerMonth: 50,
        maxBuildsPerMonth: 10,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching entitlements');
    res.status(500).json({ error: 'Failed to fetch entitlements' });
  }
});

export default router;
