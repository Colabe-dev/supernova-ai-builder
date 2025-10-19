-- Entitlements schema initialization
-- Balances, ledger, subscriptions, and migration tracking

-- Schema migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coin balances table (current state)
CREATE TABLE IF NOT EXISTS ent_balances (
  profile_id TEXT PRIMARY KEY,
  coins BIGINT NOT NULL DEFAULT 0,
  coins_total BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coin ledger (append-only transaction log)
CREATE TABLE IF NOT EXISTS ent_ledger (
  id BIGSERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  reason TEXT,
  source TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS ent_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, plan)
);
