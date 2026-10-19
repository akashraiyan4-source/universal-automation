import { isProduction } from './env';

/**
 * Helmet-equivalent hardening headers for a JSON/TwiML API.
 * The API never serves HTML, so the CSP is maximally restrictive.
 */
export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    // CORS (not CORP) governs which browsers may *read* responses; CORP must not break legit cross-origin fetches.
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-DNS-Prefetch-Control': 'off',
    'X-XSS-Protection': '0', // legacy auditor is itself an attack surface; CSP replaces it
  };
  if (isProduction()) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  }
  return headers;
}

export function applySecurityHeaders(response: Response, requestId?: string): Response {
  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }
  if (requestId) response.headers.set('X-Request-ID', requestId);
  return response;
}
