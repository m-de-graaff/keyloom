/**
 * Username and credential validation error codes.
 * These errors are used for form validation and authentication failures.
 */
export const USERNAME_ERROR_CODES = {
  /** Username and password combination is invalid */
  INVALID_USERNAME_OR_PASSWORD: "invalid username or password",
  
  /** Email address is not verified */
  EMAIL_NOT_VERIFIED: "email not verified",
  
  /** Email address format is invalid */
  INVALID_EMAIL_FORMAT: "invalid email format",
  
  /** Email address is required but missing */
  EMAIL_REQUIRED: "email is required",
  
  /** Email address is already in use */
  EMAIL_ALREADY_EXISTS: "email already exists",
  
  /** Username format is invalid */
  INVALID_USERNAME_FORMAT: "invalid username format",
  
  /** Username is required but missing */
  USERNAME_REQUIRED: "username is required",
  
  /** Username is already taken */
  USERNAME_ALREADY_EXISTS: "username already exists",
  
  /** Username is too short */
  USERNAME_TOO_SHORT: "username too short",
  
  /** Username is too long */
  USERNAME_TOO_LONG: "username too long",
  
  /** Username contains invalid characters */
  USERNAME_INVALID_CHARACTERS: "username contains invalid characters",
  
  /** Password is required but missing */
  PASSWORD_REQUIRED: "password is required",
  
  /** Password is too short */
  PASSWORD_TOO_SHORT: "password too short",
  
  /** Password is too long */
  PASSWORD_TOO_LONG: "password too long",
  
  /** Password is too weak */
  PASSWORD_TOO_WEAK: "password too weak",
  
  /** Password confirmation does not match */
  PASSWORD_MISMATCH: "passwords do not match",
  
  /** Password confirmation is required */
  PASSWORD_CONFIRMATION_REQUIRED: "password confirmation required",
  
  /** Current password is incorrect */
  CURRENT_PASSWORD_INCORRECT: "current password incorrect",
  
  /** New password cannot be the same as current password */
  PASSWORD_SAME_AS_CURRENT: "new password cannot be the same as current",
  
  /** Password has been used recently and cannot be reused */
  PASSWORD_RECENTLY_USED: "password was recently used",
  
  /** Account is locked due to too many failed attempts */
  ACCOUNT_LOCKED: "account locked due to failed attempts",
  
  /** Account is disabled or suspended */
  ACCOUNT_DISABLED: "account is disabled",
  
  /** Account requires email verification before use */
  ACCOUNT_UNVERIFIED: "account requires email verification",
  
  /** Two-factor authentication code is required */
  TWO_FACTOR_REQUIRED: "two-factor authentication required",
  
  /** Two-factor authentication code is invalid */
  INVALID_TWO_FACTOR_CODE: "invalid two-factor code",
  
  /** Two-factor authentication code has expired */
  TWO_FACTOR_CODE_EXPIRED: "two-factor code expired",
  
  /** Recovery code is invalid */
  INVALID_RECOVERY_CODE: "invalid recovery code",
  
  /** No recovery codes remaining */
  NO_RECOVERY_CODES: "no recovery codes remaining",
} as const

/**
 * Type for username error code keys
 */
export type UsernameErrorCode = keyof typeof USERNAME_ERROR_CODES

/**
 * Type for username error messages
 */
export type UsernameErrorMessage = typeof USERNAME_ERROR_CODES[UsernameErrorCode]
