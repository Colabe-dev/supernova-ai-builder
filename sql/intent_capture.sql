-- Intent Capture & Project Graph Schema
-- Self-healing intent system for intelligent impact analysis

CREATE TABLE IF NOT EXISTS intent_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_action TEXT NOT NULL,
  user_intent TEXT,
  context_before JSONB,
  context_after JSONB,
  confidence_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'file', 'component', 'api', 'data_model'
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- 'imports', 'calls', 'references', 'styles', 'depends_on'
  coupling_strength FLOAT DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, source_type, source_id, target_type, target_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS impact_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  intent_capture_id UUID REFERENCES intent_captures(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'breaking_change', 'performance', 'security'
  description TEXT NOT NULL,
  severity INTEGER CHECK (severity >= 1 AND severity <= 10),
  affected_components JSONB, -- Array of affected items
  auto_fix_suggestion JSONB,
  confidence FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intent_room_id ON intent_captures(room_id);
CREATE INDEX IF NOT EXISTS idx_intent_created ON intent_captures(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dependencies_room_id ON project_dependencies(room_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON project_dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON project_dependencies(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_predictions_intent ON impact_predictions(intent_capture_id);
CREATE INDEX IF NOT EXISTS idx_predictions_room ON impact_predictions(room_id);
CREATE INDEX IF NOT EXISTS idx_predictions_severity ON impact_predictions(severity DESC);
