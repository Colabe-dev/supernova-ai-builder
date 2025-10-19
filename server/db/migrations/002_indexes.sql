-- Performance and idempotency indexes

-- Idempotency: unique external_ref when provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_external_ref 
  ON ent_ledger(external_ref) 
  WHERE external_ref IS NOT NULL;

-- Performance: lookup ledger by profile
CREATE INDEX IF NOT EXISTS idx_ledger_profile_id 
  ON ent_ledger(profile_id);

-- Performance: lookup subscriptions by profile
CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id 
  ON ent_subscriptions(profile_id);

-- Performance: lookup active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON ent_subscriptions(status) 
  WHERE status = 'active';
