/**
 * Retry utility with exponential backoff and circuit breaker
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: (error: any) => {
    // Retry on 5xx errors, rate limits, and network errors
    if (error?.status >= 500 && error?.status < 600) return true;
    if (error?.status === 429) return true; // Rate limit
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') return true;
    if (error?.message?.includes('502') || error?.message?.includes('503')) return true;
    if (error?.message?.includes('overloaded') || error?.message?.includes('rate limit')) return true;
    return false;
  },
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= opts.maxRetries || !opts.retryableErrors(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
      const delay = Math.min(exponentialDelay + jitter, opts.maxDelayMs);

      console.log(
        `[retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${Math.round(delay)}ms...`,
        error instanceof Error ? error.message : error
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Circuit breaker for API calls
 * Tracks failures and provides a cooldown period when threshold is exceeded
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private isOpen = false;

  constructor(
    private readonly name: string,
    private readonly failureThreshold: number = 3,
    private readonly cooldownMs: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  /**
   * Check if circuit is open (should skip calls)
   */
  isCircuitOpen(): boolean {
    if (!this.isOpen) return false;

    // Check if cooldown period has passed
    const now = Date.now();
    if (now - this.lastFailureTime >= this.cooldownMs) {
      console.log(`[circuit-breaker:${this.name}] Cooldown period passed, resetting circuit`);
      this.reset();
      return false;
    }

    return true;
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.failureCount = 0;
    if (this.isOpen) {
      console.log(`[circuit-breaker:${this.name}] Circuit closed after successful call`);
      this.isOpen = false;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold && !this.isOpen) {
      console.log(
        `[circuit-breaker:${this.name}] Circuit opened after ${this.failureCount} consecutive failures. ` +
        `Cooldown: ${Math.round(this.cooldownMs / 1000)}s`
      );
      this.isOpen = true;
    }
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.isOpen = false;
  }

  /**
   * Get remaining cooldown time in milliseconds (0 if not in cooldown)
   */
  getRemainingCooldownMs(): number {
    if (!this.isOpen) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.cooldownMs - elapsed);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
