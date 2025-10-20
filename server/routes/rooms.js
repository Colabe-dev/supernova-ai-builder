/**
 * Rooms API Routes
 * Handles room and message management for persistent chat transcripts
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase admin client for database operations
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

// GET /api/rooms - List all rooms
router.get('/', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const workspaceId = req.query.workspace_id || null;
    
    let query = supabase.from('rooms').select('*').order('created_at', { ascending: false });
    
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[Rooms] Fetch error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ rooms: data || [] });
  } catch (err) {
    console.error('[Rooms] Fetch exception:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// POST /api/rooms - Create a new room
router.post('/', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { name, workspace_id, created_by } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        workspace_id: workspace_id || null,
        created_by: created_by || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Rooms] Create error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.status(201).json({ room: data });
  } catch (err) {
    console.error('[Rooms] Create exception:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PATCH /api/rooms/:id - Rename a room
router.patch('/:id', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    const { data, error } = await supabase
      .from('rooms')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[Rooms] Update error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ room: data });
  } catch (err) {
    console.error('[Rooms] Update exception:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id - Delete a room
router.delete('/:id', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[Rooms] Delete error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Rooms] Delete exception:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET /api/rooms/:id/messages - Get room messages
router.get('/:id/messages', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const { data, error } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', id)
      .order('ts', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('[Rooms] Fetch messages error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ messages: data || [] });
  } catch (err) {
    console.error('[Rooms] Fetch messages exception:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/rooms/:id/messages - Add a message to a room
router.post('/:id/messages', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { id } = req.params;
    const { role, type, text, payload } = req.body;
    
    if (!role || !type) {
      return res.status(400).json({ error: 'Role and type are required' });
    }
    
    const { data, error } = await supabase
      .from('room_messages')
      .insert({
        room_id: id,
        role,
        type,
        text: text || null,
        payload: payload || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Rooms] Add message error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.status(201).json({ message: data });
  } catch (err) {
    console.error('[Rooms] Add message exception:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;
