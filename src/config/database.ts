import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isTest } from '../lib/env';

/**
 * Single Supabase client for the whole backend (server-side only).
 *
 * - Prefers the service-role key (server secret – NEVER expose via NEXT_PUBLIC_*).
 * - Falls back to the anon key, then to an inert placeholder client so imports never crash a cold start.
 * - Cached on `globalThis` so hot-reload / multiple route bundles share one connection pool.
 */
const supabaseUrl = env.supabaseUrl();
const supabaseKey = env.supabaseKey();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isDbConfigured = isSupabaseConfigured;

if (!isSupabaseConfigured && !isTest()) {
  console.warn('[Database] Supabase credentials missing – running with in-memory fallbacks only.');
}

const globalForSupabase = globalThis as unknown as { supabaseClient?: SupabaseClient };

export const supabase: SupabaseClient =
  globalForSupabase.supabaseClient ??
  createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseKey ?? 'placeholder-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

export const db = supabase;

globalForSupabase.supabaseClient = supabase;
