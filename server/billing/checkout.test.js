import { test } from 'node:test';
import assert from 'node:assert/strict';

const originalSecret = process.env.COLLAB_PAY_SECRET;
process.env.COLLAB_PAY_SECRET = originalSecret ?? 'test_secret';

const { createCheckoutSession } = await import('./checkout.js');

if (originalSecret === undefined) {
  delete process.env.COLLAB_PAY_SECRET;
} else {
  process.env.COLLAB_PAY_SECRET = originalSecret;
}

const originalAppUrl = process.env.APP_URL;
const originalFetch = global.fetch;

test.afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.APP_URL;
  } else {
    process.env.APP_URL = originalAppUrl;
  }

  global.fetch = originalFetch;
});

test('uses APP_URL environment variable when provided', async () => {
  process.env.APP_URL = 'https://configured.app';

  let payload;
  global.fetch = async (url, options) => {
    payload = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ checkout_url: 'https://checkout', session_id: 'sess_123' }),
    };
  };

  const result = await createCheckoutSession('PRO_MONTHLY', 'profile_123', {
    metadata: { example: 'value' },
    appUrl: 'https://ignored.example',
  });

  assert.equal(payload.success_url, 'https://configured.app/dashboard?payment=success');
  assert.equal(payload.cancel_url, 'https://configured.app/pricing?payment=cancelled');
  assert.equal(result.checkoutUrl, 'https://checkout');
  assert.equal(result.sessionId, 'sess_123');
});

test('falls back to provided appUrl when APP_URL env is missing', async () => {
  delete process.env.APP_URL;

  let payload;
  global.fetch = async (url, options) => {
    payload = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ checkout_url: 'https://checkout', session_id: 'sess_456' }),
    };
  };

  const fallbackUrl = 'https://fallback.example/';

  const result = await createCheckoutSession('PRO_MONTHLY', 'profile_456', {
    metadata: {},
    appUrl: fallbackUrl,
  });

  assert.equal(payload.success_url, 'https://fallback.example/dashboard?payment=success');
  assert.equal(payload.cancel_url, 'https://fallback.example/pricing?payment=cancelled');
  assert.equal(result.sessionId, 'sess_456');
});

test('throws a configuration error when APP_URL cannot be determined', async () => {
  delete process.env.APP_URL;

  global.fetch = async () => {
    throw new Error('fetch should not be called when APP_URL is missing');
  };

  await assert.rejects(
    () => createCheckoutSession('PRO_MONTHLY', 'profile_789', { metadata: {} }),
    /APP_URL is not configured/
  );
});

test.after(() => {
  if (originalSecret === undefined) {
    delete process.env.COLLAB_PAY_SECRET;
  } else {
    process.env.COLLAB_PAY_SECRET = originalSecret;
  }
});
