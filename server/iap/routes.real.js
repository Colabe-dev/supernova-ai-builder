import { Router } from 'express';
import { verifyGooglePurchaseReal } from './google.real.js';
import { verifyAppleSignedPayload, verifyAppleLegacyReceipt } from './apple.real.js';
import { storage } from '../storage.js';
import { iapVerifySchema } from '../entitlements/validation.js';
import { logger } from '../observability/index.js';

const r = Router();
const strict = process.env.IAP_STRICT === 'true';
const pkgName = process.env.GOOGLE_PACKAGE_NAME;
const bundleId = process.env.APPLE_BUNDLE_ID;

function assert(value, msg){ if(!value) throw new Error(msg); }

r.post('/google/verify', async (req, res) => {
  try {
    const { profileId, productId, purchaseToken, packageName, grant, type } = req.body || {};
    assert(productId && purchaseToken, 'missing productId or purchaseToken');
    const pkg = packageName || pkgName;
    assert(pkg, 'packageName required');

    const vr = await verifyGooglePurchaseReal({ purchaseToken, productId, packageName: pkg, type: (grant?.type === 'subscription' || type === 'subscription') ? 'subscription' : 'product' });
    if (!vr.ok) {
      logger.warn({ productId }, 'google verification failed');
      return res.status(402).json({ error: 'verification failed', details: vr.raw });
    }

    if (grant) {
      const validated = iapVerifySchema.parse({ profileId, grant });
      if (grant.type === 'coins') {
        const out = await storage.creditCoins(validated.profileId, grant.amount, `google:${productId}`);
        logger.info({ profileId: validated.profileId, productId, amount: grant.amount }, 'google IAP coins granted');
        return res.json({ ok: true, entitlement: out });
      }
      if (grant.type === 'subscription') {
        const out = await storage.addSubscription(validated.profileId, grant.plan);
        logger.info({ profileId: validated.profileId, productId, plan: grant.plan }, 'google IAP subscription granted');
        return res.json({ ok: true, entitlement: out });
      }
    }
    
    return res.json({ ok: true, verified: vr });
  } catch (e) {
    if (e.name === 'ZodError') {
      logger.warn({ err: e.errors }, 'google IAP validation failed');
      return res.status(400).json({ error: 'validation failed', details: e.errors });
    }
    logger.error({ err: e }, 'google IAP verification error');
    return res.status(500).json({ error: 'internal server error' });
  }
});

r.post('/apple/verify', async (req, res) => {
  try {
    const { profileId, signedPayload, receiptData, password, grant } = req.body || {};
    let vr;
    if (signedPayload) {
      vr = await verifyAppleSignedPayload(signedPayload);
      // Optional: check bundleId in claims
      if (bundleId && vr?.claims?.bundleId && vr.claims.bundleId !== bundleId) {
        logger.warn({ bundleId: vr.claims.bundleId }, 'apple bundleId mismatch');
        return res.status(400).json({ error: 'bundleId mismatch' });
      }
    } else if (receiptData && password) {
      vr = await verifyAppleLegacyReceipt({ receiptData, password, useSandbox: process.env.IAP_USE_SANDBOX !== 'false' });
    } else {
      return res.status(400).json({ error: 'missing signedPayload or receiptData+password' });
    }

    if (!vr.ok) {
      logger.warn('apple verification failed');
      return res.status(402).json({ error: 'verification failed' });
    }

    if (grant) {
      const validated = iapVerifySchema.parse({ profileId, grant });
      if (grant.type === 'coins') {
        const out = await storage.creditCoins(validated.profileId, grant.amount, `apple`);
        logger.info({ profileId: validated.profileId, amount: grant.amount }, 'apple IAP coins granted');
        return res.json({ ok: true, entitlement: out });
      }
      if (grant.type === 'subscription') {
        const out = await storage.addSubscription(validated.profileId, grant.plan);
        logger.info({ profileId: validated.profileId, plan: grant.plan }, 'apple IAP subscription granted');
        return res.json({ ok: true, entitlement: out });
      }
    }
    
    return res.json({ ok: true, verified: vr });
  } catch (e) {
    if (e.name === 'ZodError') {
      logger.warn({ err: e.errors }, 'apple IAP validation failed');
      return res.status(400).json({ error: 'validation failed', details: e.errors });
    }
    logger.error({ err: e }, 'apple IAP verification error');
    return res.status(500).json({ error: 'internal server error' });
  }
});

export default r;
