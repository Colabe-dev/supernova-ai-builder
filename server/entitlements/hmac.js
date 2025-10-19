/**
 * HMAC signature verification for webhooks
 */

import crypto from 'crypto';

/**
 * Verify HMAC-SHA256 signature
 * @param {Buffer|string} payload - Raw request body
 * @param {string} signature - Signature from header (e.g., "sha256=<hash>")
 * @param {string} secret - Webhook secret
 * @returns {boolean} - True if signature is valid
 */
export function verifyHMAC(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  try {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Support both "sha256=<hash>" and "<hash>" formats
    const provided = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    // Validate hex format and length before timingSafeEqual
    if (!/^[0-9a-fA-F]+$/.test(provided) || provided.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(provided, 'hex')
    );
  } catch (err) {
    // Defensively handle any malformed signature errors
    return false;
  }
}
