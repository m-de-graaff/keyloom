/**
 * @keyloom/stripe - Stripe payment integration for Keyloom
 * 
 * This package provides a simplified, type-safe wrapper around Stripe's payment APIs
 * with seamless integration into the Keyloom authentication system.
 * 
 * @example
 * ```typescript
 * import { createKeyloomStripe } from '@keyloom/stripe'
 * 
 * const stripe = createKeyloomStripe({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
 *   defaultCurrency: 'usd'
 * })
 * 
 * // Create a payment intent
 * const result = await stripe.payments.createPaymentIntent({
 *   amount: 2000, // $20.00
 *   currency: 'usd',
 *   customerId: 'cus_123'
 * })
 * 
 * if (result.success) {
 *   console.log('Payment intent created:', result.data.id)
 * } else {
 *   console.error('Error:', result.error.message)
 * }
 * ```
 */

// Core exports
export { createKeyloomStripe } from './client'
export type { KeyloomStripeClient } from './client'

// Type exports
export type {
  KeyloomStripeConfig,
  StripeResult,
  StripeError,
  CreatePaymentIntentOptions,
  CreateCustomerOptions,
  CreateSubscriptionOptions,
  AttachPaymentMethodOptions,
  WebhookHandler,
  WebhookConfig,
  KeyloomCustomer,
  KeyloomPaymentIntent,
  KeyloomSubscription,
} from './types'

// Error handling exports
export {
  KeyloomStripeError,
  normalizeStripeError,
  withErrorHandling,
  assertSuccess,
  STRIPE_ERROR_CODES,
  isStripeErrorCode,
  isCardError,
} from './errors'

// Individual module exports for tree-shaking
export * as payments from './payments'
export * as customers from './customers'
export * as subscriptions from './subscriptions'
export * as paymentMethods from './payment-methods'
export * as webhooks from './webhooks'
