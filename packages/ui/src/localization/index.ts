/**
 * Centralized localization system for Keyloom UI error messages and text.
 *
 * This module provides a comprehensive set of error codes organized by domain/feature.
 * All error messages follow Keyloom's style guide:
 * - Use lowercase sentence case for error messages
 * - Use SCREAMING_SNAKE_CASE for error code keys
 * - Keep messages concise and user-friendly
 *
 * The structure is designed to support future internationalization (i18n) by
 * separating error codes from their display messages.
 *
 * @example
 * ```typescript
 * import { USERNAME_ERROR_CODES, ORGANIZATION_ERROR_CODES } from '@keyloom/ui/localization'
 *
 * // Use error codes in validation
 * if (!email) {
 *   return { error: USERNAME_ERROR_CODES.EMAIL_REQUIRED }
 * }
 *
 * // Use in UI components
 * <ErrorMessage>{ORGANIZATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS}</ErrorMessage>
 * ```
 */

// Re-export all error code modules
export {
  GENERIC_OAUTH_ERROR_CODES,
  type GenericOAuthErrorCode,
  type GenericOAuthErrorMessage,
} from './generic-oauth-error-codes'

export {
  USERNAME_ERROR_CODES,
  type UsernameErrorCode,
  type UsernameErrorMessage,
} from './username-error-codes'

export {
  ACCOUNT_ERROR_CODES,
  type AccountErrorCode,
  type AccountErrorMessage,
} from './account-error-codes'

export {
  ORGANIZATION_ERROR_CODES,
  type OrganizationErrorCode,
  type OrganizationErrorMessage,
} from './organization-error-codes'

// Import types and constants for union types and combined object
import type { GenericOAuthErrorCode, GenericOAuthErrorMessage } from './generic-oauth-error-codes'
import { GENERIC_OAUTH_ERROR_CODES } from './generic-oauth-error-codes'
import type { UsernameErrorCode, UsernameErrorMessage } from './username-error-codes'
import { USERNAME_ERROR_CODES } from './username-error-codes'
import type { AccountErrorCode, AccountErrorMessage } from './account-error-codes'
import { ACCOUNT_ERROR_CODES } from './account-error-codes'
import type { OrganizationErrorCode, OrganizationErrorMessage } from './organization-error-codes'
import { ORGANIZATION_ERROR_CODES } from './organization-error-codes'

/**
 * Union type of all error codes across all domains
 */
export type AllErrorCodes =
  | GenericOAuthErrorCode
  | UsernameErrorCode
  | AccountErrorCode
  | OrganizationErrorCode

/**
 * Union type of all error messages across all domains
 */
export type AllErrorMessages =
  | GenericOAuthErrorMessage
  | UsernameErrorMessage
  | AccountErrorMessage
  | OrganizationErrorMessage

/**
 * Combined error codes object for convenience
 */
export const ALL_ERROR_CODES = {
  ...GENERIC_OAUTH_ERROR_CODES,
  ...USERNAME_ERROR_CODES,
  ...ACCOUNT_ERROR_CODES,
  ...ORGANIZATION_ERROR_CODES,
} as const

/**
 * Utility function to check if a string is a valid error code
 *
 * @param code - The string to check
 * @returns True if the code is a valid error code
 */
export function isValidErrorCode(code: string): code is AllErrorCodes {
  return code in ALL_ERROR_CODES
}

/**
 * Utility function to get error message by code
 *
 * @param code - The error code
 * @returns The corresponding error message, or undefined if code is invalid
 */
export function getErrorMessage(code: AllErrorCodes): AllErrorMessages {
  return ALL_ERROR_CODES[code]
}

/**
 * Utility function to get error message with fallback
 *
 * @param code - The error code
 * @param fallback - Fallback message if code is invalid
 * @returns The error message or fallback
 */
export function getErrorMessageWithFallback(
  code: string,
  fallback: string = 'an error occurred',
): string {
  if (isValidErrorCode(code)) {
    return getErrorMessage(code)
  }
  return fallback
}
