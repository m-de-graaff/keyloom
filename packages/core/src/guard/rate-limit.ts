export type RateLimitOptions = {
  capacity?: number; // bucket capacity
  refillPerSec?: number; // tokens per second
};

export interface RateLimiter {
  allow(key: string, opts?: RateLimitOptions): Promise<boolean>;
}

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { capacity = 10, refillPerSec = 1 }: RateLimitOptions = {}
) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const delta = Math.max(0, now - b.updatedAt) / 1000;
  b.tokens = Math.min(capacity, b.tokens + delta * (refillPerSec ?? 1));
  b.updatedAt = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export function inMemoryRateLimiter(): RateLimiter {
  return {
    async allow(key: string, opts?: RateLimitOptions) {
      return rateLimit(key, opts);
    },
  };
}
