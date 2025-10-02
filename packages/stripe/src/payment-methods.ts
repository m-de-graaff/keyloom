/**
 * Payment method operations for Stripe integration
 *
 * This module provides simplified functions for managing Stripe payment methods
 * and their association with customers.
 */

import type Stripe from 'stripe'
import type { AttachPaymentMethodOptions, StripeResult } from './types'
import { normalizeStripeError } from './errors'

/**
 * Attach a payment method to a customer
 *
 * @param stripe - Stripe client instance
 * @param options - Payment method attachment options
 * @returns Promise resolving to the attached payment method
 *
 * @example
 * ```typescript
 * import { attachPaymentMethod } from '@keyloom/stripe/payment-methods'
 *
 * const result = await attachPaymentMethod(stripe, {
 *   paymentMethodId: 'pm_123',
 *   customerId: 'cus_123',
 *   setAsDefault: true
 * })
 *
 * if (result.success) {
 *   console.log('Payment method attached:', result.data.id)
 * }
 * ```
 */
export async function attachPaymentMethod(
  stripe: Stripe,
  options: AttachPaymentMethodOptions,
): Promise<StripeResult<Stripe.PaymentMethod>> {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(options.paymentMethodId, {
      customer: options.customerId,
    })

    // Set as default if requested
    if (options.setAsDefault) {
      await stripe.customers.update(options.customerId, {
        invoice_settings: {
          default_payment_method: options.paymentMethodId,
        },
      })
    }

    return { success: true, data: paymentMethod }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Detach a payment method from a customer
 *
 * @param stripe - Stripe client instance
 * @param paymentMethodId - Payment method ID to detach
 * @returns Promise resolving to the detached payment method
 */
export async function detachPaymentMethod(
  stripe: Stripe,
  paymentMethodId: string,
): Promise<StripeResult<Stripe.PaymentMethod>> {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId)
    return { success: true, data: paymentMethod }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Retrieve a payment method by ID
 *
 * @param stripe - Stripe client instance
 * @param paymentMethodId - Payment method ID to retrieve
 * @returns Promise resolving to the payment method
 */
export async function retrievePaymentMethod(
  stripe: Stripe,
  paymentMethodId: string,
): Promise<StripeResult<Stripe.PaymentMethod>> {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    return { success: true, data: paymentMethod }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * List payment methods for a customer
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID to list payment methods for
 * @param options - Optional list parameters
 * @returns Promise resolving to a list of payment methods
 */
export async function listPaymentMethods(
  stripe: Stripe,
  customerId: string,
  options: Partial<Stripe.PaymentMethodListParams> = {},
): Promise<StripeResult<Stripe.ApiList<Stripe.PaymentMethod>>> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      ...options,
    })
    return { success: true, data: paymentMethods }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Set a payment method as the default for a customer
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID
 * @param paymentMethodId - Payment method ID to set as default
 * @returns Promise resolving to the updated customer
 */
export async function setDefaultPaymentMethod(
  stripe: Stripe,
  customerId: string,
  paymentMethodId: string,
): Promise<StripeResult<Stripe.Customer>> {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })
    return { success: true, data: customer }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Create a setup intent for collecting payment method details
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID
 * @param options - Optional setup intent parameters
 * @returns Promise resolving to the setup intent
 */
export async function createSetupIntent(
  stripe: Stripe,
  customerId: string,
  options: Partial<Stripe.SetupIntentCreateParams> = {},
): Promise<StripeResult<Stripe.SetupIntent>> {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      ...options,
    })
    return { success: true, data: setupIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Confirm a setup intent
 *
 * @param stripe - Stripe client instance
 * @param setupIntentId - Setup intent ID to confirm
 * @param options - Optional confirmation parameters
 * @returns Promise resolving to the confirmed setup intent
 */
export async function confirmSetupIntent(
  stripe: Stripe,
  setupIntentId: string,
  options: Partial<Stripe.SetupIntentConfirmParams> = {},
): Promise<StripeResult<Stripe.SetupIntent>> {
  try {
    const setupIntent = await stripe.setupIntents.confirm(setupIntentId, options)
    return { success: true, data: setupIntent }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Get the default payment method for a customer
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID
 * @returns Promise resolving to the default payment method or null if none set
 */
export async function getDefaultPaymentMethod(
  stripe: Stripe,
  customerId: string,
): Promise<StripeResult<Stripe.PaymentMethod | null>> {
  try {
    const customer = await stripe.customers.retrieve(customerId)

    if (typeof customer === 'object' && 'invoice_settings' in customer) {
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method

      if (typeof defaultPaymentMethodId === 'string') {
        const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId)
        return { success: true, data: paymentMethod }
      }
    }

    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Update a payment method
 *
 * @param stripe - Stripe client instance
 * @param paymentMethodId - Payment method ID to update
 * @param options - Update parameters
 * @returns Promise resolving to the updated payment method
 */
export async function updatePaymentMethod(
  stripe: Stripe,
  paymentMethodId: string,
  options: Partial<Stripe.PaymentMethodUpdateParams>,
): Promise<StripeResult<Stripe.PaymentMethod>> {
  try {
    const paymentMethod = await stripe.paymentMethods.update(paymentMethodId, options)
    return { success: true, data: paymentMethod }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Get payment method types supported by the account
 *
 * @param stripe - Stripe client instance
 * @returns Promise resolving to supported payment method types
 */
export async function getSupportedPaymentMethodTypes(
  _stripe: Stripe,
): Promise<StripeResult<string[]>> {
  try {
    // This is a simplified version - in practice you might want to check
    // your account's capabilities or configuration
    const supportedTypes = [
      'card',
      'us_bank_account',
      'sepa_debit',
      'ideal',
      'sofort',
      'bancontact',
      'giropay',
      'eps',
      'p24',
      'alipay',
      'wechat_pay',
    ]

    return { success: true, data: supportedTypes }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}
