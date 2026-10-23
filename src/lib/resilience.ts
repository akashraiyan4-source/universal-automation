import { withTimeout } from './async';
import { CircuitBreaker, CircuitOpenError, circuitBreakers, type CircuitName } from './circuit-breaker';

export { CircuitOpenError, circuitBreakers, twilioCircuitBreaker } from './circuit-breaker';

export interface ProtectOptions<T> {
  /** Named breaker, or a custom instance. */
  service: CircuitName | CircuitBreaker;
  action: () => Promise<T>;
  /** Hard timeout for this attempt. Default 8s. */
  timeoutMs?: number;
  label?: string;
  /** When set, circuit-open / timeout / upstream errors return this instead of throwing. */
  fallback?: T | (() => T | Promise<T>);
}

function resolveBreaker(service: CircuitName | CircuitBreaker): CircuitBreaker {
  return service instanceof CircuitBreaker ? service : circuitBreakers[service];
}

async function resolveFallback<T>(fallback: T | (() => T | Promise<T>)): Promise<T> {
  return typeof fallback === 'function' ? await (fallback as () => T | Promise<T>)() : fallback;
}

/**
 * Run an upstream call behind a circuit breaker + timeout.
 *
 * - Success → result, circuit stays/returns CLOSED.
 * - Failure with `fallback` → fallback value (server stays up).
 * - Failure without `fallback` → original error (caller decides).
 * - Open circuit with `fallback` → fallback immediately (no upstream hit).
 * - Open circuit without `fallback` → `CircuitOpenError`.
 */
export async function protect<T>(options: ProtectOptions<T>): Promise<T> {
  const breaker = resolveBreaker(options.service);
  const timeoutMs = options.timeoutMs ?? 8_000;
  const label = options.label ?? breaker.name;

  const run = () =>
    breaker.fire(() => withTimeout(options.action(), timeoutMs, label));

  if (options.fallback !== undefined) {
    try {
      return await run();
    } catch (error) {
      if (!(error instanceof CircuitOpenError)) {
        console.warn(`[protect] ${label} failed:`, error instanceof Error ? error.message : error);
      }
      return resolveFallback(options.fallback);
    }
  }

  return run();
}
