/**
 * Back-compat re-export. Canonical implementation lives in `src/lib/circuit-breaker.ts`.
 * Existing imports (`@/app/utils/circuit-breaker`) keep working.
 */
export {
  CircuitBreaker,
  CircuitOpenError,
  circuitBreakers,
  twilioCircuitBreaker,
} from '@/src/lib/circuit-breaker';
