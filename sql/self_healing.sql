-- Self-Healing Engine Database Schema
-- Tracks healing actions, executions, and intent debugger sessions

-- Healing actions and execution tracking
CREATE TABLE IF NOT EXISTS healing_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  intent_capture_id UUID REFERENCES intent_captures(id),
  prediction_id UUID REFERENCES impact_predictions(id),
  action_type TEXT NOT NULL, -- 'compatibility_layer', 'migration', 'fix', 'rollback', 'architectural_review'
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
  execution_plan JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS healing_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healing_action_id UUID REFERENCES healing_actions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS intent_debugger_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  trigger_action TEXT NOT NULL,
  user_intent TEXT NOT NULL,
  expected_behavior JSONB,
  actual_behavior JSONB,
  discrepancies JSONB,
  fixes_applied JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_healing_room ON healing_actions(room_id);
CREATE INDEX IF NOT EXISTS idx_healing_status ON healing_actions(status);
CREATE INDEX IF NOT EXISTS idx_healing_intent ON healing_actions(intent_capture_id);
CREATE INDEX IF NOT EXISTS idx_executions_healing ON healing_executions(healing_action_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON healing_executions(status);
CREATE INDEX IF NOT EXISTS idx_debugger_sessions_room ON intent_debugger_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_debugger_sessions_resolved ON intent_debugger_sessions(resolved_at);
