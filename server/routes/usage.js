/**
 * Usage API Routes
 * Handles usage analytics and event tracking
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
 * Get usage summary for a workspace
 * GET /api/usage/summary?workspace_id=...&range=day|week|month
 */
router.get('/summary', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' });
  }

  const { workspace_id, range = 'day' } = req.query;

  if (!workspace_id) {
    return res.status(400).json({ ok: false, error: 'workspace_id is required' });
  }

  try {
    const { data, error } = await supabase
      .rpc('usage_summary_fn', {
        p_workspace: workspace_id,
        p_range: range
      })
      .single();

    if (error) {
      console.error('[Usage] Summary error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Return properly formatted response matching frontend expectations
    res.json({ 
      ok: true, 
      tokens_in: data.tokens_in || 0,
      tokens_out: data.tokens_out || 0,
      tasks: data.tasks || 0,
      credits_available: data.credits_available || 0
    });
  } catch (err) {
    console.error('[Usage] Summary exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Get usage time series data
 * GET /api/usage/series?workspace_id=...&from=...&to=...
 */
router.get('/series', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' });
  }

  const { workspace_id, from, to } = req.query;

  if (!workspace_id || !from || !to) {
    return res.status(400).json({ 
      ok: false, 
      error: 'workspace_id, from, and to are required' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('usage_daily')
      .select('*')
      .eq('workspace_id', workspace_id)
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true });

    if (error) {
      console.error('[Usage] Series error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({ ok: true, rows: data || [] });
  } catch (err) {
    console.error('[Usage] Series exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Record a usage event
 * POST /api/usage/event
 * Body: { workspace_id, user_id, kind, tokens_in, tokens_out, tasks, meta }
 */
router.post('/event', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase not configured' });
  }

  const { workspace_id, user_id, kind, tokens_in = 0, tokens_out = 0, tasks = 0, meta } = req.body || {};

  if (!kind) {
    return res.status(400).json({ ok: false, error: 'kind is required (ai, task, db, etc.)' });
  }

  if (!workspace_id && !user_id) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Either workspace_id or user_id is required' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('usage_events')
      .insert({
        workspace_id: workspace_id || null,
        user_id: user_id || null,
        kind,
        tokens_in: parseInt(tokens_in, 10) || 0,
        tokens_out: parseInt(tokens_out, 10) || 0,
        tasks: parseInt(tasks, 10) || 0,
        meta: meta || null
      })
      .select()
      .single();

    if (error) {
      console.error('[Usage] Event error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({ ok: true, event: data });
  } catch (err) {
    console.error('[Usage] Event exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
