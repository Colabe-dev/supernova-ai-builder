import { Router } from 'express';
import { supabaseConnector } from '../orchestrator/roles/supabase-connector.js';
import { bootstrapDatabase } from '../integrations/supabase.js';

const router = Router();

router.post('/api/supabase/connect', async (req, res) => {
  try {
    const { url, anonKey, serviceRole } = req.body;

    if (!url || !anonKey || !serviceRole) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: url, anonKey, serviceRole',
      });
    }

    const result = await supabaseConnector({
      mode: 'connect',
      url,
      anonKey,
      serviceRole,
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e.message || String(e),
    });
  }
});

router.post('/api/supabase/provision', async (req, res) => {
  try {
    const { orgId, region, dbPassword, accessToken } = req.body;

    if (!orgId || !region || !dbPassword || !accessToken) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: orgId, region, dbPassword, accessToken',
      });
    }

    const result = await supabaseConnector({
      mode: 'provision',
      orgId,
      region,
      dbPassword,
      accessToken,
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e.message || String(e),
    });
  }
});

router.post('/api/supabase/bootstrap', async (req, res) => {
  try {
    const result = await bootstrapDatabase();

    if (!result.ok) {
      return res.status(500).json(result);
    }

    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e.message || String(e),
    });
  }
});

export default router;
