/**
 * Postgres-backed webhook router for CollabPay events
 * Must be mounted BEFORE express.json() for raw body access
 */

import express from 'express';
import { grantCoins, grantSubscription, revokeSubscription } from './db.js';
import { verifyHMAC } from './hmac.js';
import { logger } from '../observability/index.js';

const router = express.Router();

// POST /collabpay - Webhook handler with signature verification
router.post('/collabpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.COLLAB_PAY_WEBHOOK_SECRET;

    // Verify HMAC signature if secret is configured
    if (secret) {
      const signature = req.headers['x-collab-signature'];
      const rawBody = req.body;

      if (!verifyHMAC(rawBody, signature, secret)) {
        logger.warn({ signature }, 'Webhook signature verification failed');
        return res.status(401).json({ ok: false, error: 'Invalid signature' });
      }
    }

    // Parse JSON from raw body
    const payload = JSON.parse(req.body.toString());
    const { event, data } = payload;

    logger.info({ event, profileId: data?.profileId }, 'Processing webhook event');

    // Handle different event types
    if (event === 'coins.credited') {
      const { profileId, amount } = data;

      if (!profileId || profileId === 'undefined') {
        logger.warn({ profileId, event }, 'Invalid profileId in webhook');
        return res.status(400).json({ ok: false, error: 'Invalid profileId' });
      }

      if (!amount || amount <= 0) {
        logger.warn({ amount, event }, 'Invalid amount in webhook');
        return res.status(400).json({ ok: false, error: 'Invalid amount' });
      }

      await grantCoins(profileId, amount, 'webhook', 'collabpay', `webhook:${Date.now()}`);
      logger.info({ profileId, amount }, 'Webhook: Granted coins');
    } else if (event === 'subscription.activated') {
      const { profileId, plan } = data;

      if (!profileId || !plan) {
        logger.warn({ profileId, plan, event }, 'Missing data in webhook');
        return res.status(400).json({ ok: false, error: 'Missing profileId or plan' });
      }

      await grantSubscription(profileId, plan);
      logger.info({ profileId, plan }, 'Webhook: Activated subscription');
    } else if (event === 'subscription.cancelled') {
      const { profileId, plan } = data;

      if (!profileId || !plan) {
        logger.warn({ profileId, plan, event }, 'Missing data in webhook');
        return res.status(400).json({ ok: false, error: 'Missing profileId or plan' });
      }

      await revokeSubscription(profileId, plan);
      logger.info({ profileId, plan }, 'Webhook: Cancelled subscription');
    } else {
      logger.warn({ event }, 'Unknown webhook event type');
      return res.status(400).json({ ok: false, error: 'Unknown event type' });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, body: req.body?.toString() }, 'Webhook processing error');
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

export default router;
