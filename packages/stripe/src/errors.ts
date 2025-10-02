import type { StripeError } from './types'

/**
 * Custom error class for Keyloom Stripe operations
 */
export class KeyloomStripeError extends Error {
  public readonly type: StripeError['type']
  public readonly code?: string
  public readonly statusCode?: number
  public readonly details?: Record<string, any>
  public readonly originalError?: any

  constructor(error: StripeError) {
    super(error.message)
    this.name = 'KeyloomStripeError'
    this.type = error.type
    this.code = error.code || 'unknown'
    this.statusCode = error.statusCode || 0
    this.details = error.details || {}
    this.originalError = error.originalError
  }
}

/**
 * Convert a Stripe error to a standardized StripeError
 */
export function normalizeStripeError(error: any): StripeError {
  // Handle Stripe SDK errors
  if (error?.type && error?.message) {
    return {
      type: 'stripe_error',
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: {
        type: error.type,
        param: error.param,
        decline_code: error.decline_code,
        charge: error.charge,
        payment_intent: error.payment_intent,
        payment_method: error.payment_method,
        setup_intent: error.setup_intent,
        source: error.source,
      },
      originalError: error,
    }
  }

  // Handle network errors
  if (
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT'
  ) {
    return {
      type: 'network_error',
      message: `Network error: ${error.message}`,
      code: error.code,
      originalError: error,
    }
  }

  // Handle validation errors
  if (error?.name === 'ValidationError' || error?.message?.includes('validation')) {
    return {
      type: 'validation_error',
      message: error.message || 'Validation error occurred',
      originalError: error,
    }
  }

  // Handle unknown errors
  return {
    type: 'unknown_error',
    message: error?.message || 'An unknown error occurred',
    originalError: error,
  }
}

/**
 * Wrap a function to handle Stripe errors consistently
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<{ success: true; data: R } | { success: false; error: StripeError }> {
  return async (...args: T) => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: normalizeStripeError(error) }
    }
  }
}

/**
 * Assert that a result is successful, throwing an error if not
 */
export function assertSuccess<T>(result: { success: boolean; data?: T; error?: StripeError }): T {
  if (!result.success) {
    throw new KeyloomStripeError(result.error!)
  }
  return result.data!
}

/**
 * Common Stripe error codes and their meanings
 */
export const STRIPE_ERROR_CODES = {
  // Card errors
  CARD_DECLINED: 'card_declined',
  EXPIRED_CARD: 'expired_card',
  INCORRECT_CVC: 'incorrect_cvc',
  INCORRECT_NUMBER: 'incorrect_number',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INVALID_CVC: 'invalid_cvc',
  INVALID_EXPIRY_MONTH: 'invalid_expiry_month',
  INVALID_EXPIRY_YEAR: 'invalid_expiry_year',
  INVALID_NUMBER: 'invalid_number',

  // API errors
  API_CONNECTION_ERROR: 'api_connection_error',
  API_ERROR: 'api_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  INVALID_REQUEST_ERROR: 'invalid_request_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',

  // Payment intent errors
  PAYMENT_INTENT_AUTHENTICATION_FAILURE: 'payment_intent_authentication_failure',
  PAYMENT_INTENT_PAYMENT_ATTEMPT_FAILED: 'payment_intent_payment_attempt_failed',
  PAYMENT_INTENT_UNEXPECTED_STATE: 'payment_intent_unexpected_state',

  // Customer errors
  CUSTOMER_NOT_FOUND: 'resource_missing',

  // Subscription errors
  SUBSCRIPTION_NOT_FOUND: 'resource_missing',
  INVOICE_NOT_FOUND: 'resource_missing',
} as const

/**
 * Check if an error is a specific Stripe error code
 */
export function isStripeErrorCode(error: StripeError, code: string): boolean {
  return error.type === 'stripe_error' && error.code === code
}

/**
 * Check if an error is a card-related error
 */
export function isCardError(error: StripeError): boolean {
  const cardErrorCodes = [
    STRIPE_ERROR_CODES.CARD_DECLINED,
    STRIPE_ERROR_CODES.EXPIRED_CARD,
    STRIPE_ERROR_CODES.INCORRECT_CVC,
    STRIPE_ERROR_CODES.INCORRECT_NUMBER,
    STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS,
    STRIPE_ERROR_CODES.INVALID_CVC,
    STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH,
    STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR,
    STRIPE_ERROR_CODES.INVALID_NUMBER,
  ]

  return error.type === 'stripe_error' && cardErrorCodes.includes(error.code as any)
}
