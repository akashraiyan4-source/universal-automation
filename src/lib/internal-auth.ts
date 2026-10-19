import { env, isProduction } from './env';

/**
 * Shared-secret guard for endpoints that spend money or contact third parties from a JSON body
 * (outbound calls, SMS to caller-supplied numbers). Landing pages never call these, so they are
 * protected by `INTERNAL_API_KEY` (send as `x-api-key` or `Authorization: Bearer …`).
 *
 * Fail-closed in production when the key is not configured; open in local development for convenience.
 */

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  let diff = bytesA.length ^ bytesB.length;
  const length = Math.max(bytesA.length, bytesB.length);
  for (let i = 0; i < length; i++) diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  return diff === 0;
}

export function checkInternalKey(request: Request): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  const configured = env.get('INTERNAL_API_KEY');
  if (!configured) {
    return isProduction()
      ? { ok: false, status: 503, error: 'This endpoint is disabled until INTERNAL_API_KEY is configured.' }
      : { ok: true };
  }

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = request.headers.get('x-api-key') ?? bearer ?? '';
  return provided && timingSafeEqual(provided, configured) ? { ok: true } : { ok: false, status: 401, error: 'Invalid or missing API key.' };
}
