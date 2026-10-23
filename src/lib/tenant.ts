import { env } from './env';

/**
 * Lightweight, non-blocking tenant / API-key extraction.
 *
 * Landing pages never send a key and must keep working. Future standalone B2B
 * automation clients can send `x-api-key` or `Authorization: Bearer …`.
 * This module only *observes* those headers – it never rejects a request.
 * Money-moving routes still call `checkInternalKey()` themselves.
 */

export type AuthScheme = 'x-api-key' | 'bearer' | 'x-client-key' | null;

export interface TenantContext {
  /** Header value of `x-tenant-id` / `x-client-id` when present. */
  tenantId: string | null;
  apiKeyPresent: boolean;
  /** `null` when no INTERNAL_API_KEY is configured (dev / open mode). */
  apiKeyValid: boolean | null;
  scheme: AuthScheme;
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  let diff = bytesA.length ^ bytesB.length;
  const length = Math.max(bytesA.length, bytesB.length);
  for (let i = 0; i < length; i++) diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  return diff === 0;
}

function readBearer(header: string | null): string {
  if (!header) return '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

/** Extract tenant metadata from a request. Never throws, never blocks. */
export function extractTenant(request: Request): TenantContext {
  const xApiKey = request.headers.get('x-api-key')?.trim() || '';
  const xClientKey = request.headers.get('x-client-key')?.trim() || '';
  const bearer = readBearer(request.headers.get('authorization'));
  const provided = xApiKey || bearer || xClientKey;
  const scheme: AuthScheme = xApiKey ? 'x-api-key' : bearer ? 'bearer' : xClientKey ? 'x-client-key' : null;

  const tenantId =
    request.headers.get('x-tenant-id')?.trim() ||
    request.headers.get('x-client-id')?.trim() ||
    request.headers.get('x-account-id')?.trim() ||
    null;

  const configured = env.get('INTERNAL_API_KEY');
  let apiKeyValid: boolean | null = null;
  if (configured && provided) {
    apiKeyValid = timingSafeEqual(provided, configured);
  } else if (configured && !provided) {
    apiKeyValid = false;
  }

  return {
    tenantId: tenantId && tenantId.length <= 128 ? tenantId : null,
    apiKeyPresent: Boolean(provided),
    apiKeyValid,
    scheme,
  };
}

/** Forwardable headers the proxy stamps onto the downstream request. */
export function tenantForwardHeaders(ctx: TenantContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-api-key-present': ctx.apiKeyPresent ? '1' : '0',
  };
  if (ctx.tenantId) headers['x-tenant-id'] = ctx.tenantId;
  if (ctx.scheme) headers['x-auth-scheme'] = ctx.scheme;
  return headers;
}
