import pg from 'pg';

const { Pool } = pg;

// Native Postgres pool for database operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Log a receipt for an AI action with inputs/outputs for replay
 * @param {Object} params
 * @param {string} params.roomId - Room ID
 * @param {string} params.kind - Receipt kind: 'plan' | 'edit' | 'command' | 'test' | 'fix'
 * @param {string} params.status - Receipt status: 'planned' | 'applied' | 'ok' | 'fail' | 'skipped'
 * @param {string} [params.path] - File path for edits
 * @param {string} [params.diff] - Unified diff for edits
 * @param {Object} [params.input] - Input data (serialized to JSON)
 * @param {Object} [params.output] - Output data (serialized to JSON)
 */
export async function logReceipt({ roomId, kind, status, path, diff, input, output }) {
  try {
    const result = await pool.query(
      `INSERT INTO receipts (room_id, kind, status, path, diff, input, output)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        roomId,
        kind,
        status,
        path || null,
        diff || null,
        input ? JSON.stringify(input) : null,
        output ? JSON.stringify(output) : null
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to log receipt:', error);
    // Don't throw - receipt logging should not break the main flow
    return null;
  }
}
