import { normalizeNiche } from './sanitize';
import { env } from './env';

/**
 * Niche helpers that never hardcode a closed set of businesses.
 * A new landing page only needs a `niche` string – env keys follow the convention
 * `<NICHE>_<SUFFIX>` (e.g. SOLAR_TEAM_PHONE, RETELL_MEDSPA_AGENT_ID).
 */

export function nicheSlug(value: unknown, fallback = 'general'): string {
  return normalizeNiche(value, fallback);
}

/** `real-estate` → `REAL_ESTATE` for env key construction. */
export function nicheEnvToken(niche: string): string {
  return nicheSlug(niche, 'GENERAL').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/** First configured env value among `<NICHE>_<suffix>`, then a global fallback key. */
export function nicheEnv(niche: string, suffix: string, globalFallback?: string): string | undefined {
  const token = nicheEnvToken(niche);
  return env.get(`${token}_${suffix}`) ?? (globalFallback ? env.get(globalFallback) : undefined);
}

/**
 * Pick a per-niche value from a table. Matches on slug equality, then substring
 * (so `solar-panel` hits `solar`). Unknown niches return `fallback` – never a
 * hardcoded dental/solar default unless the caller passed one.
 */
export function pickNicheValue<T>(niche: string, table: Record<string, T>, fallback: T): T {
  const slug = nicheSlug(niche, '');
  if (!slug) return fallback;
  if (table[slug] !== undefined) return table[slug];
  const partial = Object.keys(table).find((key) => key !== 'general' && (slug.includes(key) || key.includes(slug)));
  return partial && table[partial] !== undefined ? table[partial] : fallback;
}

/** Human-readable industry label from a slug: `real-estate` → `real estate`. */
export function nicheLabel(niche: string, fallback = 'professional services'): string {
  const slug = nicheSlug(niche, '');
  if (!slug || slug === 'general') return fallback;
  return slug.replace(/-/g, ' ');
}
