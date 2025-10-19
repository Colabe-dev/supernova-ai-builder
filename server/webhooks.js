import express from 'express';
import crypto from 'crypto';
import { storage } from './storage.js';
import { logger } from './observability/index.js';

const r = express.Router();

r.post('/collabpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.COLLAB_PAY_WEBHOOK_SECRET;
    
    if (secret) {
      const signature = req.headers['x-collab-signature'];
      if (!signature) {
        logger.warn('webhook missing signature');
        return res.status(401).json({ error: 'missing signature' });
      }
      
      const rawBody = req.body;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const expected = hmac.digest('hex');
      
      if (signature !== expected) {
        logger.warn({ signature, expected }, 'webhook signature mismatch');
        return res.status(401).json({ error: 'invalid signature' });
      }
    }

    const payload = JSON.parse(req.body.toString());
    const { event, data } = payload;
    
    if (!data?.profileId || data.profileId === 'undefined') {
      logger.warn({ event }, 'webhook missing valid profileId');
      return res.status(400).json({ error: 'valid profileId required' });
    }
    
    if (event === 'subscription.created' || event === 'subscription.renewed') {
      const { profileId, plan } = data;
      await storage.addSubscription(profileId, plan);
      logger.info({ profileId, plan, event }, 'webhook subscription processed');
      return res.json({ ok: true });
    }
    
    if (event === 'coins.credited') {
      const { profileId, amount, reason } = data;
      if (!amount || amount <= 0) {
        logger.warn({ amount }, 'webhook invalid coin amount');
        return res.status(400).json({ error: 'amount must be positive' });
      }
      await storage.creditCoins(profileId, amount, reason || 'webhook');
      logger.info({ profileId, amount, event }, 'webhook coins processed');
      return res.json({ ok: true });
    }
    
    if (event === 'purchase.completed') {
      const { profileId, ...purchase } = data;
      await storage.addPurchase(profileId, purchase);
      logger.info({ profileId, event }, 'webhook purchase processed');
      return res.json({ ok: true });
    }
    
    logger.info({ event }, 'webhook event ignored');
    return res.json({ ok: true, message: 'event ignored' });
  } catch (e) {
    logger.error({ err: e }, 'webhook processing failed');
    return res.status(500).json({ error: 'internal server error' });
  }
});

export default r;
