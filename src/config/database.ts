import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  !supabaseUrl.includes('placeholder')
);

const globalForSupabase = globalThis as unknown as { supabaseClient: SupabaseClient | undefined };

export const supabase: SupabaseClient =
  globalForSupabase.supabaseClient ?? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

export const db = supabase;
export const isDbConfigured = isSupabaseConfigured;

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabaseClient = supabase;
}