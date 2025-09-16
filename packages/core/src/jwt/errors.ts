/**
 * JWT-specific error codes and error handling
 */

export const JWT_ERRORS = {
  JWT_MALFORMED: 'jwt_malformed',
  JWT_EXPIRED: 'jwt_expired',
  JWT_NOT_BEFORE: 'jwt_not_before',
  JWT_INVALID_SIGNATURE: 'jwt_invalid_signature',
  JWT_INVALID_ISSUER: 'jwt_invalid_issuer',
  JWT_INVALID_AUDIENCE: 'jwt_invalid_audience',
  JWT_UNKNOWN_KID: 'jwt_unknown_kid',
  JWT_UNSUPPORTED_ALGORITHM: 'jwt_unsupported_algorithm',
  
  // Refresh token errors
  REFRESH_TOKEN_INVALID: 'refresh_token_invalid',
  REFRESH_TOKEN_EXPIRED: 'refresh_token_expired',
  REFRESH_TOKEN_REVOKED: 'refresh_token_revoked',
  REFRESH_TOKEN_REUSE_DETECTED: 'refresh_token_reuse_detected',
  REFRESH_TOKEN_FAMILY_REVOKED: 'refresh_token_family_revoked',
  
  // Keystore errors
  KEYSTORE_NO_ACTIVE_KEY: 'keystore_no_active_key',
  KEYSTORE_KEY_NOT_FOUND: 'keystore_key_not_found',
  KEYSTORE_INVALID_KEY: 'keystore_invalid_key',
} as const

export type JwtErrorCode = typeof JWT_ERRORS[keyof typeof JWT_ERRORS]

export class JwtError extends Error {
  constructor(
    public code: JwtErrorCode,
    message?: string,
    public cause?: Error
  ) {
    super(message || code)
    this.name = 'JwtError'
  }
}

export function isJwtError(error: unknown): error is JwtError {
  return error instanceof JwtError
}

/**
 * Helper to throw JWT errors with consistent formatting
 */
export function throwJwtError(code: JwtErrorCode, message?: string, cause?: Error): never {
  throw new JwtError(code, message, cause)
}
