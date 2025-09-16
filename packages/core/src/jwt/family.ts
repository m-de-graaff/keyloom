/**
 * JWT Token Family and JTI (JWT ID) utilities
 * Used for refresh token rotation and reuse detection
 */

/**
 * Generate a new family ID for refresh token rotation
 * All tokens in a rotation family share this ID
 */
export function newFamilyId(): string {
  return crypto.randomUUID()
}

/**
 * Generate a new JTI (JWT ID) for token identification
 */
export function newJti(): string {
  return crypto.randomUUID()
}

/**
 * Generate a cryptographically secure random token
 * Used for the opaque part of refresh tokens
 */
export function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

/**
 * Create an opaque refresh token with family ID, JTI, and random component
 * Format: {familyId}.{jti}.{randomToken}
 */
export function createOpaqueRefreshToken(familyId: string, jti: string): string {
  const randomPart = generateSecureToken(32)
  return `${familyId}.${jti}.${randomPart}`
}

/**
 * Parse an opaque refresh token to extract components
 */
export function parseOpaqueRefreshToken(token: string): {
  familyId: string
  jti: string
  randomPart: string
} | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [familyId, jti, randomPart] = parts

  // Basic validation
  if (!familyId || !jti || !randomPart) {
    return null
  }

  return { familyId, jti, randomPart }
}

/**
 * Validate that a token follows the expected opaque format
 */
export function isValidOpaqueTokenFormat(token: string): boolean {
  return parseOpaqueRefreshToken(token) !== null
}
