import type Stripe from 'stripe'

/**
 * Configuration options for the Keyloom Stripe client
 */
export interface KeyloomStripeConfig {
  /** Stripe secret key */
  secretKey: string
  /** Stripe publishable key (for client-side operations) */
  publishableKey?: string
  /** Stripe API version to use */
  apiVersion?: '2025-02-24.acacia'
  /** Webhook endpoint secret for signature verification */
  webhookSecret?: string
  /** Default currency for payment operations */
  defaultCurrency?: string
  /** Environment (test/live) */
  environment?: 'test' | 'live'
  /** Additional Stripe client options */
  stripeOptions?: Stripe.StripeConfig
}

/**
 * Result wrapper for Stripe operations
 */
export type StripeResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: StripeError
    }

/**
 * Enhanced error information for Stripe operations
 */
export interface StripeError {
  /** Error type */
  type: 'stripe_error' | 'validation_error' | 'network_error' | 'unknown_error'
  /** Error message */
  message: string
  /** Original Stripe error code if available */
  code?: string
  /** HTTP status code if available */
  statusCode?: number
  /** Additional error details */
  details?: Record<string, any>
  /** Original error object */
  originalError?: any
}

/**
 * Payment intent creation options
 */
export interface CreatePaymentIntentOptions {
  /** Amount in smallest currency unit (e.g., cents for USD) */
  amount: number
  /** Currency code (ISO 4217) */
  currency?: string
  /** Customer ID */
  customerId?: string
  /** Payment method ID */
  paymentMethodId?: string
  /** Whether to confirm the payment intent immediately */
  confirmImmediately?: boolean
  /** Description for the payment */
  description?: string
  /** Metadata to attach to the payment intent */
  metadata?: Record<string, string>
  /** Receipt email */
  receiptEmail?: string
  /** Setup future usage */
  setupFutureUsage?: 'on_session' | 'off_session'
  /** Additional Stripe options */
  stripeOptions?: Partial<Stripe.PaymentIntentCreateParams>
}

/**
 * Customer creation options
 */
export interface CreateCustomerOptions {
  /** Customer email */
  email?: string
  /** Customer name */
  name?: string
  /** Customer phone */
  phone?: string
  /** Customer description */
  description?: string
  /** Customer metadata */
  metadata?: Record<string, string>
  /** Default payment method */
  defaultPaymentMethod?: string
  /** Additional Stripe options */
  stripeOptions?: Partial<Stripe.CustomerCreateParams>
}

/**
 * Subscription creation options
 */
export interface CreateSubscriptionOptions {
  /** Customer ID */
  customerId: string
  /** Price ID or array of price IDs */
  priceId: string | string[]
  /** Default payment method */
  defaultPaymentMethod?: string
  /** Trial period end timestamp */
  trialEnd?: number
  /** Coupon ID */
  coupon?: string
  /** Subscription metadata */
  metadata?: Record<string, string>
  /** Additional Stripe options */
  stripeOptions?: Partial<Stripe.SubscriptionCreateParams>
}

/**
 * Payment method attachment options
 */
export interface AttachPaymentMethodOptions {
  /** Payment method ID */
  paymentMethodId: string
  /** Customer ID */
  customerId: string
  /** Whether to set as default payment method */
  setAsDefault?: boolean
}

/**
 * Webhook event handler function type
 */
export type WebhookHandler<T = any> = (event: Stripe.Event, data: T) => Promise<void> | void

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Webhook endpoint secret */
  secret: string
  /** Event handlers */
  handlers?: Record<string, WebhookHandler>
  /** Whether to verify signatures */
  verifySignature?: boolean
}

/**
 * Enhanced Stripe customer with Keyloom integration
 */
export interface KeyloomCustomer extends Stripe.Customer {
  /** Associated Keyloom user ID */
  keyloomUserId?: string
}

/**
 * Enhanced payment intent with additional context
 */
export interface KeyloomPaymentIntent extends Stripe.PaymentIntent {
  /** Associated Keyloom user ID */
  keyloomUserId?: string
  /** Associated Keyloom session ID */
  keyloomSessionId?: string
}

/**
 * Enhanced subscription with Keyloom integration
 */
export interface KeyloomSubscription extends Stripe.Subscription {
  /** Associated Keyloom user ID */
  keyloomUserId?: string
  /** Associated Keyloom organization ID */
  keyloomOrgId?: string
}
