/**
 * Per-service circuit breaker.
 *
 * After `threshold` consecutive failures the circuit opens for `resetMs`, failing
 * fast (or serving a fallback) instead of pinning serverless invocations on a
 * dead upstream. A single success in HALF-OPEN closes the circuit again.
 *
 * State lives on `globalThis` so every route bundle / hot-reload shares it.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitOpenError extends Error {
  readonly service: string;
  constructor(service: string) {
    super(`${service} is temporarily unavailable (circuit open).`);
    this.name = 'CircuitOpenError';
    this.service = service;
  }
}

interface BreakerOptions {
  name: string;
  /** Consecutive failures before opening. */
  threshold?: number;
  /** How long to stay OPEN before a probe is allowed. */
  resetMs?: number;
}

interface BreakerSnapshot {
  failureCount: number;
  state: CircuitState;
  nextAttempt: number;
  successesInHalfOpen: number;
}

const globalBreakers = globalThis as unknown as { __circuitBreakers?: Map<string, BreakerSnapshot> };
const store = (globalBreakers.__circuitBreakers ??= new Map<string, BreakerSnapshot>());

function snapshot(name: string): BreakerSnapshot {
  let current = store.get(name);
  if (!current) {
    current = { failureCount: 0, state: 'CLOSED', nextAttempt: 0, successesInHalfOpen: 0 };
    store.set(name, current);
  }
  return current;
}

export class CircuitBreaker {
  readonly name: string;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(options: BreakerOptions) {
    this.name = options.name;
    this.threshold = options.threshold ?? 4;
    this.resetMs = options.resetMs ?? 20_000;
  }

  get state(): CircuitState {
    return snapshot(this.name).state;
  }

  async fire<T>(action: () => Promise<T>): Promise<T> {
    const snap = snapshot(this.name);
    if (snap.state === 'OPEN') {
      if (Date.now() >= snap.nextAttempt) {
        snap.state = 'HALF_OPEN';
        snap.successesInHalfOpen = 0;
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /** Like `fire`, but returns `fallback` when the circuit is open or the action throws. */
  async tryFire<T>(action: () => Promise<T>, fallback: T | (() => T | Promise<T>)): Promise<T> {
    try {
      return await this.fire(action);
    } catch {
      return typeof fallback === 'function' ? await (fallback as () => T | Promise<T>)() : fallback;
    }
  }

  private recordSuccess() {
    const snap = snapshot(this.name);
    snap.failureCount = 0;
    snap.successesInHalfOpen = 0;
    snap.state = 'CLOSED';
  }

  private recordFailure() {
    const snap = snapshot(this.name);
    snap.failureCount += 1;
    if (snap.state === 'HALF_OPEN' || snap.failureCount >= this.threshold) {
      snap.state = 'OPEN';
      snap.nextAttempt = Date.now() + this.resetMs;
      console.warn(`[CircuitBreaker] ${this.name} OPEN after ${snap.failureCount} failure(s); probe in ${this.resetMs}ms.`);
    }
  }
}

function breaker(name: string, threshold: number, resetMs: number): CircuitBreaker {
  return new CircuitBreaker({ name, threshold, resetMs });
}

/** One breaker per upstream. Shared across all routes. */
export const circuitBreakers = {
  gemini: breaker('gemini', 5, 20_000),
  twilio: breaker('twilio', 3, 30_000),
  supabase: breaker('supabase', 4, 15_000),
  google: breaker('google', 4, 15_000),
  retell: breaker('retell', 3, 20_000),
  default: breaker('upstream', 4, 20_000),
} as const;

export type CircuitName = keyof typeof circuitBreakers;

/** Back-compat export used by `/staffAlert`. */
export const twilioCircuitBreaker = circuitBreakers.twilio;
