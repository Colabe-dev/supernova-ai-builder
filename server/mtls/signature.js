import crypto from 'crypto';

export function signRequest({ method, path, body = '', ts, keyId, secret }){
  const payload = [method.toUpperCase(), path, String(ts), body].join('\n');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  return `keyId=${keyId},ts=${ts},sig=${sig}`;
}

export function verifySignature({ method, path, body, ts, header, secret, skewSec = 300 }){
  try {
    // Parse header safely - split only on first '=' to handle base64 padding in signature
    const parts = {};
    String(header).split(',').forEach(pair => {
      const trimmed = pair.trim();
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx);
        const val = trimmed.slice(idx + 1);
        parts[key] = val;
      }
    });
    
    const now = Math.floor(Date.now()/1000);
    if (Math.abs(now - Number(parts.ts)) > skewSec) return false;
    const mine = signRequest({ method, path, body, ts: parts.ts, keyId: parts.keyId, secret });
    return mine.split('sig=')[1] === parts.sig;
  } catch { return false; }
}

export function requireSigned(secret){
  return (req, res, next) => {
    const hdr = req.headers['x-signature'];
    const ok = verifySignature({ method: req.method, path: req.originalUrl, body: JSON.stringify(req.body||''), ts: null, header: hdr, secret });
    if (!ok) return res.status(401).json({ error: 'bad_signature' });
    next();
  };
}
