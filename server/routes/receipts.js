import { Router } from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = Router();

// Native Postgres pool for database operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/receipts?roomId=:roomId - List receipts for a room
 */
router.get('/', async (req, res) => {
  const { roomId } = req.query;
  
  if (!roomId) {
    return res.status(400).json({ error: 'roomId query parameter required' });
  }
  
  try {
    const result = await pool.query(
      `SELECT id, room_id, kind, status, path, created_at
       FROM receipts
       WHERE room_id = $1
       ORDER BY created_at DESC`,
      [roomId]
    );
    
    res.json({ receipts: result.rows });
  } catch (error) {
    console.error('Failed to fetch receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

/**
 * GET /api/receipts/:id - Get receipt details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT id, room_id, kind, status, path, diff, input, output, created_at
       FROM receipts
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

/**
 * POST /api/receipts/:id/rerun - Re-run a receipt
 * Supports re-applying edits, re-executing commands/tests
 */
router.post('/:id/rerun', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Fetch the receipt
    const result = await pool.query(
      `SELECT id, room_id, kind, status, path, diff, input, output
       FROM receipts
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const receipt = result.rows[0];
    
    // For now, return the receipt data so the client can handle re-execution
    // TODO: Implement actual re-execution logic based on kind
    res.json({
      message: 'Receipt re-run initiated',
      receipt: {
        id: receipt.id,
        kind: receipt.kind,
        status: receipt.status,
        path: receipt.path,
        diff: receipt.diff,
        input: receipt.input,
        output: receipt.output
      }
    });
  } catch (error) {
    console.error('Failed to rerun receipt:', error);
    res.status(500).json({ error: 'Failed to rerun receipt' });
  }
});

export default router;
