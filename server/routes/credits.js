/**
 * Credits API Routes
 * Handles credit ledger management
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase admin client for database operations
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Internal function to grant credits (server-side only)
 * This should NOT be exposed as a public API endpoint
 * @param {Object} params - Credit grant parameters
 * @returns {Promise<Object>} Result with ok, credit, or error
 */
export async function grantCreditsInternal({ workspace_id, user_id, source, amount, meta }) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  // Validate required fields
  if (!source || !Number.isInteger(amount)) {
    return { 
      ok: false, 
      error: 'Missing required fields: source (string), amount (integer)' 
    };
  }

  if (!workspace_id && !user_id) {
    return { 
      ok: false, 
      error: 'Either workspace_id or user_id is required' 
    };
  }

  // Prevent negative credits from being granted
  if (amount < 0) {
    return {
      ok: false,
      error: 'Amount must be non-negative'
    };
  }

  try {
    const { data, error } = await supabase
      .from('credit_ledger')
      .insert({
        workspace_id: workspace_id || null,
        user_id: user_id || null,
        source,
        amount,
        meta: meta || null
      })
      .select()
      .single();

    if (error) {
      console.error('[Credits] Grant error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, credit: data };
  } catch (err) {
    console.error('[Credits] Grant exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Get credit balance for a workspace or user
 * GET /api/credits/balance?workspace_id=...&user_id=...
 */
router.get('/balance', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' });
  }

  const { workspace_id, user_id } = req.query;

  if (!workspace_id && !user_id) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Either workspace_id or user_id is required' 
    });
  }

  try {
    let query = supabase
      .from('credit_ledger')
      .select('amount');

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Credits] Balance error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const balance = data.reduce((sum, row) => sum + (row.amount || 0), 0);
    res.json({ ok: true, balance });
  } catch (err) {
    console.error('[Credits] Balance exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Get credit transaction history
 * GET /api/credits/history?workspace_id=...&user_id=...&limit=50
 */
router.get('/history', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' });
  }

  const { workspace_id, user_id, limit = 50 } = req.query;

  if (!workspace_id && !user_id) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Either workspace_id or user_id is required' 
    });
  }

  try {
    let query = supabase
      .from('credit_ledger')
      .select('*')
      .order('ts', { ascending: false })
      .limit(parseInt(limit, 10));

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Credits] History error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({ ok: true, transactions: data });
  } catch (err) {
    console.error('[Credits] History exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
