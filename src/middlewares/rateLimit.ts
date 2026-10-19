import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env, isTest } from '../lib/env';

/**
 * Two-tier, sliding-window rate limiter.
 *
 *  - `default`: every request            (RATE_LIMIT_PER_MINUTE,        default 60)
 *  - `strict` : endpoints that cost money (RATE_LIMIT_STRICT_PER_MINUTE, default 20)
 *               e.g. AI generation, SMS, voice, webhooks that call third parties.
 *
 * Uses Upstash Redis when configured (shared across all serverless instances),
 * otherwise falls back to a bounded in-memory store (per instance).
 * Redis failures never take the API down – they degrade to the memory limiter.
 */

export type RateLimitTier = 'default' | 'strict';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch milliseconds when the window resets. */
  reset: number;
}

const WINDOW_MS = 60_000;

const STRICT_PATH =
  /(^|\/)(ai|voice|gemini|whatsapp|staff[-]?alert|missed-call|broadcast|vector|visual|sentiment|multilanguage|smart-faq|faq|google-maps|google-reviews|reputation|fly-in|lead-notification|nda|invoice|payment)/i;

export function classifyTier(pathname: string): RateLimitTier {
  return STRICT_PATH.test(pathname) ? 'strict' : 'default';
}

function limitFor(tier: RateLimitTier): number {
  return tier === 'strict' ? env.rateLimitStrictPerMinute() : env.rateLimitPerMinute();
}

// ── Redis (lazy) ─────────────────────────────────────────────────────────────
export const isRedisConfigured = (): boolean => Boolean(env.upstashUrl() && env.upstashToken());

const redisLimiters = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;

function getRedisLimiter(tier: RateLimitTier): Ratelimit | null {
  if (!isRedisConfigured()) return null;
  const limit = limitFor(tier);
  const cacheKey = `${tier}:${limit}`;
  const cached = redisLimiters.get(cacheKey);
  if (cached) return cached;

  try {
    redisClient ??= new Redis({ url: env.upstashUrl()!, token: env.upstashToken()! });
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, '60 s'),
      prefix: `rl:${tier}`,
      analytics: false,
      timeout: 1_500, // fail open if Redis is slow
    });
    redisLimiters.set(cacheKey, limiter);
    return limiter;
  } catch (error) {
    console.warn('[RateLimit] Redis init failed, using memory fallback.', error instanceof Error ? error.message : error);
    return null;
  }
}

// ── Memory fallback (bounded, self-cleaning) ─────────────────────────────────
const MAX_TRACKED_KEYS = 10_000;
const globalRl = globalThis as unknown as { __rlMemory?: Map<string, { count: number; reset: number }> };
const memoryStore = (globalRl.__rlMemory ??= new Map<string, { count: number; reset: number }>());
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 30_000 && memoryStore.size < MAX_TRACKED_KEYS) return;
  lastSweep = now;
  for (const [key, record] of memoryStore) {
    if (record.reset <= now) memoryStore.delete(key);
  }
  // Still too big (sustained attack with many IPs): drop oldest entries.
  if (memoryStore.size >= MAX_TRACKED_KEYS) {
    const overflow = memoryStore.size - MAX_TRACKED_KEYS + 1_000;
    let removed = 0;
    for (const key of memoryStore.keys()) {
      memoryStore.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

function checkMemory(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const record = memoryStore.get(key);

  if (!record || record.reset <= now) {
    const reset = now + WINDOW_MS;
    memoryStore.set(key, { count: 1, reset });
    return { success: true, limit, remaining: limit - 1, reset };
  }
  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.reset };
  }
  record.count += 1;
  return { success: true, limit, remaining: limit - record.count, reset: record.reset };
}

// ── Public API ───────────────────────────────────────────────────────────────
export function getClientIp(request?: Request): string {
  if (!request) return '127.0.0.1';
  const h = request.headers;
  // Vercel/Cloudflare set these at the edge, so they cannot be spoofed by the caller.
  const trusted = h.get('x-vercel-forwarded-for') || h.get('cf-connecting-ip') || h.get('x-real-ip');
  if (trusted) return trusted.split(',')[0].trim().slice(0, 64);
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64);
  return '127.0.0.1';
}

export async function checkRateLimit(
  identifierOrReq: string | Request,
  tier: RateLimitTier = 'default'
): Promise<RateLimitResult> {
  const id = typeof identifierOrReq === 'string' ? identifierOrReq : getClientIp(identifierOrReq);
  const limit = limitFor(tier);
  if (isTest()) return { success: true, limit, remaining: limit, reset: Date.now() + WINDOW_MS };

  const limiter = getRedisLimiter(tier);
  if (limiter) {
    try {
      const result = await limiter.limit(id);
      return { success: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
    } catch (error) {
      console.error('[RateLimit] Redis query failed, falling back to memory.', error instanceof Error ? error.message : error);
    }
  }
  return checkMemory(`${tier}:${id}`, limit);
}

export const rateLimit = checkRateLimit;

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  };
  if (!result.success) {
    headers['Retry-After'] = String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
  }
  return headers;
}
