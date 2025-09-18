import { randToken } from "../crypto/random";
import { tokenHash } from "../crypto/token-hash";
import type { ID } from "../types";
import type { RbacAdapter } from "./types";

import { inMemoryRateLimiter, type RateLimiter } from "../guard/rate-limit";

// Rate limiter instance (process-local by default). For production, pass a RedisRateLimiter.
const defaultLimiter: RateLimiter = inMemoryRateLimiter();

export async function rateLimitInviteCreation(
  orgId: ID,
  email: string,
  limit = 10,
  windowMs = 60_000,
  limiter: RateLimiter = defaultLimiter
) {
  const key = `invite:create:${orgId}:${email.toLowerCase()}`;
  // Approximate a fixed window using token bucket: refill to match window
  const refillPerSec = limit / (windowMs / 1000);
  const ok = await limiter.allow(key, { capacity: limit, refillPerSec });
  if (!ok) throw new Error("rate_limited");
}

export async function issueInviteToken(
  _email: string,
  _orgId: string,
  _role: string,
  secret: string,
  ttlMinutes = 60 * 24 * 7
) {
  const token = randToken(32);
  const hash = await tokenHash(token, secret);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  return { token, tokenHash: hash, expiresAt };
}

export async function acceptInvite(opts: {
  adapter: RbacAdapter;
  orgId: ID;
  token: string;
  userId: ID;
  secret: string;
  roleFallback?: string; // if invite is missing role, default to this (default: 'member')
  userEmail?: string; // optional: enforce email-binding when provided
  rateLimiter?: RateLimiter; // optional: custom rate limiter (e.g., Redis)
}) {
  const {
    adapter,
    orgId,
    token,
    userId,
    secret,
    roleFallback = "member",
    userEmail,
    rateLimiter,
  } = opts;
  // Basic acceptance rate limit per user/org pair
  const limiter: RateLimiter = rateLimiter ?? defaultLimiter;
  const rlKey = `invite:accept:${orgId}:${userId}`;
  const ok = await limiter.allow(rlKey, { capacity: 5, refillPerSec: 5 / 60 });
  if (!ok) throw new Error("rate_limited");

  const hash = await tokenHash(token, secret);
  const invite = await adapter.getInviteByTokenHash(orgId, hash);
  if (!invite) throw new Error("invite_not_found");
  if (invite.acceptedAt) throw new Error("invite_already_used");
  if (invite.expiresAt.getTime() < Date.now())
    throw new Error("invite_expired");

  // Email-binding verification (case-insensitive)
  if (userEmail) {
    const invEmail = String(invite.email || "")
      .trim()
      .toLowerCase();
    const usrEmail = String(userEmail).trim().toLowerCase();
    if (invEmail && usrEmail && invEmail !== usrEmail) {
      throw new Error("invite_email_mismatch");
    }
  }

  // Consume first to avoid races; in DB adapters this should be done atomically in a txn
  await adapter.consumeInvite(invite.id);

  // Create membership
  const role = invite.role || roleFallback;
  const membership = await adapter.addMember({ userId, orgId, role });

  return { invite, membership };
}
