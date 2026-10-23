import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { circuitBreakers } from '../lib/circuit-breaker';
import { env, isTest } from '../lib/env';

/**
 * Single Supabase client for the whole backend (server-side only).
 *
 * - Prefers the service-role key (server secret – NEVER expose via NEXT_PUBLIC_*).
 * - Falls back to the anon key, then to an inert placeholder client so imports never crash a cold start.
 * - Cached on `globalThis` so hot-reload / multiple route bundles share one connection pool.
 * - Every network call is timeout-bounded and gated by the `supabase` circuit breaker.
 */

const SUPABASE_FETCH_MS = 8_000;

const supabaseUrl = env.supabaseUrl();
const supabaseKey = env.supabaseKey();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isDbConfigured = isSupabaseConfigured;

if (!isSupabaseConfigured && !isTest()) {
  console.warn('[Database] Supabase credentials missing – running with in-memory fallbacks only.');
}

async function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return circuitBreakers.supabase.fire(async () => {
    const controller = new AbortController();
    const parent = init?.signal;
    if (parent) {
      if (parent.aborted) controller.abort(parent.reason);
      else parent.addEventListener('abort', () => controller.abort(parent.reason), { once: true });
    }
    const timer = setTimeout(() => controller.abort(), SUPABASE_FETCH_MS);
    try {
      return await fetch(input as RequestInfo, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`Supabase request timed out after ${SUPABASE_FETCH_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  });
}

const globalForSupabase = globalThis as unknown as { supabaseClient?: SupabaseClient };

export const supabase: SupabaseClient =
  globalForSupabase.supabaseClient ??
  createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseKey ?? 'placeholder-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: guardedFetch },
  });

export const db = supabase;

globalForSupabase.supabaseClient = supabase;

/**
 * Run a database operation with a hard timeout. On failure, return `fallback`
 * (when provided) instead of taking down the route.
 */
export async function withDatabase<T>(
  run: (client: SupabaseClient) => Promise<T>,
  fallback?: T | (() => T | Promise<T>)
): Promise<T> {
  try {
    if (!isSupabaseConfigured && fallback !== undefined) {
      return typeof fallback === 'function' ? await (fallback as () => T | Promise<T>)() : fallback;
    }
    return await run(supabase);
  } catch (error) {
    if (fallback !== undefined) {
      console.warn('[Database] query failed, using fallback:', error instanceof Error ? error.message : error);
      return typeof fallback === 'function' ? await (fallback as () => T | Promise<T>)() : fallback;
    }
    throw error;
  }
}
