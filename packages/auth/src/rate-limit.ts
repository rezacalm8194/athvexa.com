export type RateLimitState = {
  attempts: number;
  resetAt: number;
  lockedUntil?: number;
};

export class MemoryRateLimiter {
  private readonly attempts = new Map<string, RateLimitState>();

  constructor(
    private readonly options = {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 5,
      lockMs: 15 * 60 * 1000
    }
  ) {}

  check(key: string, now = Date.now()) {
    const state = this.attempts.get(key);

    if (!state || state.resetAt <= now) {
      return { allowed: true, remaining: this.options.maxAttempts };
    }

    if (state.lockedUntil && state.lockedUntil > now) {
      return { allowed: false, remaining: 0, retryAt: new Date(state.lockedUntil) };
    }

    return {
      allowed: state.attempts < this.options.maxAttempts,
      remaining: Math.max(this.options.maxAttempts - state.attempts, 0)
    };
  }

  recordFailure(key: string, now = Date.now()) {
    const current = this.attempts.get(key);
    const state =
      current && current.resetAt > now
        ? current
        : {
            attempts: 0,
            resetAt: now + this.options.windowMs
          };

    state.attempts += 1;

    if (state.attempts >= this.options.maxAttempts) {
      state.lockedUntil = now + this.options.lockMs;
    }

    this.attempts.set(key, state);
    return state;
  }

  recordSuccess(key: string) {
    this.attempts.delete(key);
  }
}
