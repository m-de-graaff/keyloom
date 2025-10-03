/**
 * Form validation utilities for Keyloom UI components.
 * Provides comprehensive validation functions with error handling and browser compatibility.
 */

import type { FieldValidation } from "../types";

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Additional validation metadata */
  metadata?: Record<string, any>;
}

/**
 * Email validation options
 */
export interface EmailValidationOptions {
  /** Whether to allow plus addressing (e.g., user+tag@domain.com) */
  allowPlusAddressing?: boolean;
  /** Whether to allow international domain names */
  allowInternationalDomains?: boolean;
  /** Custom domain whitelist */
  allowedDomains?: string[];
  /** Custom domain blacklist */
  blockedDomains?: string[];
}

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  /** Minimum password length */
  minLength?: number;
  /** Maximum password length */
  maxLength?: number;
  /** Require at least one uppercase letter */
  requireUppercase?: boolean;
  /** Require at least one lowercase letter */
  requireLowercase?: boolean;
  /** Require at least one number */
  requireNumbers?: boolean;
  /** Require at least one special character */
  requireSymbols?: boolean;
  /** Custom forbidden patterns */
  forbiddenPatterns?: RegExp[];
  /** Common passwords to reject */
  forbiddenPasswords?: string[];
}

/**
 * Default password requirements
 */
const DEFAULT_PASSWORD_REQUIREMENTS: Required<PasswordRequirements> = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  forbiddenPatterns: [
    /(.)\1{2,}/, // Repeated characters (3+ times)
    /123456|654321|abcdef|qwerty/i, // Common sequences
  ],
  forbiddenPasswords: [
    "password",
    "password123",
    "123456789",
    "qwerty123",
    "admin",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
  ],
};

/**
 * Validates an email address with comprehensive checks.
 *
 * @param email - Email address to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateEmail('user@example.com')
 * if (!result.valid) {
 *   console.error(result.error)
 * }
 * ```
 */
export function validateEmail(
  email: string,
  options: EmailValidationOptions = {}
): ValidationResult {
  try {
    // Basic presence check
    if (!email || typeof email !== "string") {
      return { valid: false, error: "email is required" };
    }

    const trimmedEmail = email.trim();

    // Length check
    if (trimmedEmail.length === 0) {
      return { valid: false, error: "email is required" };
    }

    if (trimmedEmail.length > 254) {
      return { valid: false, error: "email is too long" };
    }

    // Basic format validation using HTML5 email pattern
    const emailPattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailPattern.test(trimmedEmail)) {
      return { valid: false, error: "invalid email format" };
    }

    const parts = trimmedEmail.split("@");
    if (parts.length !== 2) {
      return { valid: false, error: "invalid email format" };
    }
    const [localPart, domain] = parts as [string, string];

    // Local part validation
    if (localPart.length > 64) {
      return { valid: false, error: "email local part too long" };
    }

    // Check for consecutive dots in local part
    if (localPart.includes("..")) {
      return { valid: false, error: "consecutive dots not allowed in email" };
    }

    // Plus addressing check (default: allow)
    if (options.allowPlusAddressing === false && localPart.includes("+")) {
      return { valid: false, error: "plus addressing not allowed" };
    }

    // Domain validation
    if (domain.length > 253) {
      return { valid: false, error: "email domain too long" };
    }

    // Check for valid TLD (at least one dot in domain)
    if (!domain.includes(".")) {
      return { valid: false, error: "domain must have a valid TLD" };
    }

    // International domain check (default: allow)
    if (
      options.allowInternationalDomains === false &&
      !/^[\x00-\x7F]*$/.test(domain)
    ) {
      return { valid: false, error: "international domains not allowed" };
    }

    // Domain whitelist check
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      const domainLower = domain.toLowerCase();
      const isAllowed = options.allowedDomains.some(
        (allowed) =>
          domainLower === allowed.toLowerCase() ||
          domainLower.endsWith(`.${allowed.toLowerCase()}`)
      );
      if (!isAllowed) {
        return { valid: false, error: "email domain not allowed" };
      }
    }

    // Domain blacklist check
    if (options.blockedDomains && options.blockedDomains.length > 0) {
      const domainLower = domain.toLowerCase();
      const isBlocked = options.blockedDomains.some(
        (blocked) =>
          domainLower === blocked.toLowerCase() ||
          domainLower.endsWith(`.${blocked.toLowerCase()}`)
      );
      if (isBlocked) {
        return { valid: false, error: "email domain not allowed" };
      }
    }

    return {
      valid: true,
      metadata: {
        localPart,
        domain,
        hasPlusAddressing: localPart.includes("+"),
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `email validation failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}

/**
 * Validates a password against strength requirements.
 *
 * @param password - Password to validate
 * @param requirements - Password strength requirements
 * @returns Validation result with strength score
 *
 * @example
 * ```typescript
 * const result = validatePassword('MySecure123!', {
 *   minLength: 8,
 *   requireSymbols: true
 * })
 * console.log(result.metadata?.strength) // Strength score 0-100
 * ```
 */
export function validatePassword(
  password: string,
  requirements: Partial<PasswordRequirements> = {}
): ValidationResult {
  try {
    // Basic presence check
    if (!password || typeof password !== "string") {
      return { valid: false, error: "password is required" };
    }

    const reqs = { ...DEFAULT_PASSWORD_REQUIREMENTS, ...requirements };
    const errors: string[] = [];
    let strengthScore = 0;

    // Length validation
    if (password.length < reqs.minLength) {
      errors.push(`password must be at least ${reqs.minLength} characters`);
    } else {
      strengthScore += Math.min(25, (password.length / reqs.minLength) * 25);
    }

    if (password.length > reqs.maxLength) {
      errors.push(`password must be no more than ${reqs.maxLength} characters`);
    }

    // Character type requirements
    if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("password must contain at least one uppercase letter");
    } else if (reqs.requireUppercase) {
      strengthScore += 15;
    }

    if (reqs.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("password must contain at least one lowercase letter");
    } else if (reqs.requireLowercase) {
      strengthScore += 15;
    }

    if (reqs.requireNumbers && !/\d/.test(password)) {
      errors.push("password must contain at least one number");
    } else if (reqs.requireNumbers) {
      strengthScore += 15;
    }

    if (
      reqs.requireSymbols &&
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    ) {
      errors.push("password must contain at least one special character");
    } else if (reqs.requireSymbols) {
      strengthScore += 15;
    }

    // Forbidden patterns check
    for (const pattern of reqs.forbiddenPatterns) {
      if (pattern.test(password)) {
        errors.push("password contains forbidden pattern");
        strengthScore -= 20;
        break;
      }
    }

    // Common passwords check
    const passwordLower = password.toLowerCase();
    if (
      reqs.forbiddenPasswords.some((forbidden) =>
        passwordLower.includes(forbidden.toLowerCase())
      )
    ) {
      errors.push("password is too common");
      strengthScore -= 30;
    }

    // Additional strength factors
    const uniqueChars = new Set(password).size;
    strengthScore += Math.min(15, (uniqueChars / password.length) * 15);

    // Ensure score is within bounds
    strengthScore = Math.max(0, Math.min(100, strengthScore));

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors[0] || "Password validation failed", // Return first error with fallback
        metadata: {
          allErrors: errors,
          strength: strengthScore,
        },
      };
    }

    return {
      valid: true,
      metadata: {
        strength: strengthScore,
        strengthLevel: getPasswordStrengthLevel(strengthScore),
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: `password validation failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}

/**
 * Gets password strength level based on score.
 *
 * @param score - Strength score (0-100)
 * @returns Strength level description
 */
function getPasswordStrengthLevel(score: number): string {
  if (score >= 80) return "very strong";
  if (score >= 60) return "strong";
  if (score >= 40) return "moderate";
  if (score >= 20) return "weak";
  return "very weak";
}

/**
 * Validates a username with customizable requirements.
 *
 * @param username - Username to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateUsername('john_doe123', {
 *   minLength: 3,
 *   maxLength: 20,
 *   allowUnderscore: true
 * })
 * ```
 */
export function validateUsername(
  username: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowUnderscore?: boolean;
    allowDash?: boolean;
    allowNumbers?: boolean;
    requireLetters?: boolean;
    forbiddenUsernames?: string[];
  } = {}
): ValidationResult {
  try {
    const opts = {
      minLength: 3,
      maxLength: 30,
      allowUnderscore: true,
      allowDash: true,
      allowNumbers: true,
      requireLetters: true,
      forbiddenUsernames: [
        "admin",
        "root",
        "user",
        "test",
        "null",
        "undefined",
      ],
      ...options,
    };

    // Basic presence check
    if (!username || typeof username !== "string") {
      return { valid: false, error: "username is required" };
    }

    const trimmedUsername = username.trim();

    // Length validation
    if (trimmedUsername.length < opts.minLength) {
      return {
        valid: false,
        error: `username must be at least ${opts.minLength} characters`,
      };
    }

    if (trimmedUsername.length > opts.maxLength) {
      return {
        valid: false,
        error: `username must be no more than ${opts.maxLength} characters`,
      };
    }

    // Character validation
    let allowedPattern = "a-zA-Z";
    if (opts.allowNumbers) allowedPattern += "0-9";
    if (opts.allowUnderscore) allowedPattern += "_";
    if (opts.allowDash) allowedPattern += "-";

    const regex = new RegExp(`^[${allowedPattern}]+$`);
    if (!regex.test(trimmedUsername)) {
      return { valid: false, error: "username contains invalid characters" };
    }

    // Must start and end with alphanumeric
    if (
      !/^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(trimmedUsername) &&
      trimmedUsername.length > 1
    ) {
      return {
        valid: false,
        error: "username must start and end with letter or number",
      };
    }

    // Require letters check
    if (opts.requireLetters && !/[a-zA-Z]/.test(trimmedUsername)) {
      return {
        valid: false,
        error: "username must contain at least one letter",
      };
    }

    // Forbidden usernames check
    if (opts.forbiddenUsernames.includes(trimmedUsername.toLowerCase())) {
      return { valid: false, error: "username is not available" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `username validation failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}

/**
 * Validates a field using the provided validation configuration.
 *
 * @param value - Field value to validate
 * @param validation - Validation configuration
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateField('test', {
 *   minLength: 5,
 *   pattern: /^[a-z]+$/,
 *   customValidator: (value) => value === 'admin' ? 'Reserved name' : null
 * }, 'username')
 * ```
 */
export function validateField(
  value: string,
  validation: FieldValidation,
  fieldName: string = "field"
): ValidationResult {
  try {
    // Basic presence check
    if (!value || typeof value !== "string") {
      return { valid: false, error: `${fieldName} is required` };
    }

    const trimmedValue = value.trim();

    // Length validation
    if (validation.minLength && trimmedValue.length < validation.minLength) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${validation.minLength} characters`,
      };
    }

    if (validation.maxLength && trimmedValue.length > validation.maxLength) {
      return {
        valid: false,
        error: `${fieldName} must be no more than ${validation.maxLength} characters`,
      };
    }

    // Pattern validation
    if (validation.pattern && !validation.pattern.test(trimmedValue)) {
      return { valid: false, error: `${fieldName} format is invalid` };
    }

    // Custom validation
    if (validation.customValidator) {
      const customError = validation.customValidator(trimmedValue);
      if (customError) {
        return { valid: false, error: customError };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `${fieldName} validation failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}

/**
 * Validates multiple fields at once.
 *
 * @param fields - Object with field values and their validation configs
 * @returns Object with validation results for each field
 *
 * @example
 * ```typescript
 * const results = validateFields({
 *   email: { value: 'user@example.com', validation: { pattern: /\S+@\S+\.\S+/ } },
 *   password: { value: 'secret123', validation: { minLength: 8 } }
 * })
 *
 * if (!results.email.valid) {
 *   console.error(results.email.error)
 * }
 * ```
 */
export function validateFields(
  fields: Record<
    string,
    {
      value: string;
      validation: FieldValidation;
    }
  >
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [fieldName, { value, validation }] of Object.entries(fields)) {
    results[fieldName] = validateField(value, validation, fieldName);
  }

  return results;
}

/**
 * Checks if all validation results are valid.
 *
 * @param results - Validation results to check
 * @returns True if all results are valid
 *
 * @example
 * ```typescript
 * const results = validateFields({ ... })
 * if (areAllValid(results)) {
 *   console.log('All fields are valid!')
 * }
 * ```
 */
export function areAllValid(
  results: Record<string, ValidationResult>
): boolean {
  return Object.values(results).every((result) => result.valid);
}

/**
 * Gets the first error message from validation results.
 *
 * @param results - Validation results to check
 * @returns First error message, or null if all valid
 *
 * @example
 * ```typescript
 * const results = validateFields({ ... })
 * const firstError = getFirstError(results)
 * if (firstError) {
 *   console.error(firstError)
 * }
 * ```
 */
export function getFirstError(
  results: Record<string, ValidationResult>
): string | null {
  for (const result of Object.values(results)) {
    if (!result.valid && result.error) {
      return result.error;
    }
  }
  return null;
}

/**
 * Gets all error messages from validation results.
 *
 * @param results - Validation results to check
 * @returns Array of error messages
 *
 * @example
 * ```typescript
 * const results = validateFields({ ... })
 * const errors = getAllErrors(results)
 * errors.forEach(error => console.error(error))
 * ```
 */
export function getAllErrors(
  results: Record<string, ValidationResult>
): string[] {
  return Object.values(results)
    .filter((result) => !result.valid && result.error)
    .map((result) => result.error!);
}
