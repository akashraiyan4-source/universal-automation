import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { isProduction } from '../lib/env';

/** Throw from anywhere inside a route to produce a clean, typed HTTP error. */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly headers?: Record<string, string>;

  constructor(message: string, statusCode = 500, details?: unknown, headers?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.headers = headers;
  }
}

export const GENERIC_SERVER_ERROR = 'An unexpected server error occurred. Please try again later.';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad request.',
  401: 'Authentication required.',
  403: 'Forbidden.',
  404: 'Resource not found.',
  405: 'Method not allowed.',
  409: 'Conflict with the current state of the resource.',
  413: 'Request payload is too large.',
  415: 'Unsupported content type.',
  422: 'The request could not be processed.',
  429: 'Too many requests. Please try again later.',
};

export function defaultMessageForStatus(status: number): string {
  if (status >= 500) return GENERIC_SERVER_ERROR;
  return STATUS_MESSAGES[status] ?? 'Request failed.';
}

/**
 * Hide internals from clients in production; keep detail in dev for debugging.
 * Only a bare 500 is masked: 502/503/504 are deliberate, author-written upstream/availability messages.
 */
export function publicErrorMessage(message: string, status: number): string {
  return status === 500 && isProduction() ? GENERIC_SERVER_ERROR : message;
}

export function zodDetails(error: ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

export function handleApiError(error: unknown, requestId?: string, defaultStatus = 500): NextResponse {
  const timestamp = new Date().toISOString();

  if (error instanceof ZodError) {
    const details = zodDetails(error);
    const summary = Object.entries(details)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join(' | ');
    return NextResponse.json(
      { success: false, error: summary || 'Validation failed. Please check your input.', details, requestId, timestamp },
      { status: 400 }
    );
  }

  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      console.error(`[API ${error.statusCode}] ${requestId ?? '-'}: ${error.message}`);
    }
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error.message, error.statusCode),
        ...(error.details && error.statusCode < 500 ? { details: error.details } : {}),
        requestId,
        timestamp,
      },
      { status: error.statusCode, headers: error.headers }
    );
  }

  // Circuit-open / upstream timeouts are availability issues, not application bugs.
  const rawMessage = error instanceof Error ? error.message : '';
  if (/circuit open|timed out after/i.test(rawMessage)) {
    return NextResponse.json(
      { success: false, error: 'A connected service is temporarily unavailable. Please try again shortly.', requestId, timestamp },
      { status: 503 }
    );
  }

  console.error(`[API 500] ${requestId ?? '-'}:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
  const raw = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
  return NextResponse.json(
    { success: false, error: publicErrorMessage(raw, defaultStatus), requestId, timestamp },
    { status: defaultStatus }
  );
}
