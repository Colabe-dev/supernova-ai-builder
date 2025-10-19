import { Router } from 'express';
import { verifyGooglePurchaseReal } from './google.real.js';
import { verifyAppleSignedPayload, verifyAppleLegacyReceipt } from './apple.real.js';
import { creditCoins, createSubscription } from '../collab/payClient.js';

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
    if (!vr.ok) return res.status(402).json({ error: 'verification failed', details: vr.raw });

    if (grant?.type === 'coins') {
      const out = await creditCoins(profileId, grant.amount, `google:${productId}`);
      return res.json({ ok: true, collab: out });
    }
    if (grant?.type === 'subscription') {
      const out = await createSubscription(profileId, grant.plan);
      return res.json({ ok: true, collab: out });
    }
    return res.json({ ok: true, verified: vr });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

r.post('/apple/verify', async (req, res) => {
  try {
    const { profileId, signedPayload, receiptData, password, grant } = req.body || {};
    let vr;
    if (signedPayload) {
      vr = await verifyAppleSignedPayload(signedPayload);
      // Optional: check bundleId in claims
      if (bundleId && vr?.claims?.bundleId && vr.claims.bundleId !== bundleId) {
        return res.status(400).json({ error: 'bundleId mismatch' });
      }
    } else if (receiptData && password) {
      vr = await verifyAppleLegacyReceipt({ receiptData, password, useSandbox: process.env.IAP_USE_SANDBOX !== 'false' });
    } else {
      return res.status(400).json({ error: 'missing signedPayload or receiptData+password' });
    }

    if (!vr.ok) return res.status(402).json({ error: 'verification failed' });

    if (grant?.type === 'coins') {
      const out = await creditCoins(profileId, grant.amount, `apple`);
      return res.json({ ok: true, collab: out });
    }
    if (grant?.type === 'subscription') {
      const out = await createSubscription(profileId, grant.plan);
      return res.json({ ok: true, collab: out });
    }
    return res.json({ ok: true, verified: vr });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

export default r;
