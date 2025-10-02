/**
 * Subscription operations for Stripe integration
 *
 * This module provides simplified functions for managing Stripe subscriptions
 * with integration to Keyloom's user and organization system.
 */

import type Stripe from 'stripe'
import type { CreateSubscriptionOptions, StripeResult } from './types'
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
 * Create a new subscription
 *
 * @param stripe - Stripe client instance
 * @param options - Subscription creation options
 * @returns Promise resolving to the created subscription
 *
 * @example
 * ```typescript
 * import { createSubscription } from '@keyloom/stripe/subscriptions'
 *
 * const result = await createSubscription(stripe, {
 *   customerId: 'cus_123',
 *   priceId: 'price_123',
 *   defaultPaymentMethod: 'pm_123'
 * })
 *
 * if (result.success) {
 *   console.log('Subscription created:', result.data.id)
 * }
 * ```
 */
export async function createSubscription(
  stripe: Stripe,
  options: CreateSubscriptionOptions,
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    const items = Array.isArray(options.priceId)
      ? options.priceId.map((price) => ({ price }))
      : [{ price: options.priceId }]

    const params = filterUndefined({
      customer: options.customerId,
      items,
      default_payment_method: options.defaultPaymentMethod,
      trial_end: options.trialEnd,
      coupon: options.coupon,
      metadata: options.metadata,
      ...options.stripeOptions,
    }) as Stripe.SubscriptionCreateParams

    const subscription = await stripe.subscriptions.create(params)
    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Retrieve a subscription by ID
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to retrieve
 * @returns Promise resolving to the subscription
 */
export async function retrieveSubscription(
  stripe: Stripe,
  subscriptionId: string,
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Update a subscription
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to update
 * @param options - Update parameters
 * @returns Promise resolving to the updated subscription
 */
export async function updateSubscription(
  stripe: Stripe,
  subscriptionId: string,
  options: Partial<Stripe.SubscriptionUpdateParams>,
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, options)
    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Cancel a subscription
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to cancel
 * @param options - Optional cancellation parameters
 * @returns Promise resolving to the cancelled subscription
 */
export async function cancelSubscription(
  stripe: Stripe,
  subscriptionId: string,
  options: Stripe.SubscriptionCancelParams = {},
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId, options)
    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * List subscriptions
 *
 * @param stripe - Stripe client instance
 * @param options - List parameters
 * @returns Promise resolving to a list of subscriptions
 */
export async function listSubscriptions(
  stripe: Stripe,
  options: Stripe.SubscriptionListParams = {},
): Promise<StripeResult<Stripe.ApiList<Stripe.Subscription>>> {
  try {
    const subscriptions = await stripe.subscriptions.list(options)
    return { success: true, data: subscriptions }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Pause a subscription
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to pause
 * @param options - Pause configuration
 * @returns Promise resolving to the updated subscription
 */
export async function pauseSubscription(
  stripe: Stripe,
  subscriptionId: string,
  options: {
    /** Behavior when pausing */
    behavior?: 'keep_as_draft' | 'mark_uncollectible' | 'void'
    /** When to resume the subscription (timestamp) */
    resumesAt?: number
  } = {},
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: options.behavior || 'void',
        ...(options.resumesAt !== undefined && { resumes_at: options.resumesAt }),
      },
    })
    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Resume a paused subscription
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to resume
 * @returns Promise resolving to the updated subscription
 */
export async function resumeSubscription(
  stripe: Stripe,
  subscriptionId: string,
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null,
    })
    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Change subscription plan
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to modify
 * @param newPriceId - New price ID to switch to
 * @param options - Additional options for the plan change
 * @returns Promise resolving to the updated subscription
 */
export async function changeSubscriptionPlan(
  stripe: Stripe,
  subscriptionId: string,
  newPriceId: string,
  options: {
    /** Whether to prorate the change */
    prorate?: boolean
    /** When to apply the change */
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
  } = {},
): Promise<StripeResult<Stripe.Subscription>> {
  try {
    // First get the current subscription to find the subscription item
    const currentSub = await stripe.subscriptions.retrieve(subscriptionId)
    const subscriptionItem = currentSub.items.data[0]

    if (!subscriptionItem) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          message: 'No subscription items found',
        },
      }
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: options.prorationBehavior || 'create_prorations',
    })

    return { success: true, data: subscription }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Get subscription status
 *
 * @param stripe - Stripe client instance
 * @param subscriptionId - Subscription ID to check
 * @returns Promise resolving to subscription status information
 */
export async function getSubscriptionStatus(
  stripe: Stripe,
  subscriptionId: string,
): Promise<
  StripeResult<{
    status: Stripe.Subscription.Status
    currentPeriodStart: number
    currentPeriodEnd: number
    cancelAtPeriodEnd: boolean
    canceledAt: number | null
    endedAt: number | null
    trialStart: number | null
    trialEnd: number | null
  }>
> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    return {
      success: true,
      data: {
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        endedAt: subscription.ended_at,
        trialStart: subscription.trial_start,
        trialEnd: subscription.trial_end,
      },
    }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}
