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
  baseDelayMs: 2000, // Increased base delay for API stability
  maxDelayMs: 30000,
  retryableErrors: (error: any) => {
    // Check various error formats for status codes
    const status = error?.status ?? error?.statusCode ?? error?.response?.status;

    // Retry on 5xx errors
    if (status >= 500 && status < 600) return true;

    // Retry on rate limits
    if (status === 429) return true;

    // Network errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED') return true;

    // Check error message for common retryable patterns
    const errorStr = String(error?.message ?? error?.body ?? error ?? '').toLowerCase();
    if (errorStr.includes('502') || errorStr.includes('bad gateway')) return true;
    if (errorStr.includes('503') || errorStr.includes('service unavailable')) return true;
    if (errorStr.includes('504') || errorStr.includes('gateway timeout')) return true;
    if (errorStr.includes('overloaded') || errorStr.includes('rate limit') || errorStr.includes('too many requests')) return true;
    if (errorStr.includes('econnreset') || errorStr.includes('etimedout') || errorStr.includes('socket hang up')) return true;

    // Anthropic-specific errors
    if (error?.error?.type === 'overloaded_error') return true;

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

      const errorMsg = error instanceof Error ? error.message : String(error);
      const status = (error as any)?.status ?? (error as any)?.statusCode ?? 'unknown';
      console.log(
        `[retry] Attempt ${attempt + 1}/${opts.maxRetries} failed (status: ${status}), retrying in ${Math.round(delay)}ms...`,
        errorMsg.substring(0, 200)
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
