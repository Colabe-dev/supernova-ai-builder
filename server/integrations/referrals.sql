-- Supernova Referral System Schema
-- Run this in your Supabase SQL Editor

-- Affiliates table
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  email text not null,
  created_at timestamptz default now()
);

-- Referral clicks table
create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliates(id) on delete cascade,
  clicked_at timestamptz default now(),
  ip text,
  user_agent text
);

-- Referral events table (signups, purchases, etc.)
create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliates(id) on delete cascade,
  event_type text not null, -- 'signup', 'purchase', etc.
  amount_usd numeric(10,2),
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.affiliates enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.referral_events enable row level security;

-- Drop existing policies if they exist
drop policy if exists "affiliates service access" on public.affiliates;
drop policy if exists "clicks service access" on public.referral_clicks;
drop policy if exists "events service access" on public.referral_events;

-- Allow service role full access
create policy "affiliates service access"
on public.affiliates for all
using (true);

create policy "clicks service access"
on public.referral_clicks for all
using (true);

create policy "events service access"
on public.referral_events for all
using (true);

-- Rollup view for stats
create or replace view public.referral_stats as
select
  a.id as affiliate_id,
  a.code,
  a.email,
  count(distinct c.id) as total_clicks,
  count(distinct case when e.event_type = 'signup' then e.id end) as total_signups,
  count(distinct case when e.event_type = 'purchase' then e.id end) as total_purchases,
  coalesce(sum(case when e.event_type = 'purchase' then e.amount_usd else 0 end), 0) as total_revenue_usd
from public.affiliates a
left join public.referral_clicks c on c.affiliate_id = a.id
left join public.referral_events e on e.affiliate_id = a.id
group by a.id, a.code, a.email;

-- Grant access to the view
grant select on public.referral_stats to service_role;
