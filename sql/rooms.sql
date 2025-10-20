-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  workspace_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room messages table
CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  type TEXT NOT NULL CHECK (type IN ('text', 'code', 'error', 'system')),
  text TEXT,
  payload JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_workspace ON rooms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id, ts);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for development - tighten in production)
CREATE POLICY "Allow all operations on rooms" ON rooms
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on room_messages" ON room_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to authenticated users
GRANT ALL ON rooms TO authenticated;
GRANT ALL ON room_messages TO authenticated;
GRANT ALL ON rooms TO anon;
GRANT ALL ON room_messages TO anon;
