create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now());
create table if not exists ent_coins_balance (profile_id text primary key, balance bigint not null default 0);
create table if not exists ent_coins_ledger (
  id bigserial primary key,
  profile_id text not null,
  amount bigint not null,
  reason text,
  source text,
  external_ref text,
  created_at timestamptz not null default now()
);
create table if not exists ent_subscriptions (
  profile_id text not null,
  plan text not null,
  status text not null check (status in ('active','cancelled')),
  started_at timestamptz not null default now(),
  renewed_at timestamptz,
  cancelled_at timestamptz,
  source text,
  primary key (profile_id, plan)
);
