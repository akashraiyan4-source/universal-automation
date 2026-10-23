import { NextResponse } from 'next/server';
import { HEAD as preflightHead, OPTIONS as preflightOptions } from '@/src/lib/preflight';

/**
 * Lowest-priority catch-all: every unknown path (any method) returns the standard JSON error
 * contract instead of Next.js' HTML 404 page, so API clients can always `await res.json()`.
 * OPTIONS/HEAD still succeed so browsers never 405 on an unknown alias during pre-flight.
 */
const notFound = (request: Request) =>
  NextResponse.json(
    {
      success: false,
      error: 'Endpoint not found.',
      requestId: request.headers.get('x-request-id') ?? undefined,
    },
    { status: 404 }
  );

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = preflightOptions;
export const HEAD = preflightHead;
