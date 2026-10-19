/**
 * Input sanitisation applied to EVERY JSON body before it reaches a route handler.
 *
 * Goals: stop prototype pollution, strip markup/control characters, bound size and depth.
 * It deliberately does NOT HTML-escape (that corrupts legitimate data such as O'Brien);
 * escape at the output boundary (HTML/XML/SMS) instead.
 */

// C0 controls (except \t \n \r), DEL, zero-width space, bidi marks/overrides/isolates, BOM.
// ZWJ/ZWNJ (U+200D/U+200C) are intentionally kept so emoji sequences survive.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const HTML_TAGS = /<\/?[a-z!?][^>]*>/gi;
// Elements whose *content* is executable/hostile: drop the whole block, not just the tags.
const DANGEROUS_BLOCKS = /<(script|style|iframe|object|embed|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export interface SanitizeOptions {
  maxDepth?: number;
  maxKeys?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
}

const DEFAULTS: Required<SanitizeOptions> = {
  maxDepth: 8,
  maxKeys: 100,
  maxArrayLength: 200,
  maxStringLength: 5_000,
};

export function sanitizeString(value: string, maxLength = DEFAULTS.maxStringLength): string {
  let out = value.normalize('NFC').replace(UNSAFE_CHARS, '');
  // Run twice so `<<script>script>` style nesting cannot survive a single pass.
  out = out.replace(DANGEROUS_BLOCKS, '').replace(HTML_TAGS, '').replace(HTML_TAGS, '');
  return out.trim().slice(0, maxLength);
}

export function sanitizeDeep(value: unknown, options: SanitizeOptions = {}, depth = 0): unknown {
  const opts = { ...DEFAULTS, ...options };
  if (typeof value === 'string') return sanitizeString(value, opts.maxStringLength);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean' || value === null) return value;
  if (depth >= opts.maxDepth) return undefined;

  if (Array.isArray(value)) {
    return value.slice(0, opts.maxArrayLength).map((item) => sanitizeDeep(item, opts, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = Object.create(null);
    let count = 0;
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      if (++count > opts.maxKeys) break;
      const cleanKey = sanitizeString(key, 100);
      if (!cleanKey || FORBIDDEN_KEYS.has(cleanKey)) continue;
      const cleaned = sanitizeDeep(val, opts, depth + 1);
      if (cleaned !== undefined) result[cleanKey] = cleaned;
    }
    return { ...result }; // back to a normal prototype for downstream code
  }

  return undefined; // functions, symbols, bigint, undefined
}

/**
 * Canonical niche slug: lowercase, `[a-z0-9-]`, max 40 chars.
 * "Real Estate" -> "real-estate", "dental / general" -> "dental-general".
 * Any string works – new niches (solar, roofing, medspa, …) need no registration.
 */
export function normalizeNiche(value: unknown, fallback = 'general'): string {
  if (typeof value !== 'string') return fallback;
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

/** Digits with optional leading "+", 7–15 digits (E.164 range). Returns null if invalid. */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const stripped = value.replace(/[\s().\-]/g, '');
  return /^\+?\d{7,15}$/.test(stripped) ? stripped : null;
}

/** Mask a phone number for logs: +1555***7890 */
export function maskPhone(value: unknown): string {
  if (typeof value !== 'string' || value.length < 7) return '***';
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}
