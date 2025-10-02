import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createKeyloomStripe } from '../client'
import type { KeyloomStripeConfig } from '../types'

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: vi.fn(),
      confirm: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      del: vi.fn(),
      list: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      list: vi.fn(),
    },
    paymentMethods: {
      attach: vi.fn(),
      detach: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }

  return {
    default: vi.fn(() => mockStripe),
  }
})

describe('KeyloomStripe Client', () => {
  let config: KeyloomStripeConfig
  let mockStripeInstance: any

  beforeEach(async () => {
    vi.clearAllMocks()

    config = {
      secretKey: 'sk_test_123',
      webhookSecret: 'whsec_123',
      defaultCurrency: 'usd',
    }

    // Get the mocked Stripe instance
    const Stripe = vi.mocked(await import('stripe')).default
    mockStripeInstance = new Stripe(config.secretKey)
  })

  describe('createKeyloomStripe', () => {
    it('should create a client with valid configuration', () => {
      const client = createKeyloomStripe(config)

      expect(client).toBeDefined()
      expect(client.config).toEqual(config)
      expect(client.stripe).toBeDefined()
      expect(client.payments).toBeDefined()
      expect(client.customers).toBeDefined()
      expect(client.subscriptions).toBeDefined()
      expect(client.paymentMethods).toBeDefined()
      expect(client.webhooks).toBeDefined()
    })

    it('should throw error for missing secret key', () => {
      expect(() => {
        createKeyloomStripe({ secretKey: '' })
      }).toThrow('Stripe secret key is required')
    })
  })

  describe('Payment Operations', () => {
    it('should create payment intent successfully', async () => {
      const client = createKeyloomStripe(config)
      const mockPaymentIntent = { id: 'pi_123', client_secret: 'pi_123_secret' }

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

      const result = await client.payments.createPaymentIntent({
        amount: 2000,
        currency: 'usd',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockPaymentIntent)
      }
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2000,
        currency: 'usd',
        customer: undefined,
        payment_method: undefined,
        confirm: undefined,
        description: undefined,
        metadata: undefined,
        receipt_email: undefined,
        setup_future_usage: undefined,
      })
    })

    it('should handle payment intent creation error', async () => {
      const client = createKeyloomStripe(config)
      const error = new Error('Card declined')

      mockStripeInstance.paymentIntents.create.mockRejectedValue(error)

      const result = await client.payments.createPaymentIntent({
        amount: 2000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Card declined')
        expect(result.error.type).toBe('unknown_error')
      }
    })
  })

  describe('Customer Operations', () => {
    it('should create customer successfully', async () => {
      const client = createKeyloomStripe(config)
      const mockCustomer = { id: 'cus_123', email: 'test@example.com' }

      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer)

      const result = await client.customers.create({
        email: 'test@example.com',
        name: 'Test User',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockCustomer)
      }
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        phone: undefined,
        description: undefined,
        metadata: undefined,
        invoice_settings: undefined,
      })
    })
  })

  describe('Subscription Operations', () => {
    it('should create subscription successfully', async () => {
      const client = createKeyloomStripe(config)
      const mockSubscription = { id: 'sub_123', status: 'active' }

      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription)

      const result = await client.subscriptions.create({
        customerId: 'cus_123',
        priceId: 'price_123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockSubscription)
      }
      expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_123' }],
        default_payment_method: undefined,
        trial_end: undefined,
        coupon: undefined,
        metadata: undefined,
      })
    })

    it('should handle multiple price IDs', async () => {
      const client = createKeyloomStripe(config)
      const mockSubscription = { id: 'sub_123', status: 'active' }

      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription)

      const result = await client.subscriptions.create({
        customerId: 'cus_123',
        priceId: ['price_123', 'price_456'],
      })

      expect(result.success).toBe(true)
      expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_123' }, { price: 'price_456' }],
        default_payment_method: undefined,
        trial_end: undefined,
        coupon: undefined,
        metadata: undefined,
      })
    })
  })

  describe('Webhook Operations', () => {
    it('should process webhook successfully', async () => {
      const client = createKeyloomStripe(config)
      const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded', data: { object: {} } }

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent)

      const result = await client.webhooks.processWebhook('payload', 'signature', 'secret')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockEvent)
      }
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'secret',
      )
    })

    it('should execute webhook handler', async () => {
      const client = createKeyloomStripe(config)
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      }
      const handler = vi.fn()

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent)

      const result = await client.webhooks.processWebhook('payload', 'signature', 'secret', {
        'payment_intent.succeeded': handler,
      })

      expect(result.success).toBe(true)
      expect(handler).toHaveBeenCalledWith(mockEvent, mockEvent.data.object)
    })
  })
})
