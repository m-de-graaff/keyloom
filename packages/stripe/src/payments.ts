/**
 * Payment operations for Stripe integration
 *
 * This module provides simplified functions for working with Stripe payment intents
 * and other payment-related operations.
 */

import type Stripe from 'stripe'
import type { CreatePaymentIntentOptions, StripeResult } from './types'
import { normalizeStripeError } from './errors'

/**
 * Helper function to remove undefined values from an object
 */
function filterUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value
    }
  }
  return result
}

/**
 * Create a payment intent
 *
 * @param stripe - Stripe client instance
 * @param options - Payment intent creation options
 * @returns Promise resolving to the created payment intent
 *
 * @example
 * ```typescript
 * import { createPaymentIntent } from '@keyloom/stripe/payments'
 *
 * const result = await createPaymentIntent(stripe, {
 *   amount: 2000, // $20.00
 *   currency: 'usd',
 *   customerId: 'cus_123'
 * })
 *
 * if (result.success) {
 *   console.log('Payment intent created:', result.data.id)
 * }
 * ```
 */
export async function createPaymentIntent(
  stripe: Stripe,
  options: CreatePaymentIntentOptions,
): Promise<StripeResult<Stripe.PaymentIntent>> {
  try {
    const params = filterUndefined({
      amount: options.amount,
      currency: options.currency || 'usd',
      customer: options.customerId,
      payment_method: options.paymentMethodId,
      confirm: options.confirmImmediately,
      description: options.description,
      metadata: options.metadata,
      receipt_email: options.receiptEmail,
      setup_future_usage: options.setupFutureUsage,
      ...options.stripeOptions,
    }) as Stripe.PaymentIntentCreateParams

    const paymentIntent = await stripe.paymentIntents.create(params)
    return { success: true, data: paymentIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Confirm a payment intent
 *
 * @param stripe - Stripe client instance
 * @param paymentIntentId - Payment intent ID to confirm
 * @param options - Optional confirmation parameters
 * @returns Promise resolving to the confirmed payment intent
 */
export async function confirmPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
  options: Partial<Stripe.PaymentIntentConfirmParams> = {},
): Promise<StripeResult<Stripe.PaymentIntent>> {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, options)
    return { success: true, data: paymentIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Retrieve a payment intent
 *
 * @param stripe - Stripe client instance
 * @param paymentIntentId - Payment intent ID to retrieve
 * @returns Promise resolving to the payment intent
 */
export async function retrievePaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<StripeResult<Stripe.PaymentIntent>> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return { success: true, data: paymentIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Update a payment intent
 *
 * @param stripe - Stripe client instance
 * @param paymentIntentId - Payment intent ID to update
 * @param options - Update parameters
 * @returns Promise resolving to the updated payment intent
 */
export async function updatePaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
  options: Partial<Stripe.PaymentIntentUpdateParams>,
): Promise<StripeResult<Stripe.PaymentIntent>> {
  try {
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, options)
    return { success: true, data: paymentIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Cancel a payment intent
 *
 * @param stripe - Stripe client instance
 * @param paymentIntentId - Payment intent ID to cancel
 * @param options - Optional cancellation parameters
 * @returns Promise resolving to the cancelled payment intent
 */
export async function cancelPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
  options: Stripe.PaymentIntentCancelParams = {},
): Promise<StripeResult<Stripe.PaymentIntent>> {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, options)
    return { success: true, data: paymentIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * List payment intents
 *
 * @param stripe - Stripe client instance
 * @param options - List parameters
 * @returns Promise resolving to a list of payment intents
 */
export async function listPaymentIntents(
  stripe: Stripe,
  options: Stripe.PaymentIntentListParams = {},
): Promise<StripeResult<Stripe.ApiList<Stripe.PaymentIntent>>> {
  try {
    const paymentIntents = await stripe.paymentIntents.list(options)
    return { success: true, data: paymentIntents }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}
