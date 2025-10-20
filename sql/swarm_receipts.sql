-- Swarm Receipts table - logs every AI action with inputs/outputs for replay
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'edit', 'command', 'test', 'fix')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'applied', 'ok', 'fail', 'skipped')),
  path TEXT,
  diff TEXT,
  input JSONB,
  output JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_room ON receipts(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_kind ON receipts(kind);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
