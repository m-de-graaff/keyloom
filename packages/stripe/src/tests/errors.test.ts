import { describe, expect, it } from 'vitest'
import { 
  KeyloomStripeError, 
  normalizeStripeError, 
  withErrorHandling, 
  assertSuccess,
  STRIPE_ERROR_CODES,
  isStripeErrorCode,
  isCardError
} from '../errors'
import type { StripeError } from '../types'

describe('Error Handling', () => {
  describe('normalizeStripeError', () => {
    it('should normalize Stripe SDK errors', () => {
      const stripeError = {
        type: 'card_error',
        message: 'Your card was declined.',
        code: 'card_declined',
        statusCode: 402,
        param: 'card',
        decline_code: 'generic_decline',
      }

      const normalized = normalizeStripeError(stripeError)

      expect(normalized).toEqual({
        type: 'stripe_error',
        message: 'Your card was declined.',
        code: 'card_declined',
        statusCode: 402,
        details: {
          type: 'card_error',
          param: 'card',
          decline_code: 'generic_decline',
          charge: undefined,
          payment_intent: undefined,
          payment_method: undefined,
          setup_intent: undefined,
          source: undefined,
        },
        originalError: stripeError,
      })
    })

    it('should normalize network errors', () => {
      const networkError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.stripe.com',
      }

      const normalized = normalizeStripeError(networkError)

      expect(normalized).toEqual({
        type: 'network_error',
        message: 'Network error: getaddrinfo ENOTFOUND api.stripe.com',
        code: 'ENOTFOUND',
        originalError: networkError,
      })
    })

    it('should normalize validation errors', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Invalid email format',
      }

      const normalized = normalizeStripeError(validationError)

      expect(normalized).toEqual({
        type: 'validation_error',
        message: 'Invalid email format',
        originalError: validationError,
      })
    })

    it('should normalize unknown errors', () => {
      const unknownError = {
        message: 'Something went wrong',
      }

      const normalized = normalizeStripeError(unknownError)

      expect(normalized).toEqual({
        type: 'unknown_error',
        message: 'Something went wrong',
        originalError: unknownError,
      })
    })

    it('should handle errors without message', () => {
      const errorWithoutMessage = {}

      const normalized = normalizeStripeError(errorWithoutMessage)

      expect(normalized).toEqual({
        type: 'unknown_error',
        message: 'An unknown error occurred',
        originalError: errorWithoutMessage,
      })
    })
  })

  describe('KeyloomStripeError', () => {
    it('should create error with all properties', () => {
      const stripeError: StripeError = {
        type: 'stripe_error',
        message: 'Card declined',
        code: 'card_declined',
        statusCode: 402,
        details: { param: 'card' },
        originalError: new Error('Original'),
      }

      const error = new KeyloomStripeError(stripeError)

      expect(error.name).toBe('KeyloomStripeError')
      expect(error.message).toBe('Card declined')
      expect(error.type).toBe('stripe_error')
      expect(error.code).toBe('card_declined')
      expect(error.statusCode).toBe(402)
      expect(error.details).toEqual({ param: 'card' })
      expect(error.originalError).toBeInstanceOf(Error)
    })
  })

  describe('withErrorHandling', () => {
    it('should return success result for successful function', async () => {
      const successFn = async (value: number) => value * 2
      const wrappedFn = withErrorHandling(successFn)

      const result = await wrappedFn(5)

      expect(result).toEqual({
        success: true,
        data: 10,
      })
    })

    it('should return error result for failing function', async () => {
      const errorFn = async () => {
        throw new Error('Test error')
      }
      const wrappedFn = withErrorHandling(errorFn)

      const result = await wrappedFn()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Test error')
        expect(result.error.type).toBe('unknown_error')
      }
    })
  })

  describe('assertSuccess', () => {
    it('should return data for successful result', () => {
      const successResult = { success: true as const, data: 'test data' }
      
      const data = assertSuccess(successResult)
      
      expect(data).toBe('test data')
    })

    it('should throw KeyloomStripeError for failed result', () => {
      const errorResult = {
        success: false as const,
        error: {
          type: 'stripe_error' as const,
          message: 'Test error',
          code: 'test_error',
        },
      }

      expect(() => assertSuccess(errorResult)).toThrow(KeyloomStripeError)
      
      try {
        assertSuccess(errorResult)
      } catch (error) {
        expect(error).toBeInstanceOf(KeyloomStripeError)
        expect((error as KeyloomStripeError).message).toBe('Test error')
        expect((error as KeyloomStripeError).code).toBe('test_error')
      }
    })
  })

  describe('isStripeErrorCode', () => {
    it('should return true for matching error code', () => {
      const error: StripeError = {
        type: 'stripe_error',
        message: 'Card declined',
        code: 'card_declined',
      }

      expect(isStripeErrorCode(error, 'card_declined')).toBe(true)
    })

    it('should return false for non-matching error code', () => {
      const error: StripeError = {
        type: 'stripe_error',
        message: 'Card declined',
        code: 'card_declined',
      }

      expect(isStripeErrorCode(error, 'insufficient_funds')).toBe(false)
    })

    it('should return false for non-stripe error', () => {
      const error: StripeError = {
        type: 'network_error',
        message: 'Network error',
      }

      expect(isStripeErrorCode(error, 'card_declined')).toBe(false)
    })
  })

  describe('isCardError', () => {
    it('should return true for card error codes', () => {
      const cardErrors = [
        'card_declined',
        'expired_card',
        'incorrect_cvc',
        'insufficient_funds',
      ]

      cardErrors.forEach(code => {
        const error: StripeError = {
          type: 'stripe_error',
          message: 'Card error',
          code,
        }
        expect(isCardError(error)).toBe(true)
      })
    })

    it('should return false for non-card error codes', () => {
      const error: StripeError = {
        type: 'stripe_error',
        message: 'API error',
        code: 'api_error',
      }

      expect(isCardError(error)).toBe(false)
    })

    it('should return false for non-stripe errors', () => {
      const error: StripeError = {
        type: 'network_error',
        message: 'Network error',
      }

      expect(isCardError(error)).toBe(false)
    })
  })

  describe('STRIPE_ERROR_CODES', () => {
    it('should contain expected error codes', () => {
      expect(STRIPE_ERROR_CODES.CARD_DECLINED).toBe('card_declined')
      expect(STRIPE_ERROR_CODES.EXPIRED_CARD).toBe('expired_card')
      expect(STRIPE_ERROR_CODES.API_ERROR).toBe('api_error')
      expect(STRIPE_ERROR_CODES.AUTHENTICATION_ERROR).toBe('authentication_error')
    })
  })
})
