import express from 'express';
import { storage } from '../storage.js';
import crypto from 'crypto';

const r = express.Router();

r.get('/entitlements/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
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
    return res.status(500).json({ error: e.message });
  }
});

r.post('/entitlements/grant', async (req, res) => {
  try {
    const { profileId, grant } = req.body;
    if (!profileId || !grant) {
      return res.status(400).json({ error: 'missing profileId or grant' });
    }

    let result;
    if (grant.type === 'coins') {
      result = await storage.creditCoins(profileId, grant.amount, grant.reason || 'manual');
    } else if (grant.type === 'subscription') {
      result = await storage.addSubscription(profileId, grant.plan);
    } else {
      return res.status(400).json({ error: 'invalid grant type' });
    }

    return res.json({ ok: true, entitlement: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

r.post('/webhooks/collabpay', async (req, res) => {
  try {
    const secret = process.env.COLLAB_PAY_WEBHOOK_SECRET;
    
    if (secret) {
      const signature = req.headers['x-collab-signature'];
      if (!signature) {
        return res.status(401).json({ error: 'missing signature' });
      }
      
      const body = JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const expected = hmac.digest('hex');
      
      if (signature !== expected) {
        return res.status(401).json({ error: 'invalid signature' });
      }
    }

    const { event, data } = req.body;
    
    if (event === 'subscription.created' || event === 'subscription.renewed') {
      const { profileId, plan } = data;
      await storage.addSubscription(profileId, plan);
      return res.json({ ok: true });
    }
    
    if (event === 'coins.credited') {
      const { profileId, amount, reason } = data;
      await storage.creditCoins(profileId, amount, reason || 'webhook');
      return res.json({ ok: true });
    }
    
    if (event === 'purchase.completed') {
      const { profileId, ...purchase } = data;
      await storage.addPurchase(profileId, purchase);
      return res.json({ ok: true });
    }
    
    return res.json({ ok: true, message: 'event ignored' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default r;
