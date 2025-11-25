import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

test('processes a signed Collab Pay webhook using the raw body', async (t) => {
  const originalSecret = process.env.COLLAB_PAY_WEBHOOK_SECRET;
  process.env.COLLAB_PAY_WEBHOOK_SECRET = 'test-secret';

  const grantSubscriptionMock = mock.fn(async () => ({}));
  const grantCoinsMock = mock.fn(async () => ({}));
  const loggerInfoMock = mock.fn(() => {});
  const loggerWarnMock = mock.fn(() => {});
  const loggerErrorMock = mock.fn(() => {});

  const { PRODUCTS } = await import('../billing/products.js');
  const {
    default: webhooksRouter,
    __setWebhookDependencies,
    __resetWebhookDependencies,
  } = await import('./webhooks-enhanced.js');

  __setWebhookDependencies({
    grantSubscription: grantSubscriptionMock,
    grantCoins: grantCoinsMock,
    logger: {
      info: loggerInfoMock,
      warn: loggerWarnMock,
      error: loggerErrorMock,
    },
  });

  t.after(() => {
    process.env.COLLAB_PAY_WEBHOOK_SECRET = originalSecret;
    __resetWebhookDependencies();
    mock.reset();
  });

  const app = express();
  app.use('/api/webhooks', webhooksRouter);

  const server = await new Promise(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);
  const { port } = address;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const { sku: productSku, entitlements } = PRODUCTS.PRO_YEARLY;

  const body = JSON.stringify({
    event: 'payment.succeeded',
    data: {
      amount_cents: 4900,
      currency: 'usd',
      product: productSku,
      metadata: {
        profileId: 'profile-123',
      },
    },
  });

  const signaturePayload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', process.env.COLLAB_PAY_WEBHOOK_SECRET)
    .update(signaturePayload)
    .digest('hex');

  let response;
  let responseText;

  try {
    response = await fetch(`http://127.0.0.1:${port}/api/webhooks/collab-pay`, {
      method: 'POST',
      headers: {
        'x-collab-timestamp': timestamp,
        'x-collab-signature': `sha256=${signature}`,
        'x-collab-id': 'evt_test_123',
        'content-type': 'application/json',
      },
      body,
    });

    responseText = await response.text();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  assert.equal(response.status, 200, `Unexpected response: ${response.status} ${responseText}`);
  const json = JSON.parse(responseText);

  assert.deepEqual(json, {
    ok: true,
    granted: entitlements,
  });

  assert.equal(grantSubscriptionMock.mock.calls.length, 1);
  assert.equal(grantCoinsMock.mock.calls.length, 1);
});

test('createApp preserves raw body parsing for signed Collab Pay webhook', async (t) => {
  const originalSecret = process.env.COLLAB_PAY_WEBHOOK_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.COLLAB_PAY_WEBHOOK_SECRET = 'test-secret';

  const grantSubscriptionMock = mock.fn(async () => ({}));
  const grantCoinsMock = mock.fn(async () => ({}));
  const loggerInfoMock = mock.fn(() => {});
  const loggerWarnMock = mock.fn(() => {});
  const loggerErrorMock = mock.fn(() => {});

  const { PRODUCTS } = await import('../billing/products.js');
  const {
    __setWebhookDependencies,
    __resetWebhookDependencies,
  } = await import('./webhooks-enhanced.js');

  __setWebhookDependencies({
    grantSubscription: grantSubscriptionMock,
    grantCoins: grantCoinsMock,
    logger: {
      info: loggerInfoMock,
      warn: loggerWarnMock,
      error: loggerErrorMock,
    },
  });

  t.after(() => {
    process.env.COLLAB_PAY_WEBHOOK_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
    __resetWebhookDependencies();
    mock.reset();
  });

  const { createApp } = await import('../index.ts');
  const app = createApp();

  const server = await new Promise(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);
  const { port } = address;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const { sku: productSku, entitlements } = PRODUCTS.PRO_YEARLY;

  const body = JSON.stringify({
    event: 'payment.succeeded',
    data: {
      amount_cents: 4900,
      currency: 'usd',
      product: productSku,
      metadata: {
        profileId: 'profile-123',
      },
    },
  });

  const signaturePayload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', process.env.COLLAB_PAY_WEBHOOK_SECRET)
    .update(signaturePayload)
    .digest('hex');

  let response;
  let responseText;

  try {
    response = await fetch(`http://127.0.0.1:${port}/api/webhooks/collab-pay`, {
      method: 'POST',
      headers: {
        'x-collab-timestamp': timestamp,
        'x-collab-signature': `sha256=${signature}`,
        'x-collab-id': 'evt_test_456',
        'content-type': 'application/json',
      },
      body,
    });

    responseText = await response.text();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  assert.equal(response.status, 200, `Unexpected response: ${response.status} ${responseText}`);
  const json = JSON.parse(responseText);

  assert.deepEqual(json, {
    ok: true,
    granted: entitlements,
  });

  assert.equal(grantSubscriptionMock.mock.calls.length, 1);
  assert.equal(grantCoinsMock.mock.calls.length, 1);
});
