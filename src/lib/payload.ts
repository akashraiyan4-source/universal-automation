import { normalizeNiche, normalizePhone } from './sanitize';

/**
 * Universal payload normalisation.
 *
 * Landing pages (and future B2B automation clients) do not share one field vocabulary.
 * This layer resolves aliases, coerces primitive types, and writes canonical keys so
 * route handlers never crash on `fullName` vs `patientName`, `phone` vs `From`, or `Niche`.
 *
 * Existing keys are never overwritten with empty values. Original fields are preserved.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function lowerKeyIndex(obj: Record<string, unknown>): Map<string, string> {
  const index = new Map<string, string>();
  for (const key of Object.keys(obj)) {
    const lower = key.toLowerCase();
    if (!index.has(lower)) index.set(lower, key);
  }
  return index;
}

function lookup(obj: Record<string, unknown>, index: Map<string, string>, names: readonly string[]): unknown {
  for (const name of names) {
    const actual = index.get(name.toLowerCase());
    if (actual === undefined) continue;
    const value = obj[actual];
    if (value === undefined || value === null || value === '') continue;
    return value;
  }
  return undefined;
}

function fill(obj: Record<string, unknown>, keys: readonly string[], value: string): void {
  for (const key of keys) {
    const current = obj[key];
    if (current === undefined || current === null || current === '') obj[key] = value;
  }
}

const NAME_ALIASES = [
  'fullName',
  'fullname',
  'full_name',
  'name',
  'clientName',
  'clientname',
  'client_name',
  'patientName',
  'patientname',
  'patient_name',
  'customerName',
  'customername',
  'customer_name',
  'contactName',
  'contact_name',
  'userName',
  'username',
  'displayName',
  'leadName',
] as const;

const NAME_TARGETS = ['fullName', 'name', 'clientName', 'patientName', 'customerName'] as const;

const PHONE_ALIASES = [
  'phone',
  'from',
  'callerPhone',
  'caller_phone',
  'callerphone',
  'recipientPhone',
  'recipient_phone',
  'phoneNumber',
  'phone_number',
  'phonenumber',
  'mobile',
  'mobileNumber',
  'mobile_number',
  'tel',
  'telephone',
  'userPhone',
  'user_phone',
  'contactPhone',
  'contact_phone',
  'whatsapp',
  'smsPhone',
  'customerPhone',
] as const;

const PHONE_TARGETS = ['phone', 'callerPhone', 'recipientPhone', 'userPhone', 'customerPhone'] as const;

const NICHE_ALIASES = ['niche', 'vertical', 'industry', 'businessType', 'business_type', 'segment', 'category'] as const;

const EMAIL_ALIASES = ['email', 'emailAddress', 'email_address', 'mail', 'contactEmail'] as const;

const MESSAGE_ALIASES = ['message', 'body', 'notes', 'text', 'smsBody', 'comment', 'details', 'inquiry'] as const;

/**
 * Normalise a JSON object in place (returns the same object for convenience).
 * Arrays and non-objects are returned unchanged.
 */
export function normalizePayload<T>(input: T): T {
  if (!isPlainObject(input)) return input;
  const obj = input as Record<string, unknown>;
  const index = lowerKeyIndex(obj);

  let name = asString(lookup(obj, index, NAME_ALIASES));
  if (!name) {
    const first = asString(lookup(obj, index, ['firstName', 'first_name', 'fname', 'givenName']));
    const last = asString(lookup(obj, index, ['lastName', 'last_name', 'lname', 'familyName', 'surname']));
    if (first || last) name = [first, last].filter(Boolean).join(' ');
  }
  if (name) fill(obj, NAME_TARGETS, name);

  const phoneRaw = asString(lookup(obj, index, PHONE_ALIASES));
  if (phoneRaw) {
    fill(obj, PHONE_TARGETS, normalizePhone(phoneRaw) ?? phoneRaw);
  }

  const nicheRaw = asString(lookup(obj, index, NICHE_ALIASES));
  if (nicheRaw) {
    const slug = normalizeNiche(nicheRaw, '');
    if (slug) fill(obj, ['niche'], slug);
  }

  const email = asString(lookup(obj, index, EMAIL_ALIASES));
  if (email) fill(obj, ['email'], email.toLowerCase());

  const message = asString(lookup(obj, index, MESSAGE_ALIASES));
  if (message) fill(obj, ['message'], message);

  const treatment = asString(
    lookup(obj, index, [
      'treatment',
      'treatmentInterest',
      'service',
      'serviceType',
      'serviceInterest',
      'procedureInterest',
      'procedureDone',
      'serviceCompleted',
    ])
  );
  if (treatment) fill(obj, ['treatment', 'serviceType', 'service', 'procedureInterest'], treatment);

  return input;
}

/** Pull a display name from any common client-name field. */
export function resolveName(input: Record<string, unknown> | null | undefined, fallback = ''): string {
  if (!input) return fallback;
  const index = lowerKeyIndex(input);
  return asString(lookup(input, index, NAME_ALIASES)) || fallback;
}

/** Pull a phone from any common phone field (already sanitised when coming through `withApi`). */
export function resolvePhone(input: Record<string, unknown> | null | undefined): string | undefined {
  if (!input) return undefined;
  const index = lowerKeyIndex(input);
  return asString(lookup(input, index, PHONE_ALIASES));
}

/** Pull a niche slug from any common niche field. */
export function resolveNiche(input: Record<string, unknown> | null | undefined, fallback = 'general'): string {
  if (!input) return fallback;
  const index = lowerKeyIndex(input);
  const raw = asString(lookup(input, index, NICHE_ALIASES));
  return normalizeNiche(raw, fallback);
}
