/**
 * Customer operations for Stripe integration
 *
 * This module provides simplified functions for managing Stripe customers
 * with integration to Keyloom's user system.
 */

import type Stripe from 'stripe'
import type { CreateCustomerOptions, StripeResult } from './types'
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
 * Create a new customer
 *
 * @param stripe - Stripe client instance
 * @param options - Customer creation options
 * @returns Promise resolving to the created customer
 *
 * @example
 * ```typescript
 * import { createCustomer } from '@keyloom/stripe/customers'
 *
 * const result = await createCustomer(stripe, {
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   metadata: {
 *     keyloomUserId: 'user_123'
 *   }
 * })
 *
 * if (result.success) {
 *   console.log('Customer created:', result.data.id)
 * }
 * ```
 */
export async function createCustomer(
  stripe: Stripe,
  options: CreateCustomerOptions,
): Promise<StripeResult<Stripe.Customer>> {
  try {
    const params = filterUndefined({
      email: options.email,
      name: options.name,
      phone: options.phone,
      description: options.description,
      metadata: options.metadata,
      invoice_settings: options.defaultPaymentMethod
        ? {
            default_payment_method: options.defaultPaymentMethod,
          }
        : undefined,
      ...options.stripeOptions,
    }) as Stripe.CustomerCreateParams

    const customer = await stripe.customers.create(params)
    return { success: true, data: customer }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Retrieve a customer by ID
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID to retrieve
 * @returns Promise resolving to the customer
 */
export async function retrieveCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<StripeResult<Stripe.Customer>> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return { success: true, data: customer as Stripe.Customer }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Update a customer
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID to update
 * @param options - Update parameters
 * @returns Promise resolving to the updated customer
 */
export async function updateCustomer(
  stripe: Stripe,
  customerId: string,
  options: Partial<Stripe.CustomerUpdateParams>,
): Promise<StripeResult<Stripe.Customer>> {
  try {
    const customer = await stripe.customers.update(customerId, options)
    return { success: true, data: customer }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Delete a customer
 *
 * @param stripe - Stripe client instance
 * @param customerId - Customer ID to delete
 * @returns Promise resolving to the deletion confirmation
 */
export async function deleteCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<StripeResult<Stripe.DeletedCustomer>> {
  try {
    const deleted = await stripe.customers.del(customerId)
    return { success: true, data: deleted }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * List customers
 *
 * @param stripe - Stripe client instance
 * @param options - List parameters
 * @returns Promise resolving to a list of customers
 */
export async function listCustomers(
  stripe: Stripe,
  options: Stripe.CustomerListParams = {},
): Promise<StripeResult<Stripe.ApiList<Stripe.Customer>>> {
  try {
    const customers = await stripe.customers.list(options)
    return { success: true, data: customers }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Find a customer by Keyloom user ID
 *
 * @param stripe - Stripe client instance
 * @param keyloomUserId - Keyloom user ID to search for
 * @returns Promise resolving to the customer if found
 */
export async function findCustomerByKeyloomUserId(
  stripe: Stripe,
  keyloomUserId: string,
): Promise<StripeResult<Stripe.Customer | null>> {
  try {
    const customers = await stripe.customers.list({
      limit: 1,
    })

    // Search through customers for matching metadata
    for (const customer of customers.data) {
      if (customer.metadata?.keyloomUserId === keyloomUserId) {
        return { success: true, data: customer }
      }
    }

    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Create or retrieve a customer for a Keyloom user
 *
 * @param stripe - Stripe client instance
 * @param keyloomUserId - Keyloom user ID
 * @param customerData - Customer data to use if creating a new customer
 * @returns Promise resolving to the customer
 */
export async function getOrCreateCustomerForKeyloomUser(
  stripe: Stripe,
  keyloomUserId: string,
  customerData: Omit<CreateCustomerOptions, 'metadata'> & {
    metadata?: Record<string, string>
  },
): Promise<StripeResult<Stripe.Customer>> {
  try {
    // First try to find existing customer
    const existingResult = await findCustomerByKeyloomUserId(stripe, keyloomUserId)

    if (!existingResult.success) {
      return existingResult
    }

    if (existingResult.data) {
      return { success: true, data: existingResult.data }
    }

    // Create new customer if not found
    const createResult = await createCustomer(stripe, {
      ...customerData,
      metadata: {
        ...customerData.metadata,
        keyloomUserId,
      },
    })

    return createResult
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}
