// utils/circuit-breaker.ts
class CircuitBreaker {
    private failureCount = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
    private nextAttempt = Date.now();
    private threshold = 3; // ৩ বার ফেল করলে ওপেন হবে
    private timeout = 30000; // ৩০ সেকেন্ড পর আবার চেষ্টা করবে

    async fire(action: Function): Promise<any> {
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
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.warn('[Circuit Breaker] Threshold reached. State changed to OPEN.');
        }
    }
}

export const twilioCircuitBreaker = new CircuitBreaker();