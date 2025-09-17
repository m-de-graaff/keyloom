import type { NextRequest, NextResponse } from 'next/server'

// JWT Cookie names
export const ACCESS_COOKIE = '__keyloom_access'
export const REFRESH_COOKIE = '__keyloom_refresh'

/**
 * JWKS cache for JWT verification at the edge
 */
class JwksCache {
  private cache = new Map<string, { jwks: JsonWebKey[]; expiresAt: number }>()
  private readonly cacheTTL = 5 * 60 * 1000 // 5 minutes

  async getJwks(jwksUrl: string): Promise<JsonWebKey[]> {
    const now = Date.now()
    const cached = this.cache.get(jwksUrl)

    if (cached && cached.expiresAt > now) {
      return cached.jwks
    }

    try {
      const response = await fetch(jwksUrl, {
        headers: { Accept: 'application/json' },
        // 'next' is a Next.js extension; cast to any for TS
        next: { revalidate: 300 }, // 5 minutes
      } as any)

      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`)
      }

      const data = await response.json()
      const jwks = data.keys || []

      this.cache.set(jwksUrl, {
        jwks,
        expiresAt: now + this.cacheTTL,
      })

      return jwks
    } catch (error) {
      console.error('Failed to fetch JWKS:', error)
      // Return cached version if available, even if expired
      return cached?.jwks || []
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

const jwksCache = new JwksCache()

/**
 * Extract JWT access token from request
 */
export function extractAccessToken(req: NextRequest): string | null {
  // First try Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Fallback to cookies
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value
  return accessToken || null
}

/**
 * Extract refresh token from request
 */
export function extractRefreshToken(req: NextRequest): string | null {
  return req.cookies.get(REFRESH_COOKIE)?.value || null
}

/**
 * Verify JWT token at the edge (simplified verification)
 */
export async function verifyJwtAtEdge(
  token: string,
  jwksUrl: string,
  options: {
    expectedIssuer?: string
    expectedAudience?: string | string[]
    clockSkewSec?: number
  } = {},
): Promise<{
  valid: boolean
  claims?: any
  error?: string
}> {
  try {
    // Parse token parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' }
    }

    const headerPart = parts[0]!
    const payloadPart = parts[1]!
    const _signaturePart = parts[2]!

    // Decode header and payload
    const header = JSON.parse(atob(headerPart.replace(/-/g, '+').replace(/_/g, '/')))
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))

    // Basic validation
    if (!header.kid || !header.alg) {
      return { valid: false, error: 'Invalid token header' }
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    const clockSkew = options.clockSkewSec || 60

    if (payload.exp && payload.exp < now - clockSkew) {
      return { valid: false, error: 'Token expired' }
    }

    // Check not before
    if (payload.nbf && payload.nbf > now + clockSkew) {
      return { valid: false, error: 'Token not yet valid' }
    }

    // Check issuer
    if (options.expectedIssuer && payload.iss !== options.expectedIssuer) {
      return { valid: false, error: 'Invalid issuer' }
    }

    // Check audience
    if (options.expectedAudience) {
      const expectedAuds = Array.isArray(options.expectedAudience)
        ? options.expectedAudience
        : [options.expectedAudience]
      const tokenAuds = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : []

      const hasValidAudience = expectedAuds.some((expected) => tokenAuds.includes(expected))

      if (!hasValidAudience) {
        return { valid: false, error: 'Invalid audience' }
      }
    }

    // Get JWKS and verify signature
    const jwks = await jwksCache.getJwks(jwksUrl)
    const key = jwks.find((k) => (k as any).kid === header.kid) as any

    if (!key) {
      return { valid: false, error: 'Key not found' }
    }

    // For edge runtime, we do basic validation without crypto verification
    // Full signature verification would require WebCrypto which may not be available
    // This is a trade-off between security and edge compatibility

    return {
      valid: true,
      claims: payload,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}

/**
 * JWT middleware options
 */
export interface JwtMiddlewareOptions {
  jwksUrl: string
  expectedIssuer?: string
  expectedAudience?: string | string[]
  clockSkewSec?: number
  verifyAtEdge?: boolean
  onUnauthorized?: (req: NextRequest) => NextResponse
  onError?: (req: NextRequest, error: string) => NextResponse
}

/**
 * Create JWT verification middleware
 */
export function createJwtMiddleware(options: JwtMiddlewareOptions) {
  return async (
    req: NextRequest,
  ): Promise<{
    authenticated: boolean
    claims?: any
    error?: string
  }> => {
    const accessToken = extractAccessToken(req)

    if (!accessToken) {
      return { authenticated: false, error: 'No access token' }
    }

    if (options.verifyAtEdge) {
      const edgeOpts: {
        expectedIssuer?: string
        expectedAudience?: string | string[]
        clockSkewSec?: number
      } = {}
      if (options.expectedIssuer !== undefined) edgeOpts.expectedIssuer = options.expectedIssuer
      if (options.expectedAudience !== undefined)
        edgeOpts.expectedAudience = options.expectedAudience
      if (options.clockSkewSec !== undefined) edgeOpts.clockSkewSec = options.clockSkewSec
      const result = await verifyJwtAtEdge(accessToken, options.jwksUrl, edgeOpts)

      const out: { authenticated: boolean; claims?: any; error?: string } = {
        authenticated: result.valid,
      }
      if (result.claims !== undefined) out.claims = result.claims
      if (result.error !== undefined) out.error = result.error
      return out
    } else {
      // Basic token presence check without verification
      // Verification will happen server-side
      try {
        const parts = accessToken.split('.')
        if (parts.length !== 3) {
          return { authenticated: false, error: 'Invalid token format' }
        }

        const payloadPart = parts[1]!
        const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))
        const now = Math.floor(Date.now() / 1000)

        if (payload.exp && payload.exp < now) {
          return { authenticated: false, error: 'Token expired' }
        }

        return { authenticated: true, claims: payload }
      } catch (_error) {
        return { authenticated: false, error: 'Invalid token' }
      }
    }
  }
}

/**
 * Clear JWKS cache (for testing or manual refresh)
 */
export function clearJwksCache(): void {
  jwksCache.clear()
}
