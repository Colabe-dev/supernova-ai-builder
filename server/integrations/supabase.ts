import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE || '';

export const supabaseAdmin = supabaseUrl && supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceRole);
}

export async function healthCheck(): Promise<{ ok: boolean; error?: string; usersSeen?: number }> {
  if (!supabaseAdmin) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      return { ok: false, error: String(error.message || error) };
    }

    return { ok: true, usersSeen: data?.users?.length ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}

export async function bootstrapDatabase(): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Profiles linked to auth.users
        create table if not exists public.profiles (
          id uuid primary key references auth.users(id) on delete cascade,
          username text unique,
          created_at timestamptz default now()
        );

        alter table public.profiles enable row level security;

        -- Drop policies if they exist
        drop policy if exists "profiles are viewable by owner" on public.profiles;
        drop policy if exists "profiles are insertable by owner" on public.profiles;

        -- Create policies
        create policy "profiles are viewable by owner"
        on public.profiles for select using (auth.uid() = id);

        create policy "profiles are insertable by owner"
        on public.profiles for insert with check (auth.uid() = id);

        -- System health table
        create table if not exists public.system_health (
          id serial primary key,
          last_check timestamptz default now()
        );

        alter table public.system_health enable row level security;
      `,
    });

    if (error) {
      return { ok: false, error: String(error.message || error) };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}
