/**
 * Account management error codes.
 * These errors are used for account settings, profile updates, and account lifecycle operations.
 */
export const ACCOUNT_ERROR_CODES = {
  /** Account not found */
  ACCOUNT_NOT_FOUND: "account not found",
  
  /** Account creation failed */
  ACCOUNT_CREATION_FAILED: "failed to create account",
  
  /** Account update failed */
  ACCOUNT_UPDATE_FAILED: "failed to update account",
  
  /** Account deletion failed */
  ACCOUNT_DELETION_FAILED: "failed to delete account",
  
  /** Profile update failed */
  PROFILE_UPDATE_FAILED: "failed to update profile",
  
  /** Profile picture upload failed */
  PROFILE_PICTURE_UPLOAD_FAILED: "failed to upload profile picture",
  
  /** Profile picture is too large */
  PROFILE_PICTURE_TOO_LARGE: "profile picture too large",
  
  /** Profile picture format is not supported */
  PROFILE_PICTURE_INVALID_FORMAT: "invalid profile picture format",
  
  /** Display name is required */
  DISPLAY_NAME_REQUIRED: "display name is required",
  
  /** Display name is too short */
  DISPLAY_NAME_TOO_SHORT: "display name too short",
  
  /** Display name is too long */
  DISPLAY_NAME_TOO_LONG: "display name too long",
  
  /** Display name contains invalid characters */
  DISPLAY_NAME_INVALID_CHARACTERS: "display name contains invalid characters",
  
  /** Email change failed */
  EMAIL_CHANGE_FAILED: "failed to change email",
  
  /** Email change requires verification */
  EMAIL_CHANGE_VERIFICATION_REQUIRED: "email change requires verification",
  
  /** Email verification failed */
  EMAIL_VERIFICATION_FAILED: "email verification failed",
  
  /** Email verification token is invalid */
  INVALID_VERIFICATION_TOKEN: "invalid verification token",
  
  /** Email verification token has expired */
  VERIFICATION_TOKEN_EXPIRED: "verification token expired",
  
  /** Password change failed */
  PASSWORD_CHANGE_FAILED: "failed to change password",
  
  /** Password reset failed */
  PASSWORD_RESET_FAILED: "failed to reset password",
  
  /** Password reset token is invalid */
  INVALID_RESET_TOKEN: "invalid reset token",
  
  /** Password reset token has expired */
  RESET_TOKEN_EXPIRED: "reset token expired",
  
  /** Two-factor authentication setup failed */
  TWO_FACTOR_SETUP_FAILED: "failed to setup two-factor authentication",
  
  /** Two-factor authentication disable failed */
  TWO_FACTOR_DISABLE_FAILED: "failed to disable two-factor authentication",
  
  /** Recovery codes generation failed */
  RECOVERY_CODES_GENERATION_FAILED: "failed to generate recovery codes",
  
  /** API key creation failed */
  API_KEY_CREATION_FAILED: "failed to create api key",
  
  /** API key deletion failed */
  API_KEY_DELETION_FAILED: "failed to delete api key",
  
  /** API key name is required */
  API_KEY_NAME_REQUIRED: "api key name is required",
  
  /** API key name is too long */
  API_KEY_NAME_TOO_LONG: "api key name too long",
  
  /** API key limit exceeded */
  API_KEY_LIMIT_EXCEEDED: "api key limit exceeded",
  
  /** Session management failed */
  SESSION_MANAGEMENT_FAILED: "failed to manage sessions",
  
  /** Session revocation failed */
  SESSION_REVOCATION_FAILED: "failed to revoke session",
  
  /** Account linking failed */
  ACCOUNT_LINKING_FAILED: "failed to link account",
  
  /** Account unlinking failed */
  ACCOUNT_UNLINKING_FAILED: "failed to unlink account",
  
  /** Cannot unlink last authentication method */
  CANNOT_UNLINK_LAST_METHOD: "cannot unlink last authentication method",
  
  /** Account export failed */
  ACCOUNT_EXPORT_FAILED: "failed to export account data",
  
  /** Account import failed */
  ACCOUNT_IMPORT_FAILED: "failed to import account data",
  
  /** Account backup failed */
  ACCOUNT_BACKUP_FAILED: "failed to backup account",
  
  /** Account restore failed */
  ACCOUNT_RESTORE_FAILED: "failed to restore account",
} as const

/**
 * Type for account error code keys
 */
export type AccountErrorCode = keyof typeof ACCOUNT_ERROR_CODES

/**
 * Type for account error messages
 */
export type AccountErrorMessage = typeof ACCOUNT_ERROR_CODES[AccountErrorCode]
