/**
 * Generic OAuth error codes for authentication flows.
 * These errors are commonly encountered during OAuth provider authentication.
 */
export const GENERIC_OAUTH_ERROR_CODES = {
  /** OAuth provider returned an error during authorization */
  OAUTH_PROVIDER_ERROR: "authentication failed with provider",
  
  /** OAuth state parameter is missing or invalid */
  OAUTH_STATE_MISMATCH: "authentication state mismatch",
  
  /** OAuth authorization code is missing or invalid */
  OAUTH_CODE_MISSING: "authorization code missing",
  
  /** Failed to exchange authorization code for access token */
  TOKEN_EXCHANGE_FAILED: "failed to exchange authorization code",
  
  /** Failed to fetch user profile from OAuth provider */
  PROFILE_FETCH_FAILED: "failed to fetch user profile",
  
  /** OAuth provider denied access or user cancelled */
  ACCESS_DENIED: "access denied by provider",
  
  /** OAuth provider configuration is invalid or missing */
  PROVIDER_CONFIG_INVALID: "provider configuration invalid",
  
  /** OAuth provider is temporarily unavailable */
  PROVIDER_UNAVAILABLE: "provider temporarily unavailable",
  
  /** OAuth scope requested is invalid or insufficient */
  INVALID_SCOPE: "invalid or insufficient scope",
  
  /** OAuth redirect URI mismatch */
  REDIRECT_URI_MISMATCH: "redirect uri mismatch",
  
  /** OAuth client credentials are invalid */
  INVALID_CLIENT: "invalid client credentials",
  
  /** OAuth request is malformed or missing required parameters */
  INVALID_REQUEST: "invalid oauth request",
  
  /** OAuth grant type is not supported */
  UNSUPPORTED_GRANT_TYPE: "unsupported grant type",
  
  /** OAuth response type is not supported */
  UNSUPPORTED_RESPONSE_TYPE: "unsupported response type",
  
  /** OAuth token has expired */
  TOKEN_EXPIRED: "authentication token expired",
  
  /** OAuth token is invalid or malformed */
  INVALID_TOKEN: "invalid authentication token",
  
  /** OAuth refresh token is invalid or expired */
  INVALID_REFRESH_TOKEN: "invalid refresh token",
  
  /** Rate limit exceeded for OAuth requests */
  RATE_LIMIT_EXCEEDED: "too many authentication attempts",
  
  /** Network error during OAuth flow */
  NETWORK_ERROR: "network error during authentication",
  
  /** Generic OAuth error when specific cause is unknown */
  UNKNOWN_OAUTH_ERROR: "authentication failed",
} as const

/**
 * Type for OAuth error code keys
 */
export type GenericOAuthErrorCode = keyof typeof GENERIC_OAUTH_ERROR_CODES

/**
 * Type for OAuth error messages
 */
export type GenericOAuthErrorMessage = typeof GENERIC_OAUTH_ERROR_CODES[GenericOAuthErrorCode]
