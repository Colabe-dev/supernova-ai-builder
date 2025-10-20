-- Supernova Supabase Bootstrap SQL
-- Run this script in your Supabase Dashboard SQL Editor
-- Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "profiles are viewable by owner" on public.profiles;
drop policy if exists "profiles are insertable by owner" on public.profiles;
drop policy if exists "profiles are updatable by owner" on public.profiles;

-- Create RLS policies
create policy "profiles are viewable by owner"
on public.profiles for select using (auth.uid() = id);

create policy "profiles are insertable by owner"
on public.profiles for insert with check (auth.uid() = id);

create policy "profiles are updatable by owner"
on public.profiles for update using (auth.uid() = id);

-- System health check table
create table if not exists public.system_health (
  id serial primary key,
  last_check timestamptz default now()
);

-- Enable RLS on system_health
alter table public.system_health enable row level security;

-- Allow service role to read/write system_health
create policy "system_health service access"
on public.system_health for all
using (true);
