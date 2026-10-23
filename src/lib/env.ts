/**
 * Central, typed access to environment configuration.
 *
 * - Never throws at import time (a missing optional key must not crash a cold start).
 * - Treats empty strings and "placeholder" values as "not configured".
 * - Never logs secret values; `describeConfig()` only reports booleans.
 */

const PLACEHOLDER = /placeholder|your[-_]|changeme|example\.com|xxxx/i;

function read(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value || PLACEHOLDER.test(value)) return undefined;
  return value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function readInt(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';

export const env = {
  // ── Security / CORS ────────────────────────────────────────────────────────
  /** Universal allowed origins - defaults to wildcard or explicit lists. */
  allowedOrigins: (): string[] => {
    const list = [...readList('ALLOWED_ORIGINS'), ...readList('ALLOWED_ORIGIN')];
    if (list.length === 0) return ['*'];
    return list;
  },
  /** Localhost/127.0.0.1 are always allowed unless explicitly disabled. */
  allowLocalhost: (): boolean => readBool('ALLOW_LOCALHOST_ORIGINS', true),

  // ── Rate limiting ──────────────────────────────────────────────────────────
  rateLimitPerMinute: (): number => readInt('RATE_LIMIT_PER_MINUTE', 60, 5, 10_000),
  rateLimitStrictPerMinute: (): number => readInt('RATE_LIMIT_STRICT_PER_MINUTE', 20, 1, 1_000),
  upstashUrl: (): string | undefined => read('UPSTASH_REDIS_REST_URL'),
  upstashToken: (): string | undefined => read('UPSTASH_REDIS_REST_TOKEN'),

  // ── Request limits ─────────────────────────────────────────────────────────
  maxBodyBytes: (): number => readInt('MAX_BODY_BYTES', 256 * 1024, 1024, 5 * 1024 * 1024),

  // ── Behaviour flags ────────────────────────────────────────────────────────
  /** Keep legacy top-level response fields (e.g. `reply`, `appointment`) next to `data`. */
  legacyResponseFields: (): boolean => readBool('API_LEGACY_FIELDS', true),
  /** Secure by default in production; set TWILIO_VALIDATE_SIGNATURE=false to opt out. */
  validateTwilioSignature: (): boolean => readBool('TWILIO_VALIDATE_SIGNATURE', isProduction()),
  publicBaseUrl: (): string | undefined => read('PUBLIC_BASE_URL') ?? read('NEXT_PUBLIC_BASE_URL'),

  // ── Integrations ───────────────────────────────────────────────────────────
  geminiKeys: (): string[] =>
    [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY]
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k) => k && !PLACEHOLDER.test(k)),
  geminiModel: (): string => read('GEMINI_MODEL') ?? 'gemini-2.5-flash',

  // ── AI concierge (/api/ai-chat) ────────────────────────────────────────────
  /** Sampling temperature, clamped to 0–1. Low = factual & consistent (default 0.4). */
  chatTemperature: (): number => {
    const parsed = Number.parseFloat(process.env.AI_CHAT_TEMPERATURE ?? '');
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.4;
  },
  /** Total time budget for one chat reply across all providers/keys (keep under the serverless limit). */
  chatBudgetMs: (): number => readInt('AI_CHAT_BUDGET_MS', 8_500, 2_000, 25_000),
  /** Cache opener replies for card clicks (seconds). 0 disables. */
  chatOpenerCacheSeconds: (): number => readInt('AI_CHAT_OPENER_CACHE_SECONDS', 900, 0, 86_400),
  /** Let the landing page send `businessContext`. Set false to force server-side (env/built-in) knowledge only. */
  allowClientBusinessContext: (): boolean => readBool('AI_ALLOW_CLIENT_BUSINESS_CONTEXT', true),
  /** Raw JSON from `<NICHE>_BUSINESS_CONTEXT` (e.g. SOLAR_BUSINESS_CONTEXT). Read verbatim: JSON may legitimately contain URLs. */
  businessContextJson: (niche: string): string | undefined => {
    const raw = process.env[`${niche.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_BUSINESS_CONTEXT`]?.trim();
    return raw || undefined;
  },
  twilioAccountSid: (): string | undefined => read('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: (): string | undefined => read('TWILIO_AUTH_TOKEN'),
  twilioPhone: (): string | undefined => read('TWILIO_PHONE_NUMBER'),
  supabaseUrl: (): string | undefined => read('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseKey: (): string | undefined => read('SUPABASE_SERVICE_ROLE_KEY') ?? read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  googlePlacesKey: (): string | undefined => read('GOOGLE_PLACES_API_KEY'),
  googlePlaceId: (): string | undefined => read('GOOGLE_PLACE_ID'),
  retellKey: (): string | undefined => read('RETELL_API_KEY'),
  get: read,
};

/** Safe-to-expose configuration summary (booleans only, never values). */
export function describeConfig() {
  return {
    cors: {
      explicitOrigins: env.allowedOrigins().length,
      localhostAllowed: env.allowLocalhost(),
    },
    rateLimiter: env.upstashUrl() && env.upstashToken() ? 'redis' : 'memory',
    ai: env.geminiKeys().length > 0,
    sms: Boolean(env.twilioAccountSid() && env.twilioAuthToken() && env.twilioPhone()),
    database: Boolean(env.supabaseUrl() && env.supabaseKey()),
  };
}