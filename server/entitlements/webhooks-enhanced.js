/**
 * Enhanced Postgres-backed webhook router for CollabPay events
 * Handles SKU mapping and entitlement grants
 */

import express from 'express';
import { grantCoins, grantSubscription, revokeSubscription } from './db.js';
import { verifyHMAC } from './hmac.js';
import { logger } from '../observability/index.js';
import { getProductBySKU } from '../billing/products.js';

const router = express.Router();

// POST /collab-pay - Enhanced webhook handler with SKU mapping
router.post('/collab-pay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.COLLAB_PAY_WEBHOOK_SECRET;
    const timestamp = req.headers['x-collab-timestamp'];
    const signature = req.headers['x-collab-signature'];
    const eventId = req.headers['x-collab-id'];

    // Verify HMAC signature with timestamp tolerance
    if (secret && signature && timestamp) {
      const now = Math.floor(Date.now() / 1000);
      const skewSec = Math.abs(now - parseInt(timestamp));
      const maxSkew = parseInt(process.env.WEBHOOK_MAX_SKEW_SEC || '300');

      if (skewSec > maxSkew) {
        logger.warn({ skewSec, maxSkew }, 'Webhook timestamp skew exceeded');
        return res.status(401).json({ ok: false, error: 'Timestamp too old' });
      }

      const rawBody = req.body;
      const payload = `${timestamp}.${rawBody.toString()}`;
      
      if (!verifyHMAC(Buffer.from(payload), signature, secret)) {
        logger.warn({ eventId, signature }, 'Webhook signature verification failed');
        return res.status(401).json({ ok: false, error: 'Invalid signature' });
      }
    }

    // Parse JSON from raw body
    const payload = JSON.parse(req.body.toString());
    const { event, type, data } = payload;
    const eventType = event || type; // Support both field names

    logger.info({ eventType, eventId, profileId: data?.profileId }, 'Processing webhook event');

    // Handle payment.succeeded event (Collab Pay standard)
    if (eventType === 'payment.succeeded') {
      const { amount_cents, currency, product, metadata } = data;
      const profileId = metadata?.profileId || data.customer_id;

      if (!profileId) {
        logger.warn({ eventId }, 'Missing profileId in payment.succeeded');
        return res.status(400).json({ ok: false, error: 'profileId required' });
      }

      // Look up product by SKU
      const productConfig = getProductBySKU(product);
      
      if (!productConfig) {
        logger.warn({ product, eventId }, 'Unknown product SKU in webhook');
        return res.status(400).json({ ok: false, error: 'Unknown product' });
      }

      // Grant entitlements based on product configuration
      const { entitlements } = productConfig;

      if (entitlements.plan) {
        await grantSubscription(profileId, entitlements.plan);
        logger.info({ profileId, plan: entitlements.plan }, 'Granted subscription from webhook');
      }

      if (entitlements.coins && entitlements.coins > 0) {
        await grantCoins(
          profileId, 
          entitlements.coins, 
          'purchase', 
          'collabpay', 
          eventId || `webhook:${Date.now()}`
        );
        logger.info({ profileId, coins: entitlements.coins }, 'Granted coins from webhook');
      }

      // Record referral conversion if ref_code is present
      const refCode = metadata?.ref_code;
      if (refCode) {
        logger.info({ refCode, amount_cents, profileId }, 'Payment with referral code');
        // TODO: Record referral conversion event
      }

      return res.json({ ok: true, granted: entitlements });
    }

    // Legacy event handling for backward compatibility
    if (eventType === 'coins.credited') {
      const { profileId, amount } = data;

      if (!profileId || profileId === 'undefined') {
        return res.status(400).json({ ok: false, error: 'Invalid profileId' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid amount' });
      }

      await grantCoins(profileId, amount, 'webhook', 'collabpay', eventId || `webhook:${Date.now()}`);
      logger.info({ profileId, amount }, 'Granted coins from legacy event');
      return res.json({ ok: true });
    }

    if (eventType === 'subscription.activated') {
      const { profileId, plan } = data;

      if (!profileId || !plan) {
        return res.status(400).json({ ok: false, error: 'Missing profileId or plan' });
      }

      await grantSubscription(profileId, plan);
      logger.info({ profileId, plan }, 'Activated subscription from legacy event');
      return res.json({ ok: true });
    }

    if (eventType === 'subscription.cancelled') {
      const { profileId, plan } = data;

      if (!profileId || !plan) {
        return res.status(400).json({ ok: false, error: 'Missing profileId or plan' });
      }

      await revokeSubscription(profileId, plan);
      logger.info({ profileId, plan }, 'Cancelled subscription from legacy event');
      return res.json({ ok: true });
    }

    logger.warn({ eventType, eventId }, 'Unknown webhook event type');
    return res.status(400).json({ ok: false, error: 'Unknown event type' });

  } catch (err) {
    logger.error({ err, eventId: req.headers['x-collab-id'] }, 'Webhook processing error');
    
    // TODO: Write to DLQ for retry
    
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

export default router;
