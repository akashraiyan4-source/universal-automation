import { NextResponse, type NextRequest } from 'next/server';
import { corsHeaders } from './src/lib/cors';
import { env } from './src/lib/env';
import { applySecurityHeaders } from './src/lib/security-headers';
import { extractTenant, tenantForwardHeaders } from './src/lib/tenant';
import { checkRateLimit, classifyTier, getClientIp, rateLimitHeaders } from './src/middlewares/rateLimit';

/**
 * Global edge guard – runs before EVERY route (existing and future).
 * Adding a new niche or endpoint requires no change here:
 *
 *   1. Universal CORS + OPTIONS / HEAD pre-flight (never 403 an origin, never 405 a pre-flight)
 *   2. Method allow-list and request-size ceiling
 *   3. Per-IP sliding-window rate limiting (two tiers)
 *   4. Non-blocking tenant / API-key header extraction
 *   5. Security headers + request correlation id on every response
 */

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

function newRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function jsonError(status: number, error: string, requestId: string, origin: string | null, extra: Record<string, string> = {}) {
  const response = NextResponse.json({ success: false, error, requestId }, { status });
  for (const [key, value] of Object.entries({ ...corsHeaders(origin), ...extra })) {
    response.headers.set(key, value);
  }
  return applySecurityHeaders(response, requestId);
}

function applyCors(response: NextResponse, origin: string | null, extra: Record<string, string> = {}): NextResponse {
  for (const [key, value] of Object.entries({ ...corsHeaders(origin), ...extra })) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const incomingId = request.headers.get('x-request-id');
  const requestId = incomingId && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : newRequestId();
  const method = request.method.toUpperCase();
  const origin = request.headers.get('origin');
  const { pathname } = request.nextUrl;

  // 1. Pre-flight – always succeed so browsers never see 403/405 on OPTIONS/HEAD.
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return applySecurityHeaders(applyCors(response, origin), requestId);
  }
  if (method === 'HEAD') {
    // Let GET routes produce a real HEAD. For POST-only routes the route-level HEAD export
    // (or withApi short-circuit) answers 200. Either way, CORS is guaranteed here.
    const forwarded = new Headers(request.headers);
    forwarded.set('x-request-id', requestId);
    const response = NextResponse.next({ request: { headers: forwarded } });
    return applySecurityHeaders(applyCors(response, origin), requestId);
  }

  // 2. Method + size gates (never origin-block a landing page)
  if (!ALLOWED_METHODS.has(method)) {
    return jsonError(405, 'Method not allowed.', requestId, origin, { Allow: [...ALLOWED_METHODS].join(', ') });
  }
  const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(declaredLength) && declaredLength > env.maxBodyBytes()) {
    return jsonError(413, 'Request payload is too large.', requestId, origin);
  }

  // 3. Rate limit
  // Signed Twilio webhooks share a handful of source IPs, so they use the roomier tier
  // (their signature is verified inside the route when TWILIO_VALIDATE_SIGNATURE=true).
  const tier = request.headers.has('x-twilio-signature') ? 'default' : classifyTier(pathname);
  const ip = getClientIp(request);
  const limit = await checkRateLimit(request.headers.has('x-twilio-signature') ? `tw:${ip}` : ip, tier);
  if (!limit.success) {
    return jsonError(429, 'Too many requests. Please slow down and try again shortly.', requestId, origin, rateLimitHeaders(limit));
  }

  // 4. Non-blocking tenant extraction (observes keys; never rejects)
  const tenant = extractTenant(request);

  // 5. Forward with correlation id, tenant metadata, and hardened headers
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-request-id', requestId);
  forwardedHeaders.set('x-client-ip', ip);
  for (const [key, value] of Object.entries(tenantForwardHeaders(tenant))) {
    forwardedHeaders.set(key, value);
  }

  const response = NextResponse.next({ request: { headers: forwardedHeaders } });
  return applySecurityHeaders(applyCors(response, origin, rateLimitHeaders(limit)), requestId);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
