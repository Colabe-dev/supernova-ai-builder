-- Core storage schema managed by DrizzleStorage

-- Projects catalog
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates catalog
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  thumbnail TEXT,
  tech_stack TEXT[] NOT NULL
);

-- Agent run history
CREATE TABLE IF NOT EXISTS agent_runs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  input TEXT,
  output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approval requests generated from agent runs
CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_run_id VARCHAR NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  files JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual diff approval snapshots
CREATE TABLE IF NOT EXISTS snapshots (
  id VARCHAR PRIMARY KEY,
  diff_id TEXT NOT NULL,
  path TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diff approval workflow state
CREATE TABLE IF NOT EXISTS diff_approvals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_ids TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  branch_name TEXT,
  pr_url TEXT,
  comment TEXT,
  submitted_by TEXT NOT NULL DEFAULT 'dev',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entitlements data (coins, subscriptions, purchases)
CREATE TABLE IF NOT EXISTS entitlements (
  profile_id VARCHAR PRIMARY KEY,
  coins JSONB NOT NULL DEFAULT '{"balance":0,"total":0}'::jsonb,
  subscriptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchases JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
