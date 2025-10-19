/**
 * Postgres-backed entitlements routes
 * Handles coins, subscriptions, and webhooks with DB persistence
 */

import express from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import {
  getEntitlements,
  grantCoins,
  grantSubscription,
  revokeSubscription,
  getPurchaseHistory,
} from './db.js';
import { logger } from '../observability/index.js';

const router = express.Router();

// Validation schemas
const coinsGrantSchema = z.object({
  type: z.literal('coins'),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
  source: z.string().optional(),
});

const subscriptionGrantSchema = z.object({
  type: z.literal('subscription'),
  plan: z.string().min(1),
});

const revokeGrantSchema = z.object({
  type: z.literal('revoke'),
  plan: z.string().min(1),
});

const grantRequestSchema = z.object({
  profileId: z.string().min(1),
  grant: z.union([coinsGrantSchema, subscriptionGrantSchema, revokeGrantSchema]),
  externalRef: z.string().optional(),
});

// GET /api/entitlements/:profileId
router.get('/entitlements/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;

    if (!profileId || profileId === 'undefined') {
      logger.warn({ profileId }, 'Invalid profileId in GET request');
      return res.status(400).json({
        ok: false,
        error: 'Invalid profileId',
      });
    }

    const entitlements = await getEntitlements(profileId);
    const purchases = await getPurchaseHistory(profileId);

    logger.info({ profileId }, 'Fetched entitlements');

    res.json({
      ok: true,
      entitlements: {
        ...entitlements,
        purchases,
      },
    });
  } catch (err) {
    logger.error({ err, profileId: req.params.profileId }, 'Error fetching entitlements');
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch entitlements',
    });
  }
});

// POST /api/entitlements/grant
router.post('/entitlements/grant', async (req, res) => {
  try {
    // Validate request body
    const validation = grantRequestSchema.safeParse(req.body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      logger.warn({ error: error.message, body: req.body }, 'Grant validation failed');
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    const { profileId, grant, externalRef } = validation.data;

    let result;

    if (grant.type === 'coins') {
      const coins = await grantCoins(
        profileId,
        grant.amount,
        grant.reason || 'manual',
        grant.source || 'admin',
        externalRef
      );
      
      result = { coins };
      logger.info({ profileId, amount: grant.amount, externalRef }, 'Granted coins');
    } else if (grant.type === 'subscription') {
      const subscription = await grantSubscription(profileId, grant.plan);
      result = { subscription };
      logger.info({ profileId, plan: grant.plan }, 'Granted subscription');
    } else if (grant.type === 'revoke') {
      const subscription = await revokeSubscription(profileId, grant.plan);
      result = { subscription };
      logger.info({ profileId, plan: grant.plan }, 'Revoked subscription');
    }

    // Fetch full entitlements to return
    const entitlements = await getEntitlements(profileId);

    res.json({
      ok: true,
      entitlement: {
        profileId,
        ...entitlements,
        updatedAt: new Date(),
      },
      ...result,
    });
  } catch (err) {
    logger.error({ err, body: req.body }, 'Error granting entitlement');
    
    if (err.message.includes('Subscription not found')) {
      return res.status(404).json({
        ok: false,
        error: err.message,
      });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to grant entitlement',
    });
  }
});

export default router;
