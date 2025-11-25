/**
 * Collab Pay Checkout Session Creation
 * Handles checkout URL generation with metadata
 */

import { logger } from '../observability/index.js';
import { PRODUCTS } from './products.js';

const COLLAB_PAY_BASE_URL = process.env.COLLAB_PAY_API_BASE || 'https://api.collabpay.io';
const COLLAB_PAY_SECRET = process.env.COLLAB_PAY_SECRET;

/**
 * Create a checkout session for a product
 * @param {string} productKey - Key from PRODUCTS
 * @param {string} profileId - User profile ID
 * @param {object} options - Additional options (successUrl, cancelUrl, metadata)
 * @returns {Promise<{checkoutUrl: string, sessionId: string}>}
 */
export async function createCheckoutSession(productKey, profileId, options = {}) {
  const product = PRODUCTS[productKey];

  if (!product) {
    throw new Error(`Invalid product key: ${productKey}`);
  }

  if (!COLLAB_PAY_SECRET) {
    throw new Error('COLLAB_PAY_SECRET not configured');
  }

  const {
    successUrl,
    cancelUrl,
    metadata = {},
    appUrl,
    req,
  } = options;

  const hostFromRequest = req?.get?.('host');
  const requestProtocol = req?.protocol;

  const inferredAppUrl = appUrl || (hostFromRequest && requestProtocol
    ? `${requestProtocol}://${hostFromRequest}`
    : undefined);

  const baseAppUrl = process.env.APP_URL || inferredAppUrl;

  if (!baseAppUrl) {
    throw new Error('APP_URL is not configured. Set the APP_URL environment variable or ensure the request includes protocol and host information.');
  }

  const normalizedAppUrl = baseAppUrl.replace(/\/+$/, '');

  const resolvedSuccessUrl = successUrl || `${normalizedAppUrl}/dashboard?payment=success`;
  const resolvedCancelUrl = cancelUrl || `${normalizedAppUrl}/pricing?payment=cancelled`;

  // Build checkout request
  const payload = {
    product_sku: product.sku,
    customer_id: profileId,
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
    metadata: {
      profileId,
      productKey,
      ...metadata,
    },
  };

  try {
    const response = await fetch(`${COLLAB_PAY_BASE_URL}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COLLAB_PAY_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Checkout session creation failed');
      throw new Error(`Checkout failed: ${response.status}`);
    }

    const data = await response.json();
    
    logger.info({ 
      profileId, 
      productKey, 
      sessionId: data.session_id 
    }, 'Checkout session created');

    return {
      checkoutUrl: data.checkout_url,
      sessionId: data.session_id,
    };
  } catch (err) {
    logger.error({ err, productKey, profileId }, 'Error creating checkout session');
    throw err;
  }
}

/**
 * Get product pricing for display
 */
export function getPricingData() {
  return Object.entries(PRODUCTS)
    .filter(([key]) => key.startsWith('PRO_'))
    .map(([key, product]) => ({
      id: key,
      name: product.name,
      price: product.price / 100, // Convert to dollars
      currency: product.currency,
      interval: product.interval,
      features: Object.entries(product.features).map(([k, v]) => ({
        key: k,
        value: v,
      })),
    }));
}
