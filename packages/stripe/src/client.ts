import Stripe from 'stripe'
import type { KeyloomStripeConfig, StripeResult } from './types'
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
 * Main Keyloom Stripe client that provides access to all Stripe operations
 */
export interface KeyloomStripeClient {
  /** Raw Stripe client instance for advanced operations */
  readonly stripe: Stripe
  /** Configuration used to create this client */
  readonly config: KeyloomStripeConfig
  /** Payment operations */
  readonly payments: PaymentOperations
  /** Customer operations */
  readonly customers: CustomerOperations
  /** Subscription operations */
  readonly subscriptions: SubscriptionOperations
  /** Payment method operations */
  readonly paymentMethods: PaymentMethodOperations
  /** Webhook operations */
  readonly webhooks: WebhookOperations
}

/**
 * Payment operations interface
 */
export interface PaymentOperations {
  createPaymentIntent(
    options: import('./types').CreatePaymentIntentOptions,
  ): Promise<StripeResult<Stripe.PaymentIntent>>
  confirmPaymentIntent(
    paymentIntentId: string,
    options?: Partial<Stripe.PaymentIntentConfirmParams>,
  ): Promise<StripeResult<Stripe.PaymentIntent>>
  retrievePaymentIntent(paymentIntentId: string): Promise<StripeResult<Stripe.PaymentIntent>>
  updatePaymentIntent(
    paymentIntentId: string,
    options: Partial<Stripe.PaymentIntentUpdateParams>,
  ): Promise<StripeResult<Stripe.PaymentIntent>>
  cancelPaymentIntent(
    paymentIntentId: string,
    options?: Stripe.PaymentIntentCancelParams,
  ): Promise<StripeResult<Stripe.PaymentIntent>>
}

/**
 * Customer operations interface
 */
export interface CustomerOperations {
  create(options: import('./types').CreateCustomerOptions): Promise<StripeResult<Stripe.Customer>>
  retrieve(customerId: string): Promise<StripeResult<Stripe.Customer>>
  update(
    customerId: string,
    options: Partial<Stripe.CustomerUpdateParams>,
  ): Promise<StripeResult<Stripe.Customer>>
  delete(customerId: string): Promise<StripeResult<Stripe.DeletedCustomer>>
  list(options?: Stripe.CustomerListParams): Promise<StripeResult<Stripe.ApiList<Stripe.Customer>>>
}

/**
 * Subscription operations interface
 */
export interface SubscriptionOperations {
  create(
    options: import('./types').CreateSubscriptionOptions,
  ): Promise<StripeResult<Stripe.Subscription>>
  retrieve(subscriptionId: string): Promise<StripeResult<Stripe.Subscription>>
  update(
    subscriptionId: string,
    options: Partial<Stripe.SubscriptionUpdateParams>,
  ): Promise<StripeResult<Stripe.Subscription>>
  cancel(
    subscriptionId: string,
    options?: Stripe.SubscriptionCancelParams,
  ): Promise<StripeResult<Stripe.Subscription>>
  list(
    options?: Stripe.SubscriptionListParams,
  ): Promise<StripeResult<Stripe.ApiList<Stripe.Subscription>>>
}

/**
 * Payment method operations interface
 */
export interface PaymentMethodOperations {
  attach(
    options: import('./types').AttachPaymentMethodOptions,
  ): Promise<StripeResult<Stripe.PaymentMethod>>
  detach(paymentMethodId: string): Promise<StripeResult<Stripe.PaymentMethod>>
  retrieve(paymentMethodId: string): Promise<StripeResult<Stripe.PaymentMethod>>
  list(
    customerId: string,
    options?: Partial<Stripe.PaymentMethodListParams>,
  ): Promise<StripeResult<Stripe.ApiList<Stripe.PaymentMethod>>>
  setDefault(customerId: string, paymentMethodId: string): Promise<StripeResult<Stripe.Customer>>
}

/**
 * Webhook operations interface
 */
export interface WebhookOperations {
  processWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
    handlers?: Record<string, import('./types').WebhookHandler>,
  ): Promise<StripeResult<Stripe.Event>>
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): StripeResult<Stripe.Event>
}

/**
 * Create a new Keyloom Stripe client
 *
 * @param config - Configuration options for the Stripe client
 * @returns A new KeyloomStripeClient instance
 *
 * @example
 * ```typescript
 * const stripe = createKeyloomStripe({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
 *   defaultCurrency: 'usd'
 * })
 * ```
 */
export function createKeyloomStripe(config: KeyloomStripeConfig): KeyloomStripeClient {
  // Validate required configuration
  if (!config.secretKey) {
    throw new Error('Stripe secret key is required')
  }

  // Determine API version
  const apiVersion = config.apiVersion || '2025-02-24.acacia'

  // Create Stripe client with configuration
  const stripe = new Stripe(config.secretKey, {
    apiVersion,
    typescript: true,
    ...config.stripeOptions,
  })

  // Create operation implementations
  const payments = createPaymentOperations(stripe, config)
  const customers = createCustomerOperations(stripe, config)
  const subscriptions = createSubscriptionOperations(stripe, config)
  const paymentMethods = createPaymentMethodOperations(stripe, config)
  const webhooks = createWebhookOperations(stripe, config)

  return {
    stripe,
    config,
    payments,
    customers,
    subscriptions,
    paymentMethods,
    webhooks,
  }
}

/**
 * Create payment operations
 */
function createPaymentOperations(stripe: Stripe, config: KeyloomStripeConfig): PaymentOperations {
  return {
    async createPaymentIntent(options) {
      try {
        const params = filterUndefined({
          amount: options.amount,
          currency: options.currency || config.defaultCurrency || 'usd',
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
    },

    async confirmPaymentIntent(paymentIntentId, options = {}) {
      try {
        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, options)
        return { success: true, data: paymentIntent }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async retrievePaymentIntent(paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        return { success: true, data: paymentIntent }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async updatePaymentIntent(paymentIntentId, options) {
      try {
        const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, options)
        return { success: true, data: paymentIntent }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async cancelPaymentIntent(paymentIntentId, options = {}) {
      try {
        const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, options)
        return { success: true, data: paymentIntent }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },
  }
}

/**
 * Create customer operations
 */
function createCustomerOperations(
  stripe: Stripe,
  _config: KeyloomStripeConfig,
): CustomerOperations {
  return {
    async create(options) {
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
    },

    async retrieve(customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        return { success: true, data: customer as Stripe.Customer }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async update(customerId, options) {
      try {
        const customer = await stripe.customers.update(customerId, options)
        return { success: true, data: customer }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async delete(customerId) {
      try {
        const deleted = await stripe.customers.del(customerId)
        return { success: true, data: deleted }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async list(options = {}) {
      try {
        const customers = await stripe.customers.list(options)
        return { success: true, data: customers }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },
  }
}

/**
 * Create subscription operations
 */
function createSubscriptionOperations(
  stripe: Stripe,
  _config: KeyloomStripeConfig,
): SubscriptionOperations {
  return {
    async create(options) {
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
    },

    async retrieve(subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        return { success: true, data: subscription }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async update(subscriptionId, options) {
      try {
        const subscription = await stripe.subscriptions.update(subscriptionId, options)
        return { success: true, data: subscription }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async cancel(subscriptionId, options = {}) {
      try {
        const subscription = await stripe.subscriptions.cancel(subscriptionId, options)
        return { success: true, data: subscription }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async list(options = {}) {
      try {
        const subscriptions = await stripe.subscriptions.list(options)
        return { success: true, data: subscriptions }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },
  }
}

/**
 * Create payment method operations
 */
function createPaymentMethodOperations(
  stripe: Stripe,
  _config: KeyloomStripeConfig,
): PaymentMethodOperations {
  return {
    async attach(options) {
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
    },

    async detach(paymentMethodId) {
      try {
        const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId)
        return { success: true, data: paymentMethod }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async retrieve(paymentMethodId) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
        return { success: true, data: paymentMethod }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async list(customerId, options = {}) {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          ...options,
        })
        return { success: true, data: paymentMethods }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },

    async setDefault(customerId, paymentMethodId) {
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
    },
  }
}

/**
 * Create webhook operations
 */
function createWebhookOperations(stripe: Stripe, _config: KeyloomStripeConfig): WebhookOperations {
  return {
    async processWebhook(payload, signature, secret, handlers = {}) {
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
    },

    verifySignature(payload, signature, secret) {
      try {
        const event = stripe.webhooks.constructEvent(payload, signature, secret)
        return { success: true, data: event }
      } catch (error) {
        return { success: false, error: normalizeStripeError(error) }
      }
    },
  }
}
