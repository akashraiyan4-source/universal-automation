/**
 * Universal CORS for a multi-niche public API.
 *
 * This backend is called by an unbounded set of landing-page origins (current and
 * future). An origin allow-list cannot scale and is the #1 source of 403s on
 * pre-flight. Security is enforced by rate limiting, Twilio signature checks,
 * and `INTERNAL_API_KEY` on money-moving routes – not by blocking browsers.
 *
 * Behaviour:
 *  - Every response carries CORS headers (`*` or the reflected Origin).
 *  - Invalid / missing Origin → `Access-Control-Allow-Origin: *`.
 *  - `isOriginAllowed()` is always true so the proxy never 403s a frontend.
 */

export const CORS_ALLOWED_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Accept',
  'Authorization',
  'X-Requested-With',
  'X-Request-ID',
  'X-API-Key',
  'X-Client-Key',
  'X-Tenant-ID',
  'X-Client-ID',
  'X-Trace-ID',
  'Idempotency-Key',
].join(', ');
export const CORS_EXPOSED_HEADERS = [
  'X-Request-ID',
  'Retry-After',
  'Idempotent-Replay',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
].join(', ');

function isUsableOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.origin === origin.replace(/\/$/, '');
  } catch {
    return false;
  }
}

/** Always true – landing pages on any domain must reach this API. */
export function isOriginAllowed(_origin?: string | null): boolean {
  return true;
}

/**
 * CORS response headers. Reflect a well-formed Origin (widest browser compatibility
 * with custom headers); otherwise advertise `*`.
 */
export function corsHeaders(origin: string | null | undefined): Record<string, string> {
  const allowOrigin = origin && isUsableOrigin(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
    'Access-Control-Expose-Headers': CORS_EXPOSED_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
