import { describeConfig } from '@/src/lib/env';
import { ok, withApi } from '@/src/lib/api';

/** GET /health   (alias: GET /api/health) – liveness probe. Reports booleans only, never secrets. */
export const GET = withApi(() =>
  ok(
    { status: 'ok', service: 'universal-automation-backend', time: new Date().toISOString(), config: describeConfig() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
);

export { OPTIONS, HEAD } from '@/src/lib/preflight';
