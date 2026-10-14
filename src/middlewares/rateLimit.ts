import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const isRedisConfigured = Boolean(
  redisUrl &&
    redisToken &&
    !redisUrl.includes('placeholder') &&
    !redisToken.includes('placeholder')
);

let ratelimitInstance: Ratelimit | null = null;

if (isRedisConfigured) {
  try {
    ratelimitInstance = new Ratelimit({
      redis: new Redis({
        url: redisUrl!,
        token: redisToken!,
      }),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    });
  } catch (err) {
    console.warn('⚠️ [RateLimit Warning]: Failed to initialize Upstash Redis, using memory fallback.', err);
  }
} else if (process.env.NODE_ENV !== 'test') {
  console.warn(
    '⚠️ [RateLimit Warning]: Upstash Redis environment variables missing. Using in-memory fallback.'
  );
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function checkMemoryRateLimit(ip: string, maxRequests = 10, windowMs = 10000) {
  const now = Date.now();
  const record = memoryStore.get(ip);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    memoryStore.set(ip, { count: 1, resetTime });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: resetTime };
  }

  if (record.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, reset: record.resetTime };
  }

  record.count += 1;
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: record.resetTime,
  };
}

export function getClientIp(request?: NextRequest | Request): string {
  if (!request) return '127.0.0.1';
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function checkRateLimit(identifierOrReq: string | NextRequest | Request) {
  const key =
    typeof identifierOrReq === 'string'
      ? identifierOrReq
      : getClientIp(identifierOrReq);

  if (ratelimitInstance) {
    try {
      return await ratelimitInstance.limit(key);
    } catch (error) {
      console.error('⚠️ [RateLimit Error]: Redis query failed, falling back to memory.', error);
      return checkMemoryRateLimit(key);
    }
  }

  return checkMemoryRateLimit(key);
}

export async function rateLimitMiddleware(request: NextRequest) {
  const ip = getClientIp(request);
  const { success, limit, reset, remaining } = await checkRateLimit(ip);

  if (!success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests, please try again later.',
        resetTime: new Date(reset).toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());
  return response;
}

export const rateLimit = checkRateLimit;