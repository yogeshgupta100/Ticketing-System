export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter: number;
  message: string;
}

export class RateLimitHandler {
  private attempts: Map<string, number> = new Map();
  private lastAttemptTime: Map<string, number> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60000;

  shouldRateLimit(key: string): RateLimitInfo {
    const now = Date.now();
    const lastAttempt = this.lastAttemptTime.get(key) || 0;
    const attempts = this.attempts.get(key) || 0;

    if (now - lastAttempt > this.windowMs) {
      this.attempts.set(key, 0);
      this.lastAttemptTime.set(key, now);
      return {
        isRateLimited: false,
        retryAfter: 0,
        message: "",
      };
    }

    if (attempts >= this.maxAttempts) {
      const retryAfter = Math.ceil(
        (this.windowMs - (now - lastAttempt)) / 1000
      );
      return {
        isRateLimited: true,
        retryAfter,
        message: `Too many attempts. Please wait ${retryAfter} seconds before trying again.`,
      };
    }

    return {
      isRateLimited: false,
      retryAfter: 0,
      message: "",
    };
  }

  recordAttempt(key: string): void {
    const attempts = this.attempts.get(key) || 0;
    this.attempts.set(key, attempts + 1);
    this.lastAttemptTime.set(key, Date.now());
  }

  reset(key: string): void {
    this.attempts.delete(key);
    this.lastAttemptTime.delete(key);
  }

  getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000);
  }
}

export const rateLimitHandler = new RateLimitHandler();

export const withRateLimit = async <T>(
  key: string,
  apiCall: () => Promise<T>,
  onRateLimited?: (info: RateLimitInfo) => void
): Promise<T> => {
  const rateLimitInfo = rateLimitHandler.shouldRateLimit(key);

  if (rateLimitInfo.isRateLimited) {
    if (onRateLimited) {
      onRateLimited(rateLimitInfo);
    }
    throw new Error(rateLimitInfo.message);
  }

  try {
    rateLimitHandler.recordAttempt(key);
    const result = await apiCall();
    rateLimitHandler.reset(key);
    return result;
  } catch (error) {
    throw error;
  }
};
