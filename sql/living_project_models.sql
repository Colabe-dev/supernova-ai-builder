-- Living Project Models (LPM) - Maintains evolving project architecture knowledge
CREATE TABLE IF NOT EXISTS living_project_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  project_model JSONB NOT NULL DEFAULT '{
    "tech_stack": [],
    "data_models": {},
    "user_flows": {},
    "business_rules": {},
    "ui_components": {},
    "architecture": {}
  }'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(room_id)
);

-- Project Decisions Log - Tracks architectural decisions and rationale
CREATE TABLE IF NOT EXISTS project_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL, -- 'feature_analysis', 'architecture_choice', 'tech_stack', etc.
  description TEXT NOT NULL,
  rationale TEXT,
  impact_analysis JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lpm_room_id ON living_project_models(room_id);
CREATE INDEX IF NOT EXISTS idx_decisions_room_id ON project_decisions(room_id);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON project_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON project_decisions(created_at DESC);

COMMENT ON TABLE living_project_models IS 'Maintains an evolving model of each project''s architecture, tech stack, and business rules';
COMMENT ON TABLE project_decisions IS 'Logs architectural decisions with rationale and impact analysis for future reference';
