import { Router } from 'express';
import { healthCheck, isSupabaseConfigured } from '../integrations/supabase.js';

const router = Router();

router.get('/api/db/health', async (_req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      ok: false,
      error: 'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables.',
    });
  }

  const result = await healthCheck();

  if (!result.ok) {
    return res.status(500).json(result);
  }

  return res.json(result);
});

export default router;
