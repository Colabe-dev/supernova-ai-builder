import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE || '';

  if (!supabaseUrl || !supabaseServiceRole) {
    return null;
  }

  if (!cachedAdmin) {
    cachedAdmin = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cachedAdmin;
}

export function reloadSupabaseConfig() {
  cachedAdmin = null;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE || '';
  return !!(supabaseUrl && supabaseServiceRole);
}

export async function healthCheck(): Promise<{ ok: boolean; error?: string; usersSeen?: number }> {
  const supabaseAdmin = getSupabaseAdmin();
  
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

export async function bootstrapDatabase(): Promise<{ ok: boolean; error?: string; message?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  
  if (!supabaseAdmin) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError && profilesError.code === 'PGRST116') {
      return {
        ok: false,
        error: 'Unable to bootstrap database. Please run the SQL manually via Supabase Dashboard SQL Editor. See documentation for SQL script.',
      };
    }

    if (!profilesError || profilesError.code === '42P01') {
      return {
        ok: true,
        message: 'Database tables appear to be set up. If you need to create tables, please use the Supabase Dashboard SQL Editor with the provided SQL script.',
      };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}
