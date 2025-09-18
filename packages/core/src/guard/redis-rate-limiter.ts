// Redis-backed rate limiter (best-effort, dependency-free typings)
// Expects a Redis client compatible with ioredis or node-redis command methods
// Strategy: token bucket approximated via a simple counter with TTL window
// For stricter guarantees, replace with a Lua script managing tokens precisely.

import type { RateLimiter } from "./rate-limit";

export type RedisClientLike = {
  incr: (key: string) => Promise<number> | number;
  pttl?: (key: string) => Promise<number> | number;
  ttl?: (key: string) => Promise<number> | number;
  expire: (key: string, seconds: number) => Promise<any> | any;
};

export type RedisWindowOptions = {
  capacity?: number; // max operations per window
  windowSec?: number; // window size in seconds
};

export class RedisRateLimiter implements RateLimiter {
  constructor(private redis: RedisClientLike) {}

  async allow(key: string, opts: RedisWindowOptions = {}): Promise<boolean> {
    const capacity = opts.capacity ?? 10;
    const windowSec = opts.windowSec ?? 60;
    const nowKey = `rl:${key}`;
    const n = await this.redis.incr(nowKey as string);
    // If first hit, set TTL for the window
    if (n === 1) {
      await this.redis.expire(nowKey, windowSec);
    }
    return n <= capacity;
  }
}
