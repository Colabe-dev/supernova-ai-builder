/**
 * Postgres-backed entitlements database layer
 * Handles coins (with append-only ledger) and subscriptions
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Get entitlements for a profile
 * @param {string} profileId
 * @returns {Promise<{coins: {balance: number, total: number}, subscriptions: Array}>}
 */
export async function getEntitlements(profileId) {
  const client = await pool.connect();
  try {
    // Get coin balance
    const balanceResult = await client.query(
      'SELECT coins, coins_total FROM ent_balances WHERE profile_id = $1',
      [profileId]
    );

    const coins = balanceResult.rows[0] || { coins: 0, coins_total: 0 };

    // Get active subscriptions
    const subsResult = await client.query(
      `SELECT plan, status, started_at, cancelled_at 
       FROM ent_subscriptions 
       WHERE profile_id = $1 
       ORDER BY started_at DESC`,
      [profileId]
    );

    return {
      coins: {
        balance: Number(coins.coins || 0),
        total: Number(coins.coins_total || 0),
      },
      subscriptions: subsResult.rows.map(row => ({
        plan: row.plan,
        status: row.status,
        startedAt: row.started_at,
        cancelledAt: row.cancelled_at,
      })),
    };
  } finally {
    client.release();
  }
}

/**
 * Grant coins to a profile (with idempotency via externalRef)
 * @param {string} profileId
 * @param {number} amount - Amount in coins (positive integer)
 * @param {string} reason - Grant reason (e.g., 'iap', 'manual', 'webhook')
 * @param {string} source - Source system (e.g., 'google', 'apple', 'admin')
 * @param {string} externalRef - Optional idempotency key
 * @returns {Promise<{balance: number, total: number}>}
 */
export async function grantCoins(profileId, amount, reason, source, externalRef = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check idempotency - if externalRef exists, return existing state
    if (externalRef) {
      const existingResult = await client.query(
        'SELECT * FROM ent_ledger WHERE external_ref = $1',
        [externalRef]
      );
      
      if (existingResult.rows.length > 0) {
        // Already processed - return current balance
        await client.query('COMMIT');
        const balance = await getEntitlements(profileId);
        return balance.coins;
      }
    }

    // Insert ledger entry
    await client.query(
      `INSERT INTO ent_ledger (profile_id, amount, reason, source, external_ref)
       VALUES ($1, $2, $3, $4, $5)`,
      [profileId, amount, reason, source, externalRef]
    );

    // Upsert balance
    await client.query(
      `INSERT INTO ent_balances (profile_id, coins, coins_total, updated_at)
       VALUES ($1, $2, $2, NOW())
       ON CONFLICT (profile_id) DO UPDATE SET
         coins = ent_balances.coins + $2,
         coins_total = ent_balances.coins_total + $2,
         updated_at = NOW()`,
      [profileId, amount]
    );

    await client.query('COMMIT');

    // Return updated balance
    const balanceResult = await client.query(
      'SELECT coins, coins_total FROM ent_balances WHERE profile_id = $1',
      [profileId]
    );

    return {
      balance: Number(balanceResult.rows[0].coins),
      total: Number(balanceResult.rows[0].coins_total),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Grant/activate a subscription for a profile
 * @param {string} profileId
 * @param {string} plan - Subscription plan name
 * @returns {Promise<{plan: string, status: string, startedAt: Date}>}
 */
export async function grantSubscription(profileId, plan) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert subscription
    const result = await client.query(
      `INSERT INTO ent_subscriptions (profile_id, plan, status, started_at, updated_at)
       VALUES ($1, $2, 'active', NOW(), NOW())
       ON CONFLICT (profile_id, plan) DO UPDATE SET
         status = 'active',
         cancelled_at = NULL,
         updated_at = NOW()
       RETURNING plan, status, started_at`,
      [profileId, plan]
    );

    await client.query('COMMIT');

    return {
      plan: result.rows[0].plan,
      status: result.rows[0].status,
      startedAt: result.rows[0].started_at,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Revoke/cancel a subscription for a profile
 * @param {string} profileId
 * @param {string} plan - Subscription plan name
 * @returns {Promise<{plan: string, status: string, cancelledAt: Date}>}
 */
export async function revokeSubscription(profileId, plan) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE ent_subscriptions 
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE profile_id = $1 AND plan = $2
       RETURNING plan, status, cancelled_at`,
      [profileId, plan]
    );

    if (result.rows.length === 0) {
      throw new Error(`Subscription not found: ${plan} for profile ${profileId}`);
    }

    return {
      plan: result.rows[0].plan,
      status: result.rows[0].status,
      cancelledAt: result.rows[0].cancelled_at,
    };
  } finally {
    client.release();
  }
}

/**
 * Get purchase history from ledger
 * @param {string} profileId
 * @returns {Promise<Array>}
 */
export async function getPurchaseHistory(profileId) {
  const result = await pool.query(
    `SELECT amount, reason, source, external_ref, created_at
     FROM ent_ledger
     WHERE profile_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [profileId]
  );

  return result.rows.map(row => ({
    amount: Number(row.amount),
    reason: row.reason,
    source: row.source,
    externalRef: row.external_ref,
    timestamp: row.created_at,
  }));
}
