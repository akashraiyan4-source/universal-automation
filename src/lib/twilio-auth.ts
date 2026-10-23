import twilio from 'twilio';
import { env } from './env';

/**
 * Verifies the `X-Twilio-Signature` header on inbound Twilio webhooks so only Twilio can trigger
 * calls / SMS replies (prevents toll fraud and SMS-pumping via forged requests).
 *
 * Enabled by default in production (override with `TWILIO_VALIDATE_SIGNATURE=false`). The signature covers
 * the exact public URL Twilio called – set `PUBLIC_BASE_URL` if the app sits behind a custom proxy.
 *
 * Returns `null` when the request is acceptable, otherwise a JSON 401 envelope
 * (`{ success: false, error }`) – never a bare 403 that breaks API clients.
 */
function unsignedResponse(error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function rejectUnsignedTwilioRequest(request: Request, params: Record<string, string>): Response | null {
  if (!env.validateTwilioSignature()) return null;

  const authToken = env.twilioAuthToken();
  if (!authToken) {
    // Nothing to validate against – and without credentials this deployment cannot send SMS/calls anyway.
    console.warn('[Twilio] Signature validation skipped: TWILIO_AUTH_TOKEN is not configured.');
    return null;
  }
  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    return unsignedResponse('Twilio signature missing.');
  }

  const incoming = new URL(request.url);
  const base = env.publicBaseUrl();
  const forwardedHost = request.headers.get('x-forwarded-host') ?? incoming.host;
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? incoming.protocol.replace(':', '');
  const origin = base ? base.replace(/\/$/, '') : `${forwardedProto}://${forwardedHost}`;

  // Twilio signs the URL it called, which may be the public /api/... alias rather than the internal path.
  const candidates = new Set([`${origin}${incoming.pathname}${incoming.search}`]);
  if (!incoming.pathname.startsWith('/api/')) {
    candidates.add(`${origin}/api${incoming.pathname}${incoming.search}`);
  }

  for (const url of candidates) {
    if (twilio.validateRequest(authToken, signature, url, params)) return null;
  }
  return unsignedResponse('Twilio signature invalid.');
}

/** Convenience wrapper for form-encoded Twilio webhooks: parses a clone and verifies the signature. */
export async function guardTwilioWebhook(request: Request): Promise<Response | null> {
  if (!env.validateTwilioSignature()) return null;
  const form = await request.clone().formData().catch(() => null);
  return rejectUnsignedTwilioRequest(request, formToParams(form));
}

/** Escape text for safe interpolation into XML/TwiML. */
export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string);
}

export function formToParams(form: FormData | null | undefined): Record<string, string> {
  const params: Record<string, string> = {};
  form?.forEach((value, key) => {
    if (typeof value === 'string') params[key] = value;
  });
  return params;
}
