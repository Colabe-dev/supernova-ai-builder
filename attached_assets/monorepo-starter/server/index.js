import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

import { config } from './env/index.js';
import { applyObservability, errorHandler } from './observability/index.js';

import jwksRouter from './auth/jwks/publish.js';
import entitlementsRoutes from './entitlements/routes.db.secpro.js';
import iapRoutes from './iap/routes.real.js';

const app = express();
app.use(bodyParser.json());

applyObservability(app);

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Design tokens (serve the monorepo root tokens)
const TOKENS_PATH = path.join(process.cwd(), '..', 'design.tokens.json');
app.get('/api/design/tokens', (_req, res) => {
  try {
    const json = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    res.json(json);
  } catch { res.json({ theme: { bg: '#0b1f3a', text: '#fff', primary: '#fec72e' } }); }
});

// Auth + APIs
app.use('/auth', jwksRouter);
app.use('/api', entitlementsRoutes);
app.use('/api/iap', iapRoutes);

// Error tail
app.use(errorHandler);

// Boot
const port = Number(config.PORT || 3001);
app.listen(port, () => console.log('Server listening on :' + port));
