import type { AccessTokenClaims, JwtClaims } from './types'

/**
 * Parse a time duration string (e.g., '10m', '1h', '30d') to seconds
 */
export function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like '10m', '1h', '30d'`)
  }

  const value = match[1] as string
  const unit = match[2] as 's' | 'm' | 'h' | 'd'
  const num = parseInt(value, 10)

  switch (unit) {
    case 's':
      return num
    case 'm':
      return num * 60
    case 'h':
      return num * 60 * 60
    case 'd':
      return num * 60 * 60 * 24
    default:
      throw new Error(`Unsupported time unit: ${unit}`)
  }
}

/**
 * Create access token claims
 */
export function newAccessClaims(params: {
  sub: string
  sid?: string
  org?: string
  role?: string
  iss: string
  aud?: string | string[]
  ttlSec: number
}): AccessTokenClaims {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + params.ttlSec

  const claims: AccessTokenClaims = {
    iss: params.iss,
    sub: params.sub,
    iat: now,
    exp,
  }

  if (params.aud) {
    claims.aud = params.aud
  }

  if (params.sid) {
    claims.sid = params.sid
  }

  if (params.org) {
    claims.org = params.org
  }

  if (params.role) {
    claims.role = params.role
  }

  return claims
}

/**
 * Validate JWT claims structure
 */
export function validateJwtClaims(claims: unknown): claims is JwtClaims {
  if (!claims || typeof claims !== 'object') {
    return false
  }

  const c = claims as Record<string, unknown>

  return (
    typeof c.iss === 'string' &&
    typeof c.sub === 'string' &&
    typeof c.iat === 'number' &&
    typeof c.exp === 'number' &&
    (c.aud === undefined || typeof c.aud === 'string' || Array.isArray(c.aud))
  )
}

/**
 * Check if JWT claims are expired
 */
export function isExpired(claims: JwtClaims, clockSkewSec = 0): boolean {
  const now = Math.floor(Date.now() / 1000)
  return claims.exp < now - clockSkewSec
}

/**
 * Check if JWT claims are not yet valid (nbf check)
 */
export function isNotYetValid(claims: JwtClaims & { nbf?: number }, clockSkewSec = 0): boolean {
  if (!claims.nbf) return false
  const now = Math.floor(Date.now() / 1000)
  return claims.nbf > now + clockSkewSec
}

/**
 * Validate JWT claims timing (exp, nbf, iat)
 */
export function validateClaimsTiming(
  claims: JwtClaims & { nbf?: number },
  clockSkewSec = 60,
): void {
  if (isExpired(claims, clockSkewSec)) {
    throw new Error('JWT token has expired')
  }

  if (isNotYetValid(claims, clockSkewSec)) {
    throw new Error('JWT token is not yet valid')
  }
}

/**
 * Validate JWT issuer
 */
export function validateIssuer(claims: JwtClaims, expectedIssuer: string): void {
  if (claims.iss !== expectedIssuer) {
    throw new Error(`Invalid issuer. Expected: ${expectedIssuer}, got: ${claims.iss}`)
  }
}

/**
 * Validate JWT audience
 */
export function validateAudience(claims: JwtClaims, expectedAudience?: string | string[]): void {
  if (!expectedAudience) return

  const audiences = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience]
  const claimAudiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : []

  const hasValidAudience = audiences.some((expected) => claimAudiences.includes(expected))

  if (!hasValidAudience) {
    throw new Error(
      `Invalid audience. Expected one of: ${audiences.join(
        ', ',
      )}, got: ${claimAudiences.join(', ')}`,
    )
  }
}
