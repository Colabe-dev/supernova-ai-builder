import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const router = Router();
const rl = rateLimit({ windowMs: 60_000, limit: 120 });

// Native Postgres pool for database operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST /api/rooms/:id/shares - Create share link
router.post('/api/rooms/:id/shares', rl, async (req, res) => {
  try {
    const { can_write = false, expires_at = null, created_by = null } = req.body || {};
    const raw = 'snr_' + crypto.randomBytes(24).toString('base64url');
    const last4 = raw.slice(-4);
    const token_hint = raw.slice(0, 8);
    const token_hash = await bcrypt.hash(raw, 12);

    const result = await pool.query(
      `INSERT INTO room_shares (room_id, token_hash, token_hint, last4, can_write, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, last4, can_write, expires_at`,
      [req.params.id, token_hash, token_hint, last4, can_write, expires_at, created_by]
    );

    const data = result.rows[0];
    const origin = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');

    res.json({
      ok: true,
      id: data.id,
      last4: data.last4,
      link: `${origin}/r/${raw}`,
      can_write: data.can_write,
      expires_at: data.expires_at
    });
  } catch (err) {
    console.error('[Rooms Share] Create exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/rooms/:id/shares - List shares for a room
router.get('/api/rooms/:id/shares', rl, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, last4, can_write, expires_at, created_at, revoked_at
       FROM room_shares
       WHERE room_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ ok: true, shares: result.rows });
  } catch (err) {
    console.error('[Rooms Share] List exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/rooms/:id/shares/:sid - Revoke a share
router.delete('/api/rooms/:id/shares/:sid', rl, async (req, res) => {
  try {
    await pool.query(
      'UPDATE room_shares SET revoked_at = NOW() WHERE id = $1',
      [req.params.sid]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[Rooms Share] Revoke exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/rooms/share/:token/messages - Public access via share token
router.get('/api/rooms/share/:token/messages', rl, async (req, res) => {
  try {
    const token = req.params.token;

    if (!token || token.length < 16) {
      return res.status(400).json({ ok: false, error: 'invalid token' });
    }

    const hint = token.slice(0, 8);

    // Find candidate shares by hint
    const candidates = await pool.query(
      `SELECT id, room_id, token_hash, can_write, expires_at, revoked_at
       FROM room_shares
       WHERE token_hint = $1
       LIMIT 20`,
      [hint]
    );

    // Verify token with bcrypt
    let match = null;
    for (const row of candidates.rows) {
      const ok = await bcrypt.compare(token, row.token_hash).catch(() => false);
      if (ok) {
        match = row;
        break;
      }
    }

    if (!match) {
      return res.status(404).json({ ok: false, error: 'not found' });
    }

    if (match.revoked_at) {
      return res.status(403).json({ ok: false, error: 'revoked' });
    }

    if (match.expires_at && new Date(match.expires_at) < new Date()) {
      return res.status(403).json({ ok: false, error: 'expired' });
    }

    // Fetch room and messages
    const room = await pool.query(
      'SELECT id, name, created_at FROM rooms WHERE id = $1',
      [match.room_id]
    );

    const messages = await pool.query(
      `SELECT role, type, text, payload, ts
       FROM room_messages
       WHERE room_id = $1
       ORDER BY ts ASC
       LIMIT 2000`,
      [match.room_id]
    );

    res.json({
      ok: true,
      room: room.rows[0] || null,
      messages: messages.rows || []
    });
  } catch (err) {
    console.error('[Rooms Share] Access exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/rooms/:id/export.md - Export room to Markdown
router.get('/api/rooms/:id/export.md', rl, async (req, res) => {
  try {
    const room = await pool.query(
      'SELECT id, name, created_at FROM rooms WHERE id = $1',
      [req.params.id]
    );

    const messages = await pool.query(
      `SELECT role, type, text, payload, ts
       FROM room_messages
       WHERE room_id = $1
       ORDER BY ts ASC
       LIMIT 5000`,
      [req.params.id]
    );

    const lines = [];
    lines.push(`# Room: ${room.rows[0]?.name || req.params.id}`);
    lines.push('');

    for (const m of messages.rows) {
      const ts = new Date(m.ts).toISOString();
      lines.push(`- **${m.role || m.type || 'note'}** · ${ts}`);
      const body = (m.text || m.payload?.text || m.payload?.stderr || m.payload?.stdout || '');
      if (body) {
        lines.push('\n```\n' + String(body).slice(0, 8000) + '\n```\n');
      }
    }

    const md = lines.join('\n');
    res.setHeader('content-type', 'text/markdown; charset=utf-8');
    res.setHeader('content-disposition', `attachment; filename="room-${req.params.id}.md"`);
    res.send(md);
  } catch (err) {
    console.error('[Rooms Share] Export exception:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
