import * as jose from 'jose';
import { fetch } from 'undici';

const APPLE_JWKS_URL = 'https://api.storekit.itunes.apple.com/inApps/v1/jwsApplePublicKeys';

let jwks;
async function getAppleJWKS(){
  if (!jwks) {
    const res = await fetch(APPLE_JWKS_URL);
    const data = await res.json();
    jwks = jose.createLocalJWKSet({ keys: data.keys });
  }
  return jwks;
}

export async function verifyAppleSignedPayload(signedPayload){
  const jwkset = await getAppleJWKS();
  const { payload, protectedHeader } = await jose.compactVerify(signedPayload, jwkset);
  const claims = JSON.parse(new TextDecoder().decode(payload));
  return { ok: true, header: protectedHeader, claims };
}

// Legacy verifyReceipt (fallback). Apple is deprecating; prefer signedPayload.
export async function verifyAppleLegacyReceipt({ receiptData, password, useSandbox = true }){
  const url = useSandbox ? 'https://sandbox.itunes.apple.com/verifyReceipt' : 'https://buy.itunes.apple.com/verifyReceipt';
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'receipt-data': receiptData, password }) });
  const data = await res.json();
  const ok = data.status === 0;
  return { ok, raw: data };
}
