import express from 'express';
import { storage } from '../storage.js';
import crypto from 'crypto';
import { grantRequestSchema } from './validation.js';
import { logger } from '../observability/index.js';

const r = express.Router();

r.get('/entitlements/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    if (!profileId || profileId === 'undefined') {
      return res.status(400).json({ error: 'valid profileId required' });
    }

    let ent = await storage.getEntitlement(profileId);
    
    if (!ent) {
      ent = {
        profileId,
        coins: { balance: 0, total: 0 },
        subscriptions: [],
        purchases: [],
        updatedAt: new Date(),
      };
    }
    
    return res.json(ent);
  } catch (e) {
    logger.error({ err: e, profileId: req.params.profileId }, 'failed to get entitlement');
    return res.status(500).json({ error: 'internal server error' });
  }
});

r.post('/entitlements/grant', async (req, res) => {
  try {
    const validated = grantRequestSchema.parse(req.body);
    const { profileId, grant } = validated;

    let result;
    if (grant.type === 'coins') {
      result = await storage.creditCoins(profileId, grant.amount, grant.reason || 'manual');
      logger.info({ profileId, amount: grant.amount, reason: grant.reason }, 'coins granted');
    } else if (grant.type === 'subscription') {
      result = await storage.addSubscription(profileId, grant.plan);
      logger.info({ profileId, plan: grant.plan }, 'subscription granted');
    }

    return res.json({ ok: true, entitlement: result });
  } catch (e) {
    if (e.name === 'ZodError') {
      logger.warn({ err: e.errors }, 'grant validation failed');
      return res.status(400).json({ error: 'validation failed', details: e.errors });
    }
    logger.error({ err: e }, 'failed to grant entitlement');
    return res.status(500).json({ error: 'internal server error' });
  }
});

export default r;
