#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as jose from 'jose';

const JWKS_DIR = process.env.JWKS_DIR || path.join(process.cwd(), 'server', 'auth', 'jwks', 'keys');
const kid = String(Date.now());

console.log('Generating RS256 keypair...');

// Generate RS256 keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Create key directory
const keyDir = path.join(JWKS_DIR, kid);
if (!fs.existsSync(keyDir)) {
  fs.mkdirSync(keyDir, { recursive: true });
}

// Write keys
fs.writeFileSync(path.join(keyDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keyDir, 'public.pem'), publicKey);

console.log(`✓ Generated keypair with kid=${kid}`);
console.log(`  Private: ${path.join(keyDir, 'private.pem')}`);
console.log(`  Public:  ${path.join(keyDir, 'public.pem')}`);

// Generate JWK from public key
async function generateJWKS() {
  const publicKeyObj = await jose.importSPKI(publicKey, 'RS256');
  const jwk = await jose.exportJWK(publicKeyObj);
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  // Read existing JWKS or create new
  const jwksPath = path.join(JWKS_DIR, 'jwks.json');
  let jwks = { keys: [] };
  
  if (fs.existsSync(jwksPath)) {
    try {
      jwks = JSON.parse(fs.readFileSync(jwksPath, 'utf8'));
    } catch (e) {
      console.warn('Warning: Could not parse existing jwks.json, creating new one');
    }
  }

  // Add new key to the set
  jwks.keys.push(jwk);

  // Write updated JWKS
  fs.writeFileSync(jwksPath, JSON.stringify(jwks, null, 2));
  console.log(`✓ Updated ${jwksPath}`);
  console.log(`  Total keys in set: ${jwks.keys.length}`);
}

await generateJWKS();

console.log('\n✅ JWKS rotation complete');
console.log('\n⚠️  SECURITY WARNING: Private keys are stored locally and excluded from git.');
console.log('    Generate new keys for each environment (dev/staging/production).');
console.log('\nNext steps:');
console.log('  1. Restart your server to pick up the new key');
console.log(`  2. Verify JWKS endpoint: curl http://localhost:5000/auth/.well-known/jwks.json`);
console.log('  3. For production: Set up automated key rotation and secure key storage');
