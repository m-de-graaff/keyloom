import {
  getPublicKeysForVerification,
  type JwtClaims,
  type Keystore,
  verifyJwtFull,
} from "@keyloom/core/jwt";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";

// JWT Cookie names
export const ACCESS_COOKIE = "__keyloom_access";
export const REFRESH_COOKIE = "__keyloom_refresh";

/**
 * JWKS cache for server-side verification
 */
class ServerJwksCache {
  private cache = new Map<string, { keystore: Keystore; expiresAt: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  async getKeystore(jwksUrl: string): Promise<Keystore | null> {
    const now = Date.now();
    const cached = this.cache.get(jwksUrl);

    if (cached && cached.expiresAt > now) {
      return cached.keystore;
    }

    try {
      const response = await fetch(jwksUrl, {
        headers: { Accept: "application/json" },
        // 'next' is a Next.js extension; cast to any to satisfy TS in non-Next libs
        next: { revalidate: 300 }, // 5 minutes
      } as any);

      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`);
      }

      const data: any = await response.json();

      // Convert JWKS to keystore format
      const keystore: Keystore = {
        active: {
          kid: (data.keys?.[0]?.kid as string | undefined) || "unknown",
          privateJwk: {}, // Not available in public JWKS
          publicJwk: (data.keys?.[0] as any) || {},
          createdAt: new Date().toISOString(),
        },
        previous: (data.keys || []).slice(1).map((key: any) => ({
          kid: (key?.kid as string | undefined) || "unknown",
          privateJwk: {},
          publicJwk: key,
          createdAt: new Date().toISOString(),
        })),
      };

      this.cache.set(jwksUrl, {
        keystore,
        expiresAt: now + this.cacheTTL,
      });

      return keystore;
    } catch (error) {
      console.error("Failed to fetch JWKS:", error);
      return cached?.keystore || null;
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const serverJwksCache = new ServerJwksCache();

/**
 * JWT configuration for Next.js
 */
export interface JwtConfig {
  jwksUrl: string;
  expectedIssuer?: string;
  expectedAudience?: string | string[];
  clockSkewSec?: number;
}

/**
 * Extract access token from Next.js request/headers
 */
export function extractAccessToken(req?: NextRequest): string | null {
  if (req) {
    // From NextRequest (middleware)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return req.cookies.get(ACCESS_COOKIE)?.value || null;
  } else {
    // From Next.js headers() (server components/API routes)
    try {
      const headersList: any = headers() as any;
      const authHeader = headersList.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
      }

      const cookieStore: any = cookies() as any;
      return cookieStore.get(ACCESS_COOKIE)?.value || null;
    } catch {
      return null;
    }
  }
}

/**
 * Extract refresh token from Next.js request/cookies
 */
export function extractRefreshToken(req?: NextRequest): string | null {
  if (req) {
    return req.cookies.get(REFRESH_COOKIE)?.value || null;
  } else {
    try {
      const cookieStore: any = cookies() as any;
      return cookieStore.get(REFRESH_COOKIE)?.value || null;
    } catch {
      return null;
    }
  }
}

/**
 * Verify JWT token server-side
 */
export async function verifyJwtToken(
  token: string,
  config: JwtConfig
): Promise<{
  valid: boolean;
  claims?: JwtClaims;
  error?: string;
}> {
  try {
    const keystore = await serverJwksCache.getKeystore(config.jwksUrl);
    if (!keystore) {
      return { valid: false, error: "Failed to fetch JWKS" };
    }

    const publicKeys = getPublicKeysForVerification(keystore);
    const verifyOpts: {
      expectedIssuer?: string;
      expectedAudience?: string | string[];
      clockSkewSec?: number;
    } = {};
    if (config.expectedIssuer !== undefined)
      verifyOpts.expectedIssuer = config.expectedIssuer;
    if (config.expectedAudience !== undefined)
      verifyOpts.expectedAudience = config.expectedAudience;
    if (config.clockSkewSec !== undefined)
      verifyOpts.clockSkewSec = config.clockSkewSec;
    const { claims } = await verifyJwtFull(token, publicKeys, verifyOpts);

    return { valid: true, claims };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Get current JWT session (server-side)
 */
export async function getJwtSession(
  config: JwtConfig,
  req?: NextRequest
): Promise<{
  user: { id: string; email?: string } | null;
  session: { id: string; userId: string; expiresAt: Date } | null;
  claims?: JwtClaims;
}> {
  const accessToken = extractAccessToken(req);

  if (!accessToken) {
    return { user: null, session: null };
  }

  const result = await verifyJwtToken(accessToken, config);

  if (!result.valid || !result.claims) {
    return { user: null, session: null };
  }

  const claims = result.claims;

  const email =
    typeof (claims as any).email === "string"
      ? ((claims as any).email as string)
      : undefined;
  const userOut: { id: string; email?: string } = { id: claims.sub };
  if (email !== undefined) userOut.email = email;
  return {
    user: userOut,
    session: {
      id: claims.sid || claims.sub,
      userId: claims.sub,
      expiresAt: new Date(claims.exp * 1000),
    },
    claims,
  };
}

/**
 * Require JWT authentication (throws if not authenticated)
 */
export async function requireJwtAuth(
  config: JwtConfig,
  req?: NextRequest
): Promise<{
  user: { id: string; email?: string };
  session: { id: string; userId: string; expiresAt: Date };
  claims: JwtClaims;
}> {
  const result = await getJwtSession(config, req);

  if (!result.user || !result.session || !result.claims) {
    throw new Error("Authentication required");
  }

  return {
    user: result.user,
    session: result.session,
    claims: result.claims,
  };
}

/**
 * Create JWT configuration from environment
 */
export function createJwtConfig(env: {
  KEYLOOM_JWT_JWKS_URL?: string;
  KEYLOOM_JWT_ISSUER?: string;
  KEYLOOM_JWT_AUDIENCE?: string;
  KEYLOOM_JWT_CLOCK_SKEW_SEC?: string;
}): JwtConfig {
  const jwksUrl = env.KEYLOOM_JWT_JWKS_URL;
  if (!jwksUrl) {
    throw new Error("KEYLOOM_JWT_JWKS_URL environment variable is required");
  }

  const out: JwtConfig = {
    jwksUrl,
    clockSkewSec: env.KEYLOOM_JWT_CLOCK_SKEW_SEC
      ? parseInt(env.KEYLOOM_JWT_CLOCK_SKEW_SEC, 10)
      : 60,
  } as any;
  if (typeof env.KEYLOOM_JWT_ISSUER === "string")
    (out as any).expectedIssuer = env.KEYLOOM_JWT_ISSUER;
  if (typeof env.KEYLOOM_JWT_AUDIENCE === "string")
    (out as any).expectedAudience = env.KEYLOOM_JWT_AUDIENCE;
  return out;
}

/**
 * Clear JWKS cache (for testing or manual refresh)
 */
export function clearServerJwksCache(): void {
  serverJwksCache.clear();
}
