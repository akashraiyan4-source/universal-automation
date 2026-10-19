import { NextResponse } from 'next/server';
import { kv } from './kv';

/**
 * Duplicate-submission protection for state-changing endpoints.
 *
 * How a request is keyed:
 *   1. `Idempotency-Key` header (recommended; the frontend client sends a UUID per submission), else
 *   2. a SHA-256 fingerprint of the business payload (so even a client that sends no key can't
 *      double-book by hammering the button).
 *
 * Behaviour:
 *   • first request            → executes, successful (2xx) response is stored
 *   • identical retry/replay   → returns the stored response with `Idempotent-Replay: true`
 *   • concurrent duplicate     → 409 + `Retry-After` while the first is still in flight
 *   • same key, other payload  → 422 (client bug – a key must map to one logical operation)
 *   • failed attempt (non-2xx / exception) → record is released so the client may retry
 */

const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;
const IN_FLIGHT_TTL_SECONDS = 30;

interface PendingRecord {
  state: 'pending';
  fingerprint: string;
}
interface DoneRecord {
  state: 'done';
  fingerprint: string;
  status: number;
  body: string;
}
type Record_ = PendingRecord | DoneRecord;

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getIdempotencyKey(request: Request): string | null {
  const header = request.headers.get('idempotency-key')?.trim();
  return header && KEY_PATTERN.test(header) ? header : null;
}

interface IdempotencyOptions {
  /** Logical operation name, e.g. "booking.create". Namespaces keys. */
  scope: string;
  /** Stable string describing the business payload (used for dedupe + key-reuse detection). */
  fingerprint: string;
  /** How long a successful response is replayable. Default 24h with explicit key, 60s derived. */
  ttlSeconds?: number;
  execute: () => Promise<Response>;
}

export async function withIdempotency(request: Request, options: IdempotencyOptions): Promise<Response> {
  const explicitKey = getIdempotencyKey(request);
  const fingerprint = await sha256Hex(`${options.scope}|${options.fingerprint}`);
  const storageKey = explicitKey
    ? `idem:${options.scope}:k:${await sha256Hex(explicitKey)}`
    : `idem:${options.scope}:f:${fingerprint}`;
  const ttl = options.ttlSeconds ?? (explicitKey ? 24 * 60 * 60 : 60);

  const claimed = await kv.setIfAbsent(storageKey, { state: 'pending', fingerprint } satisfies PendingRecord, IN_FLIGHT_TTL_SECONDS);

  if (!claimed) {
    const existing = await kv.get<Record_>(storageKey);
    if (existing && existing.fingerprint !== fingerprint) {
      return NextResponse.json(
        { success: false, error: 'This Idempotency-Key was already used with a different request payload.' },
        { status: 422 }
      );
    }
    if (existing?.state === 'done') {
      return new Response(existing.body, {
        status: existing.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Idempotent-Replay': 'true' },
      });
    }
    return NextResponse.json(
      { success: false, error: 'This request is already being processed. Please wait a moment.' },
      { status: 409, headers: { 'Retry-After': '2' } }
    );
  }

  try {
    const response = await options.execute();
    if (response.status >= 200 && response.status < 300) {
      const body = await response.clone().text();
      await kv.set(storageKey, { state: 'done', fingerprint, status: response.status, body } satisfies DoneRecord, ttl);
    } else {
      await kv.delete(storageKey);
    }
    return response;
  } catch (error) {
    await kv.delete(storageKey);
    throw error;
  }
}
