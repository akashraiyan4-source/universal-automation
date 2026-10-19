// utils/circuit-breaker.ts
// Circuit Breaker for flaky third-party calls (Twilio SMS, AI webhooks): after `threshold` consecutive
// failures it fails fast for `timeout` ms instead of piling more requests onto a struggling upstream.
type State = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

class CircuitBreaker {
    private failureCount = 0;
    private state: State = 'CLOSED';
    private nextAttempt = Date.now();

    constructor(private readonly threshold = 3, private readonly timeout = 30_000) {}

    async fire<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() > this.nextAttempt) {
                this.state = 'HALF-OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
            }
        }

        try {
            const result = await action();
            this.reset();
            return result;
        } catch (error) {
            this.handleFailure();
            throw error;
        }
    }

    private reset() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    private handleFailure() {
        this.failureCount++;
        if (this.state === 'HALF-OPEN' || this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.warn('[Circuit Breaker] Threshold reached. State changed to OPEN.');
        }
    }
}

export const twilioCircuitBreaker = new CircuitBreaker();
