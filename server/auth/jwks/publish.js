import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const r = Router();
const JWKS_DIR = process.env.JWKS_DIR || path.join(process.cwd(), 'server', 'auth', 'jwks', 'keys');
const JWKS_PATH = path.join(JWKS_DIR, 'jwks.json');

r.get('/.well-known/jwks.json', (req, res) => {
  try {
    // Serve keys from jwks.json if it exists
    if (fs.existsSync(JWKS_PATH)) {
      const jwks = JSON.parse(fs.readFileSync(JWKS_PATH, 'utf8'));
      return res.json(jwks);
    }
  } catch (e) {
    console.error('Error reading JWKS:', e);
  }
  
  // Fallback: empty key set (for dev before keys are generated)
  return res.json({ keys: [] });
});

export default r;
