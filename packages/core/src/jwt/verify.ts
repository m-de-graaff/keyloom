import { decodeBase64urlToJson } from './base64url'
import { validateJwtClaims } from './claims'
import { JWT_ERRORS, throwJwtError } from './errors'
import { getWebCryptoAlgorithm, validateJwtHeader } from './header'
import type { Jwk, JwtClaims, JwtHeader } from './types'

/**
 * Verify a JWT token using JWKS (JSON Web Key Set)
 */
export async function verifyJwt(
  token: string,
  jwks: Jwk[],
): Promise<{ header: JwtHeader; claims: JwtClaims }> {
  // Split the token into parts
  const parts = token.split('.')
  if (parts.length !== 3) {
    throwJwtError(JWT_ERRORS.JWT_MALFORMED, 'JWT must have exactly 3 parts')
  }

  const [headerPart, payloadPart, signaturePart] = parts

  if (!headerPart || !payloadPart || !signaturePart) {
    throwJwtError(JWT_ERRORS.JWT_MALFORMED, 'JWT parts cannot be empty')
  }

  // Decode header and payload
  let header: unknown
  let claims: unknown

  try {
    header = decodeBase64urlToJson(headerPart)
    claims = decodeBase64urlToJson(payloadPart)
  } catch (error) {
    throwJwtError(JWT_ERRORS.JWT_MALFORMED, 'Failed to decode JWT parts', error as Error)
  }

  // Validate header structure
  if (!validateJwtHeader(header)) {
    throwJwtError(JWT_ERRORS.JWT_MALFORMED, 'Invalid JWT header structure')
  }

  // Validate claims structure
  if (!validateJwtClaims(claims)) {
    throwJwtError(JWT_ERRORS.JWT_MALFORMED, 'Invalid JWT claims structure')
  }

  // Find the matching key in JWKS
  const jwk = jwks.find((key) => key.kid === header.kid)
  if (!jwk) {
    throwJwtError(JWT_ERRORS.JWT_UNKNOWN_KID, `No key found for kid: ${header.kid}`)
  }

  // Import the public key
  let publicKey: CryptoKey
  try {
    const algorithm = getWebCryptoAlgorithm(header.alg)
    publicKey = await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['verify'])
  } catch (error) {
    throwJwtError(JWT_ERRORS.KEYSTORE_INVALID_KEY, 'Failed to import public key', error as Error)
  }

  // Verify the signature
  const signingInput = `${headerPart}.${payloadPart}`
  const signingInputBytes = new TextEncoder().encode(signingInput)
  const signatureBytes = Buffer.from(signaturePart, 'base64url')

  let isValid: boolean
  try {
    const algorithm = getWebCryptoAlgorithm(header.alg)
    isValid = await crypto.subtle.verify(algorithm, publicKey, signatureBytes, signingInputBytes)
  } catch (error) {
    throwJwtError(JWT_ERRORS.JWT_INVALID_SIGNATURE, 'Signature verification failed', error as Error)
  }

  if (!isValid) {
    throwJwtError(JWT_ERRORS.JWT_INVALID_SIGNATURE, 'JWT signature is invalid')
  }

  return { header, claims }
}

/**
 * Verify JWT and validate timing claims (exp, nbf)
 */
export async function verifyJwtWithTiming(
  token: string,
  jwks: Jwk[],
  clockSkewSec = 60,
): Promise<{ header: JwtHeader; claims: JwtClaims }> {
  const result = await verifyJwt(token, jwks)

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (result.claims.exp < now - clockSkewSec) {
    throwJwtError(JWT_ERRORS.JWT_EXPIRED, 'JWT token has expired')
  }

  // Check not before (if present)
  const nbf = (result.claims as JwtClaims & { nbf?: number }).nbf
  if (typeof nbf === 'number' && nbf > now + clockSkewSec) {
    throwJwtError(JWT_ERRORS.JWT_NOT_BEFORE, 'JWT token is not yet valid')
  }

  return result
}

/**
 * Verify JWT with full validation (timing, issuer, audience)
 */
export async function verifyJwtFull(
  token: string,
  jwks: Jwk[],
  options: {
    clockSkewSec?: number
    expectedIssuer?: string
    expectedAudience?: string | string[]
  } = {},
): Promise<{ header: JwtHeader; claims: JwtClaims }> {
  const { clockSkewSec = 60, expectedIssuer, expectedAudience } = options

  const result = await verifyJwtWithTiming(token, jwks, clockSkewSec)

  // Validate issuer
  if (expectedIssuer && result.claims.iss !== expectedIssuer) {
    throwJwtError(
      JWT_ERRORS.JWT_INVALID_ISSUER,
      `Invalid issuer. Expected: ${expectedIssuer}, got: ${result.claims.iss}`,
    )
  }

  // Validate audience
  if (expectedAudience) {
    const audiences = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience]
    const claimAudiences = Array.isArray(result.claims.aud)
      ? result.claims.aud
      : result.claims.aud
        ? [result.claims.aud]
        : []

    const hasValidAudience = audiences.some((expected) => claimAudiences.includes(expected))

    if (!hasValidAudience) {
      throwJwtError(
        JWT_ERRORS.JWT_INVALID_AUDIENCE,
        `Invalid audience. Expected one of: ${audiences.join(
          ', ',
        )}, got: ${claimAudiences.join(', ')}`,
      )
    }
  }

  return result
}

/**
 * Extract JWT claims without verification (for debugging/inspection only)
 * WARNING: Never use this for authentication - always verify signatures!
 */
export function extractJwtClaims(token: string): JwtClaims {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  try {
    const payloadPart = parts[1] as string
    const claims = decodeBase64urlToJson(payloadPart)
    if (!validateJwtClaims(claims)) {
      throw new Error('Invalid JWT claims structure')
    }
    return claims
  } catch (error) {
    throw new Error(`Failed to extract JWT claims: ${error}`)
  }
}
