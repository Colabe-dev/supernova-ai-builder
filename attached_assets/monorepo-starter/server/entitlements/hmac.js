import crypto from 'crypto';
export function verifyHmacSHA256(rawBody, signature, secret){
  if (!secret) return true;
  if (!signature) return false;
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signature));
}
