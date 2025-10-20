/**
 * Rooms API Routes
 * Handles room and message management for persistent chat transcripts
 */

import { Router } from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = Router();

// Native Postgres pool for database operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/rooms - List all rooms
router.get('/', async (req, res) => {
  try {
    const workspaceId = req.query.workspace_id || null;
    
    let query = 'SELECT * FROM rooms';
    let params = [];
    
    if (workspaceId) {
      query += ' WHERE workspace_id = $1';
      params = [workspaceId];
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error('[Rooms] Fetch exception:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// POST /api/rooms - Create a new room
router.post('/', async (req, res) => {
  try {
    const { name, workspace_id, created_by } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO rooms (name, workspace_id, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, workspace_id || null, created_by || null]
    );
    
    res.status(201).json({ room: result.rows[0] });
  } catch (err) {
    console.error('[Rooms] Create exception:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PATCH /api/rooms/:id - Update room (rename)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    const result = await pool.query(
      'UPDATE rooms SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ room: result.rows[0] });
  } catch (err) {
    console.error('[Rooms] Update exception:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id - Delete room and all its messages
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete all messages first (foreign key cascade might handle this, but being explicit)
    await pool.query('DELETE FROM room_messages WHERE room_id = $1', [id]);
    
    // Delete the room
    const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ success: true, room: result.rows[0] });
  } catch (err) {
    console.error('[Rooms] Delete exception:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET /api/rooms/:id/messages - Get all messages in a room
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM room_messages WHERE room_id = $1 ORDER BY ts ASC',
      [id]
    );
    
    res.json({ messages: result.rows });
  } catch (err) {
    console.error('[Rooms] Fetch messages exception:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/rooms/:id/messages - Create a new message in a room
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, type, text, payload } = req.body;
    
    if (!role || !type) {
      return res.status(400).json({ error: 'role and type are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO room_messages (room_id, role, type, text, payload) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, role, type, text || '', payload ? JSON.stringify(payload) : null]
    );
    
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('[Rooms] Create message exception:', err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

export default router;
