import { Router } from 'express';
import fs from 'fs'; import path from 'path';
import * as jose from 'jose';

const r = Router();
const JWKS_DIR = process.env.JWKS_DIR || path.join(process.cwd(), 'server', 'auth', 'jwks', 'keys');
const ISS = process.env.AUTH_ISSUER || 'https://collab.supernova.auth';
const AUD = process.env.AUTH_AUDIENCE || 'supernova-api';
const ADMIN_SECRET = process.env.ISSUER_ADMIN_SECRET || '';

function latestKeyDir(){
  const p = JWKS_DIR;
  const kids = fs.existsSync(p) ? fs.readdirSync(p).filter(x => x !== 'jwks.json') : [];
  if (!kids.length) throw new Error('No keys found. Run tools/gen-jwks.mjs');
  // pick last mtime
  let latest = kids[0], latestTime = 0;
  for (const k of kids){
    const stat = fs.statSync(path.join(p, k));
    const t = stat.mtimeMs;
    if (t > latestTime){ latest = k; latestTime = t; }
  }
  return latest;
}

async function loadSigner(){
  const kid = latestKeyDir();
  const priv = fs.readFileSync(path.join(JWKS_DIR, kid, 'private.pem'), 'utf8');
  const pk = await jose.importPKCS8(priv, 'RS256');
  return { kid, pk };
}

function parseRoles(str){ if(!str) return []; return String(str).split(',').map(s => s.trim()).filter(Boolean); }

r.post('/token', async (req, res) => {
  try {
    const hdr = req.headers['x-issuer-secret'] || '';
    if (!ADMIN_SECRET || hdr !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });

    const { sub, roles, ttl, extra } = req.body || {};
    if (!sub) return res.status(400).json({ error: 'missing sub' });
    const now = Math.floor(Date.now()/1000);
    const exp = now + Number(ttl || process.env.DEFAULT_TTL || 3600);
    const { kid, pk } = await loadSigner();
    const payload = { sub, roles: Array.isArray(roles) ? roles : parseRoles(roles), iss: ISS, aud: AUD, iat: now, exp, ...(extra || {}) };
    const jwt = await new jose.SignJWT(payload).setProtectedHeader({ alg:'RS256', kid }).setIssuer(ISS).setAudience(AUD).setIssuedAt(now).setExpirationTime(exp).sign(pk);
    res.json({ ok: true, token: jwt, kid, exp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;
