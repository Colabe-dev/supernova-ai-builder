#!/usr/bin/env node
import fs from 'fs'; import path from 'path'; import * as jose from 'jose';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.startsWith('--') ? a.slice(2).split('=') : [a, true]));
const sub = args.sub || args.s || null;
const ttl = Number(args.ttl || 3600);
const roles = (args.roles || '').split(',').filter(Boolean);
const ISS = process.env.AUTH_ISSUER || 'https://collab.supernova.auth';
const AUD = process.env.AUTH_AUDIENCE || 'supernova-api';
const JWKS_DIR = process.env.JWKS_DIR || path.join(process.cwd(), 'server', 'auth', 'jwks', 'keys');

if (!sub) { console.error('Usage: mint-jwt --sub <id> [--roles a,b] [--ttl 3600]'); process.exit(1); }

function latestKeyDir(){
  const kids = fs.readdirSync(JWKS_DIR).filter(x => x !== 'jwks.json');
  let latest = kids[0], latestTime = 0;
  for (const k of kids){
    const t = fs.statSync(path.join(JWKS_DIR, k)).mtimeMs;
    if (t > latestTime){ latest = k; latestTime = t; }
  }
  return latest;
}

const kid = latestKeyDir();
const priv = fs.readFileSync(path.join(JWKS_DIR, kid, 'private.pem'), 'utf8');
const pk = await jose.importPKCS8(priv, 'RS256');
const now = Math.floor(Date.now()/1000);
const exp = now + ttl;
const jwt = await new jose.SignJWT({ sub, roles, iss: ISS, aud: AUD, iat: now, exp })
  .setProtectedHeader({ alg:'RS256', kid })
  .setIssuer(ISS).setAudience(AUD).setIssuedAt(now).setExpirationTime(exp).sign(pk);

console.log(jwt);
