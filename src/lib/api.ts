import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { ApiError, defaultMessageForStatus, handleApiError, publicErrorMessage } from '../middlewares/errorHandler';
import { env } from './env';
import { normalizeNiche, sanitizeDeep } from './sanitize';

/**
 * Universal response contract:
 *
 *   success → { success: true,  data?: T, message?: string, requestId }
 *   failure → { success: false, error: string, details?: unknown, requestId }
 *
 * `withApi()` wraps a route handler and guarantees that contract for EVERY route:
 *   • JSON bodies are size-checked, parsed, sanitised and re-injected (handlers keep calling `request.json()`)
 *   • uncaught exceptions become clean 4xx/5xx envelopes (no stack traces / internals in production)
 *   • legacy responses (`{ success, reply }`, `{ success, message }`, …) are normalised to the contract
 *     while their original top-level fields are preserved for already-deployed clients
 *   • non-JSON responses (Twilio TwiML/XML) pass through untouched
 */

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
  requestId?: string;
}

interface OkOptions {
  status?: number;
  message?: string;
  headers?: Record<string, string>;
  /** Extra top-level fields kept for backwards compatibility with older clients. */
  legacy?: Record<string, unknown>;
}

export function ok<T>(data?: T, options: OkOptions = {}): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(options.message ? { message: options.message } : {}),
      ...(data !== undefined ? { data } : {}),
      ...(env.legacyResponseFields() ? options.legacy : {}),
    },
    { status: options.status ?? 200, headers: options.headers }
  );
}

export function fail(error: string, status = 400, details?: unknown, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { success: false, error, ...(details !== undefined ? { details } : {}) },
    { status, headers }
  );
}

type RouteHandler = (request: Request, context?: any) => Promise<Response> | Response;

export interface WithApiOptions {
  /** Override the global body ceiling for a specific route. */
  maxBodyBytes?: number;
  /** Disable JSON sanitisation (e.g. a route that needs the raw payload). Default: true. */
  sanitize?: boolean;
}

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const RESERVED = new Set(['success', 'error', 'data', 'message', 'details', 'requestId', 'timestamp']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read, validate and sanitise a JSON request body; returns a replacement Request. */
async function prepareRequest(request: Request, options: WithApiOptions): Promise<Request> {
  const method = request.method.toUpperCase();
  const contentType = request.headers.get('content-type') ?? '';
  if (!BODY_METHODS.has(method) || !contentType.toLowerCase().includes('json')) return request;

  const raw = await request.text();
  const maxBytes = options.maxBodyBytes ?? env.maxBodyBytes();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    throw new ApiError('Request payload is too large.', 413);
  }

  let parsed: unknown = {};
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ApiError('Invalid JSON payload provided.', 400);
    }
  }

  const sanitized = options.sanitize === false ? parsed : sanitizeDeep(parsed);
  if (!isPlainObject(sanitized)) {
    // Every endpoint expects a JSON object; arrays/scalars/null would crash destructuring downstream.
    throw new ApiError('JSON request body must be an object.', 400);
  }

  const clean: Record<string, unknown> = { ...sanitized };
  for (const key of ['niche', 'Niche']) {
    if (typeof clean[key] !== 'string') continue;
    const slug = normalizeNiche(clean[key], '');
    if (slug) clean[key] = slug;
    else delete clean[key]; // unusable niche → let the route apply its own default
  }

  const headers = new Headers(request.headers);
  headers.delete('content-length');
  return new Request(request.url, { method, headers, body: JSON.stringify(clean) });
}

/** Coerce any JSON response into the standard envelope. Idempotent. */
async function normalizeResponse(response: Response, requestId: string): Promise<Response> {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json') || response.status === 204 || response.status === 304) return response;

  let payload: unknown;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  const status = response.status;
  const legacy = env.legacyResponseFields();
  let body: Record<string, unknown>;

  if (!isPlainObject(payload)) {
    body = status < 400 ? { success: true, data: payload } : { success: false, error: defaultMessageForStatus(status) };
  } else {
    const { success: rawSuccess, error, data, message, details, requestId: _id, timestamp: _ts, ...rest } = payload;
    const success = typeof rawSuccess === 'boolean' ? rawSuccess && status < 400 : status < 400;
    const extras = Object.fromEntries(Object.entries(rest).filter(([key]) => !RESERVED.has(key)));

    if (success) {
      const hasExtras = Object.keys(extras).length > 0;
      body = {
        success: true,
        ...(typeof message === 'string' ? { message } : {}),
        ...(data !== undefined ? { data } : hasExtras ? { data: extras } : {}),
        ...(legacy ? extras : {}),
      };
    } else {
      const text =
        typeof error === 'string' && error ? error : typeof message === 'string' && message ? message : defaultMessageForStatus(status);
      if (status >= 500) console.error(`[API ${status}] ${requestId}: ${text}`);
      body = {
        success: false,
        error: publicErrorMessage(text, status),
        ...(details !== undefined && status < 500 ? { details } : {}),
        ...(legacy ? extras : {}),
      };
    }
  }
  body.requestId = requestId;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, statusText: response.statusText, headers });
}

export function withApi(handler: RouteHandler, options: WithApiOptions = {}) {
  return async function wrapped(request: Request, context?: any): Promise<Response> {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    let prepared = request;
    try {
      prepared = await prepareRequest(request, options);
      const response = await handler(prepared, context);
      return await normalizeResponse(response, requestId);
    } catch (error) {
      // A TypeError while handling a request that carried a JSON body almost always means a field had
      // an unexpected type (e.g. `fullName: 123` hitting `.trim()`). That is a client error, not a 500.
      if (error instanceof TypeError && prepared !== request) {
        console.warn(`[API 400] ${requestId}: payload type mismatch – ${error.message}`);
        return handleApiError(new ApiError('Invalid field types in request payload.', 400), requestId);
      }
      return handleApiError(error, requestId);
    }
  };
}

/** Parse a JSON request body with a Zod schema; throws a 400 ApiError with per-field details. */
export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError('Invalid JSON payload provided.', 400);
  }
  return schema.parse(body); // ZodError → 400 via handleApiError
}

export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || crypto.randomUUID();
}
