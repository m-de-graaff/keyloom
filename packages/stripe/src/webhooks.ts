/**
 * Webhook operations for Stripe integration
 * 
 * This module provides utilities for handling Stripe webhooks with signature verification
 * and event processing.
 */

import type Stripe from 'stripe'
import type { WebhookHandler, WebhookConfig, StripeResult } from './types'
import { normalizeStripeError } from './errors'

/**
 * Process a Stripe webhook with signature verification
 * 
 * @param stripe - Stripe client instance
 * @param payload - Raw webhook payload (string or Buffer)
 * @param signature - Stripe signature header
 * @param secret - Webhook endpoint secret
 * @param handlers - Optional event handlers
 * @returns Promise resolving to the processed event
 * 
 * @example
 * ```typescript
 * import { processWebhook } from '@keyloom/stripe/webhooks'
 * 
 * // In your webhook endpoint
 * app.post('/webhook', async (req, res) => {
 *   const signature = req.headers['stripe-signature']
 *   
 *   const result = await processWebhook(
 *     stripe,
 *     req.body,
 *     signature,
 *     process.env.STRIPE_WEBHOOK_SECRET!,
 *     {
 *       'payment_intent.succeeded': async (event, paymentIntent) => {
 *         console.log('Payment succeeded:', paymentIntent.id)
 *         // Update your database, send confirmation email, etc.
 *       },
 *       'customer.subscription.created': async (event, subscription) => {
 *         console.log('Subscription created:', subscription.id)
 *         // Activate user's premium features
 *       }
 *     }
 *   )
 *   
 *   if (result.success) {
 *     res.status(200).send('OK')
 *   } else {
 *     res.status(400).send('Webhook error')
 *   }
 * })
 * ```
 */
export async function processWebhook(
  stripe: Stripe,
  payload: string | Buffer,
  signature: string,
  secret: string,
  handlers: Record<string, WebhookHandler> = {}
): Promise<StripeResult<Stripe.Event>> {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    
    // Execute handler if available
    const handler = handlers[event.type]
    if (handler) {
      await handler(event, event.data.object)
    }

    return { success: true, data: event }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Verify webhook signature without processing
 * 
 * @param stripe - Stripe client instance
 * @param payload - Raw webhook payload
 * @param signature - Stripe signature header
 * @param secret - Webhook endpoint secret
 * @returns Result with the verified event
 */
export function verifyWebhookSignature(
  stripe: Stripe,
  payload: string | Buffer,
  signature: string,
  secret: string
): StripeResult<Stripe.Event> {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    return { success: true, data: event }
  } catch (error) {
    return { success: false, error: normalizeStripeError(error) }
  }
}

/**
 * Create a webhook handler registry for common events
 * 
 * @param handlers - Event handlers
 * @returns Webhook handler registry
 * 
 * @example
 * ```typescript
 * const handlers = createWebhookHandlers({
 *   onPaymentSucceeded: async (event, paymentIntent) => {
 *     // Handle successful payment
 *   },
 *   onPaymentFailed: async (event, paymentIntent) => {
 *     // Handle failed payment
 *   },
 *   onSubscriptionCreated: async (event, subscription) => {
 *     // Handle new subscription
 *   },
 *   onSubscriptionCanceled: async (event, subscription) => {
 *     // Handle canceled subscription
 *   }
 * })
 * ```
 */
export function createWebhookHandlers(handlers: {
  onPaymentSucceeded?: WebhookHandler<Stripe.PaymentIntent>
  onPaymentFailed?: WebhookHandler<Stripe.PaymentIntent>
  onPaymentRequiresAction?: WebhookHandler<Stripe.PaymentIntent>
  onSubscriptionCreated?: WebhookHandler<Stripe.Subscription>
  onSubscriptionUpdated?: WebhookHandler<Stripe.Subscription>
  onSubscriptionCanceled?: WebhookHandler<Stripe.Subscription>
  onSubscriptionDeleted?: WebhookHandler<Stripe.Subscription>
  onInvoicePaymentSucceeded?: WebhookHandler<Stripe.Invoice>
  onInvoicePaymentFailed?: WebhookHandler<Stripe.Invoice>
  onCustomerCreated?: WebhookHandler<Stripe.Customer>
  onCustomerUpdated?: WebhookHandler<Stripe.Customer>
  onCustomerDeleted?: WebhookHandler<Stripe.Customer>
  onPaymentMethodAttached?: WebhookHandler<Stripe.PaymentMethod>
  onPaymentMethodDetached?: WebhookHandler<Stripe.PaymentMethod>
}): Record<string, WebhookHandler> {
  const eventHandlers: Record<string, WebhookHandler> = {}

  if (handlers.onPaymentSucceeded) {
    eventHandlers['payment_intent.succeeded'] = handlers.onPaymentSucceeded
  }
  
  if (handlers.onPaymentFailed) {
    eventHandlers['payment_intent.payment_failed'] = handlers.onPaymentFailed
  }
  
  if (handlers.onPaymentRequiresAction) {
    eventHandlers['payment_intent.requires_action'] = handlers.onPaymentRequiresAction
  }
  
  if (handlers.onSubscriptionCreated) {
    eventHandlers['customer.subscription.created'] = handlers.onSubscriptionCreated
  }
  
  if (handlers.onSubscriptionUpdated) {
    eventHandlers['customer.subscription.updated'] = handlers.onSubscriptionUpdated
  }
  
  if (handlers.onSubscriptionCanceled) {
    eventHandlers['customer.subscription.canceled'] = handlers.onSubscriptionCanceled
  }
  
  if (handlers.onSubscriptionDeleted) {
    eventHandlers['customer.subscription.deleted'] = handlers.onSubscriptionDeleted
  }
  
  if (handlers.onInvoicePaymentSucceeded) {
    eventHandlers['invoice.payment_succeeded'] = handlers.onInvoicePaymentSucceeded
  }
  
  if (handlers.onInvoicePaymentFailed) {
    eventHandlers['invoice.payment_failed'] = handlers.onInvoicePaymentFailed
  }
  
  if (handlers.onCustomerCreated) {
    eventHandlers['customer.created'] = handlers.onCustomerCreated
  }
  
  if (handlers.onCustomerUpdated) {
    eventHandlers['customer.updated'] = handlers.onCustomerUpdated
  }
  
  if (handlers.onCustomerDeleted) {
    eventHandlers['customer.deleted'] = handlers.onCustomerDeleted
  }
  
  if (handlers.onPaymentMethodAttached) {
    eventHandlers['payment_method.attached'] = handlers.onPaymentMethodAttached
  }
  
  if (handlers.onPaymentMethodDetached) {
    eventHandlers['payment_method.detached'] = handlers.onPaymentMethodDetached
  }

  return eventHandlers
}

/**
 * Common webhook event types
 */
export const WEBHOOK_EVENTS = {
  // Payment Intent events
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
  PAYMENT_INTENT_REQUIRES_ACTION: 'payment_intent.requires_action',
  PAYMENT_INTENT_CANCELED: 'payment_intent.canceled',
  PAYMENT_INTENT_CREATED: 'payment_intent.created',
  
  // Subscription events
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_CANCELED: 'customer.subscription.canceled',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
  
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_FINALIZED: 'invoice.finalized',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  INVOICE_UPCOMING: 'invoice.upcoming',
  
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  
  // Payment Method events
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
  PAYMENT_METHOD_DETACHED: 'payment_method.detached',
  PAYMENT_METHOD_UPDATED: 'payment_method.updated',
  
  // Setup Intent events
  SETUP_INTENT_SUCCEEDED: 'setup_intent.succeeded',
  SETUP_INTENT_SETUP_FAILED: 'setup_intent.setup_failed',
  SETUP_INTENT_REQUIRES_ACTION: 'setup_intent.requires_action',
} as const

/**
 * Check if an event is a specific type
 * 
 * @param event - Stripe event
 * @param eventType - Event type to check
 * @returns True if the event matches the type
 */
export function isEventType(event: Stripe.Event, eventType: string): boolean {
  return event.type === eventType
}

/**
 * Extract data from a webhook event with type safety
 * 
 * @param event - Stripe event
 * @returns The event data object
 */
export function getEventData<T = any>(event: Stripe.Event): T {
  return event.data.object as T
}

/**
 * Create a webhook endpoint configuration
 * 
 * @param config - Webhook configuration
 * @returns Webhook configuration object
 */
export function createWebhookConfig(config: WebhookConfig): WebhookConfig {
  return {
    verifySignature: true,
    ...config,
  }
}
