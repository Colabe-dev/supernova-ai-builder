create index if not exists ent_coins_ledger_profile_created_idx on ent_coins_ledger(profile_id, created_at desc);
create unique index if not exists ent_coins_ledger_external_ref_uq on ent_coins_ledger(external_ref) where external_ref is not null;
create index if not exists ent_subscriptions_profile_status_idx on ent_subscriptions(profile_id, status);
