import { Router } from 'express';
import bodyParser from 'body-parser';
import { getEntitlements, grantCoins, activateSubscription, cancelSubscription } from './db.js';
import { verifyHmacSHA256 } from './hmac.js';
import { parseAuthJwks, requireAuth } from '../auth/verify.js';
import { rateLimit } from '../rateLimit/index.js';

const r = Router();
r.use(bodyParser.json({ verify: (req, res, buf) => { req.rawBody = buf } }));
r.use(parseAuthJwks);

r.get('/entitlements/:profileId',
  rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), max: Number(process.env.RATE_LIMIT_READ_MAX || 120) }),
  (req, res, next) => {
    const u = req.user || {};
    const isSelf = u.sub && (u.sub === req.params.profileId);
    const hasRole = (u.roles || []).some(r => ['admin','finance'].includes(r));
    if (!isSelf && !hasRole && process.env.DEV_AUTH_OPEN !== 'true') return res.status(403).json({ error: 'forbidden' });
    next();
  },
  async (req, res) => {
    try { const out = await getEntitlements(req.params.profileId); res.json({ ok: true, entitlements: out }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  }
);

r.post('/entitlements/grant',
  requireAuth({ roles: ['admin','finance'] }),
  rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), max: Number(process.env.RATE_LIMIT_WRITE_MAX || 30) }),
  async (req, res) => {
    try {
      const { profileId, grant, externalRef } = req.body || {};
      if (!profileId || !grant?.type) return res.status(400).json({ error: 'missing profileId or grant' });
      if (grant.type === 'coins') {
        const r1 = await grantCoins(profileId, grant.amount || 0, grant.reason || 'manual', grant.source || 'api', externalRef);
        return res.json({ ok: true, entitlements: await getEntitlements(profileId), ledger: r1 });
      }
      if (grant.type === 'subscription') {
        await activateSubscription(profileId, grant.plan, grant.source || 'api');
        return res.json({ ok: true, entitlements: await getEntitlements(profileId) });
      }
      if (grant.type === 'revoke') {
        await cancelSubscription(profileId, grant.plan, grant.source || 'api');
        return res.json({ ok: true, entitlements: await getEntitlements(profileId) });
      }
      return res.status(400).json({ error: 'unknown grant.type' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

r.post('/webhooks/collabpay',
  rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), max: Number(process.env.RATE_LIMIT_WEBHOOK_MAX || 1200), keyFn: req => `wh:${req.ip}` }),
  async (req, res) => {
    try {
      const sig = req.headers['x-collab-signature'];
      const secret = process.env.COLLAB_PAY_WEBHOOK_SECRET || '';
      const ok = verifyHmacSHA256(req.rawBody || Buffer.from(''), String(sig || ''), secret);
      if (!ok) return res.status(401).json({ error: 'bad signature' });

      const evt = req.body || {};
      if (evt.type === 'coins.credited') {
        const { profileId, amount, ref } = evt.data || {};
        await grantCoins(profileId, amount, 'webhook', 'collabpay', ref);
      }
      if (evt.type === 'subscription.activated') {
        const { profileId, plan } = evt.data || {};
        await activateSubscription(profileId, plan, 'webhook');
      }
      if (evt.type === 'subscription.cancelled') {
        const { profileId, plan } = evt.data || {};
        await cancelSubscription(profileId, plan, 'webhook');
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

export default r;
