import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../integrations/supabase.js';
import { grantCreditsInternal } from './credits.js';
import cookieParser from 'cookie-parser';

const router = Router();
router.use(cookieParser());

const REFERRAL_COOKIE = 'sn_ref';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const BASE_URL = process.env.REFERRALS_PUBLIC_BASE || 'http://localhost:5000';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

router.get('/r/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return res.status(503).send('Supabase not configured');
  }

  try {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', code)
      .single();

    if (affiliate) {
      res.cookie(REFERRAL_COOKIE, code, { 
        maxAge: COOKIE_MAX_AGE, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      await supabase.from('referral_clicks').insert({
        affiliate_id: affiliate.id,
        ip: req.ip,
        user_agent: req.get('user-agent'),
      });
    }

    res.redirect('/');
  } catch (error) {
    console.error('Referral tracking error:', error);
    res.redirect('/');
  }
});

router.post('/api/referrals/affiliate', async (req: Request, res: Response) => {
  const { email } = req.body;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    let { data: existing } = await supabase
      .from('affiliates')
      .select('code')
      .eq('email', email)
      .single();

    if (existing) {
      return res.json({ code: existing.code, link: `${BASE_URL}/r/${existing.code}` });
    }

    const code = generateCode();
    const { data: newAffiliate, error } = await supabase
      .from('affiliates')
      .insert({ code, email })
      .select('code')
      .single();

    if (error) throw error;

    res.json({ code: newAffiliate.code, link: `${BASE_URL}/r/${newAffiliate.code}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create affiliate' });
  }
});

/**
 * Record a referral event and grant credits
 * POST /api/referrals/event
 * 
 * ⚠️  SPRINT A LIMITATION - REQUIRES SPRINT B AUTH ⚠️
 * This endpoint is currently UNAUTHENTICATED for Sprint A development/demo purposes.
 * It allows tracking referral events and granting credits but is NOT production-secure.
 * 
 * Sprint B will move credit granting to authenticated backend workflows:
 * - Signup events triggered by auth service
 * - Purchase events triggered by payment webhooks  
 * - JWT/workspace-based authorization
 * - Read APIs protected with authentication
 * 
 * DO NOT use in production without implementing Sprint B security.
 */
router.post('/api/referrals/event', async (req: Request, res: Response) => {
  const { event_type, amount_usd } = req.body;
  const refCode = req.cookies[REFERRAL_COOKIE];
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  if (!refCode) {
    return res.json({ ok: false, message: 'No referral cookie found' });
  }

  try {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, email')
      .eq('code', refCode)
      .single();

    if (!affiliate) {
      return res.json({ ok: false, message: 'Affiliate not found' });
    }

    // Record the event
    await supabase.from('referral_events').insert({
      affiliate_id: affiliate.id,
      event_type,
      amount_usd: amount_usd || null,
    });

    // Grant credits based on event type
    let creditsToGrant = 0;
    let source = 'referral';

    switch (event_type) {
      case 'signup':
        creditsToGrant = 100;
        source = 'referral_signup';
        break;
      case 'purchase':
        // 10% commission on purchase amount (must be positive)
        const purchaseAmount = Math.max(0, parseFloat(amount_usd) || 0);
        creditsToGrant = Math.floor(purchaseAmount * 0.1);
        source = 'referral_purchase';
        break;
      case 'social_post':
        creditsToGrant = 50;
        source = 'social_post';
        break;
      default:
        break;
    }

    // Grant credits to the affiliate (referrer) - using affiliate email as user_id for now
    // This will be migrated to proper workspace/user IDs in Sprint B
    if (creditsToGrant > 0 && affiliate.email) {
      const grantResult = await grantCreditsInternal({
        workspace_id: null,
        user_id: affiliate.email, // Use email as unique identifier until workspace system is implemented
        source,
        amount: creditsToGrant,
        meta: {
          affiliate_id: affiliate.id,
          affiliate_email: affiliate.email,
          event_type,
          amount_usd: amount_usd || null,
        },
      });

      if (!grantResult.ok) {
        console.error('[Referrals] Failed to grant credits:', grantResult.error);
      }
    }

    res.json({ ok: true, credits_granted: creditsToGrant });
  } catch (error: any) {
    console.error('Referral event error:', error);
    res.status(500).json({ error: error.message || 'Failed to record event' });
  }
});

router.get('/api/referrals/stats', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    const { data, error } = await supabase
      .from('referral_stats')
      .select('*')
      .order('total_revenue_usd', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

function escapeCsvField(field: any): string {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/api/referrals/export.csv', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return res.status(503).send('Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('referral_stats')
      .select('*')
      .order('total_revenue_usd', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const csv = [
      'Email,Code,Clicks,Signups,Purchases,Revenue USD',
      ...rows.map((r: any) =>
        [
          escapeCsvField(r.email),
          escapeCsvField(r.code),
          escapeCsvField(r.total_clicks),
          escapeCsvField(r.total_signups),
          escapeCsvField(r.total_purchases),
          escapeCsvField(r.total_revenue_usd)
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=referrals.csv');
    res.send(csv);
  } catch (error: any) {
    res.status(500).send('Failed to export');
  }
});

export default router;
