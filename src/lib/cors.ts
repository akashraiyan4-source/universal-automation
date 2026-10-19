import { env } from './env';

/**
 * Strict, allow-list based CORS.
 *
 *  - `ALLOWED_ORIGINS`: exact origins (`https://clinic.example.com`) or single-label
 *    wildcards (`https://*.example.com`). A bare `*` is deliberately ignored.
 *  - localhost / 127.0.0.1 / [::1] (any port, http or https) are allowed unless
 *    `ALLOW_LOCALHOST_ORIGINS=false`.
 *  - Requests without an `Origin` header (server-to-server, Twilio webhooks, curl)
 *    are not subject to CORS and are never rejected here.
 */

export const CORS_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Accept',
  'Authorization',
  'X-Requested-With',
  'X-Request-ID',
  'Idempotency-Key',
  'X-Client-Key',
  'X-Trace-ID',
].join(', ');
export const CORS_EXPOSED_HEADERS = [
  'X-Request-ID',
  'Retry-After',
  'Idempotent-Replay',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
].join(', ');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseOrigin(origin: string): URL | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // A real browser Origin never carries a path/query; reject anything that does.
    if (url.origin !== origin.replace(/\/$/, '')) return null;
    return url;
  } catch {
    return null;
  }
}

function matchesPattern(url: URL, pattern: string): boolean {
  const normalized = pattern.replace(/\/$/, '');
  if (!normalized.includes('*')) return url.origin === normalized;

  // Only support `scheme://*.domain` – one wildcard, leading label only.
  const match = /^(https?):\/\/\*\.([a-z0-9.-]+)$/i.exec(normalized);
  if (!match) return false;
  const [, scheme, domain] = match;
  if (url.protocol !== `${scheme.toLowerCase()}:`) return false;
  const host = url.hostname.toLowerCase();
  const root = domain.toLowerCase();
  // Require at least one extra label and forbid sneaky `evil-example.com` matches.
  return host.length > root.length + 1 && host.endsWith(`.${root}`);
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return true; // not a cross-origin browser request
  const url = parseOrigin(origin);
  if (!url) return false;

  if (env.allowLocalhost() && LOCAL_HOSTS.has(url.hostname)) return true;

  return env.allowedOrigins().some((pattern) => matchesPattern(url, pattern));
}

/** CORS response headers for an (already validated) browser origin. */
export function corsHeaders(origin: string | null | undefined): Record<string, string> {
  if (!origin || !isOriginAllowed(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
    'Access-Control-Expose-Headers': CORS_EXPOSED_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
