import { NextResponse } from 'next/server';

/**
 * Shared OPTIONS / HEAD handlers.
 *
 * Re-export from every App Router `route.ts` so browsers, CDNs, and uptime probes
 * never receive a framework 405 for pre-flight or health-style HEAD checks:
 *
 *   export { OPTIONS, HEAD } from '@/src/lib/preflight';
 *
 * CORS headers are applied globally by `proxy.ts` and `next.config.js`.
 */

export function OPTIONS(): Response {
  return new NextResponse(null, { status: 204 });
}

export function HEAD(): Response {
  return new NextResponse(null, { status: 200 });
}
