import * as jose from 'jose';
const DEV_OPEN = process.env.DEV_AUTH_OPEN === 'true';
const ISSUER = process.env.AUTH_ISSUER || 'https://collab.supernova.auth';
const AUDIENCE = process.env.AUTH_AUDIENCE || 'supernova-api';
let jwksRemote;
function getJwks(){
  const url = process.env.AUTH_JWKS_URL;
  if (!url) throw new Error('AUTH_JWKS_URL not set');
  if (!jwksRemote) jwksRemote = jose.createRemoteJWKSet(new URL(url), { cacheMaxAge: 5 * 60 * 1000 });
  return jwksRemote;
}
export async function verifyJwt(token){
  const jwks = getJwks();
  const { payload } = await jose.jwtVerify(token, jwks, { issuer: ISSUER, audience: AUDIENCE, clockTolerance: 5 });
  return payload;
}
export function parseAuthJwks(req, _res, next){
  (async () => {
    try {
      const h = req.headers.authorization || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (!token) { if (DEV_OPEN) return next(); return next(); }
      req.user = await verifyJwt(token);
      next();
    } catch (_e) { next(); }
  })();
}
export function requireAuth(opts = {}){
  const roles = opts.roles || [];
  return (req, res, next) => {
    if (DEV_OPEN) return next();
    const u = req.user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (roles.length && !roles.some(r => (u.roles || []).includes(r))) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}
