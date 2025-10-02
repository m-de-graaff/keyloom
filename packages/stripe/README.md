# @keyloom/stripe

A simplified, type-safe wrapper around Stripe's payment APIs with seamless integration into the Keyloom authentication system.

## Features

- 🔐 **Secure Integration** - Built-in webhook signature verification and secure API key management
- 💳 **Payment Processing** - Easy-to-use abstractions for payment intents, customers, and subscriptions
- 🎯 **Type Safe** - Full TypeScript support with comprehensive type definitions
- ⚡ **Developer Friendly** - Intuitive APIs that abstract away Stripe's complexity
- 🔧 **Keyloom Integration** - Seamless integration with Keyloom's authentication and user management
- 🛡️ **Error Handling** - Comprehensive error handling with detailed error information

## Installation

```bash
npm install @keyloom/stripe stripe
# or
pnpm add @keyloom/stripe stripe
# or
yarn add @keyloom/stripe stripe
```

## Quick Start

### 1. Setup

```typescript
import { createKeyloomStripe } from '@keyloom/stripe'

const stripe = createKeyloomStripe({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  defaultCurrency: 'usd'
})
```

### 2. Create a Payment Intent

```typescript
const result = await stripe.payments.createPaymentIntent({
  amount: 2000, // $20.00 in cents
  currency: 'usd',
  customerId: 'cus_123',
  description: 'Premium subscription'
})

if (result.success) {
  console.log('Payment intent created:', result.data.id)
  console.log('Client secret:', result.data.client_secret)
} else {
  console.error('Error:', result.error.message)
}
```

### 3. Manage Customers

```typescript
// Create a customer
const customerResult = await stripe.customers.create({
  email: 'user@example.com',
  name: 'John Doe',
  metadata: {
    keyloomUserId: 'user_123'
  }
})

// Retrieve a customer
const customer = await stripe.customers.retrieve('cus_123')
```

### 4. Handle Subscriptions

```typescript
// Create a subscription
const subscriptionResult = await stripe.subscriptions.create({
  customerId: 'cus_123',
  priceId: 'price_123',
  defaultPaymentMethod: 'pm_123'
})

// Cancel a subscription
const cancelResult = await stripe.subscriptions.cancel('sub_123')
```

### 5. Process Webhooks

```typescript
import { webhooks } from '@keyloom/stripe'

// In your webhook endpoint
app.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature']
  
  const result = await webhooks.processWebhook(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
    {
      'payment_intent.succeeded': async (event, paymentIntent) => {
        console.log('Payment succeeded:', paymentIntent.id)
        // Update your database, send confirmation email, etc.
      },
      'customer.subscription.created': async (event, subscription) => {
        console.log('Subscription created:', subscription.id)
        // Activate user's premium features
      }
    }
  )
  
  if (result.success) {
    res.status(200).send('OK')
  } else {
    res.status(400).send('Webhook error')
  }
})
```

## API Reference

### Core Client

#### `createKeyloomStripe(config)`

Creates a new Keyloom Stripe client instance.

**Parameters:**
- `config.secretKey` - Your Stripe secret key
- `config.publishableKey` - Your Stripe publishable key (optional)
- `config.webhookSecret` - Webhook endpoint secret for signature verification
- `config.defaultCurrency` - Default currency for operations (default: 'usd')
- `config.environment` - Environment ('test' or 'live')

### Payments

#### `payments.createPaymentIntent(options)`

Creates a new payment intent.

#### `payments.confirmPaymentIntent(paymentIntentId, options?)`

Confirms a payment intent.

#### `payments.retrievePaymentIntent(paymentIntentId)`

Retrieves a payment intent by ID.

### Customers

#### `customers.create(options)`

Creates a new customer.

#### `customers.retrieve(customerId)`

Retrieves a customer by ID.

#### `customers.update(customerId, options)`

Updates a customer.

#### `customers.delete(customerId)`

Deletes a customer.

### Subscriptions

#### `subscriptions.create(options)`

Creates a new subscription.

#### `subscriptions.retrieve(subscriptionId)`

Retrieves a subscription by ID.

#### `subscriptions.update(subscriptionId, options)`

Updates a subscription.

#### `subscriptions.cancel(subscriptionId, options?)`

Cancels a subscription.

### Payment Methods

#### `paymentMethods.attach(options)`

Attaches a payment method to a customer.

#### `paymentMethods.detach(paymentMethodId)`

Detaches a payment method from a customer.

#### `paymentMethods.setDefault(customerId, paymentMethodId)`

Sets a payment method as the default for a customer.

### Webhooks

#### `webhooks.processWebhook(payload, signature, secret, handlers)`

Processes a Stripe webhook with signature verification.

## Error Handling

All operations return a `StripeResult<T>` type that wraps the result:

```typescript
type StripeResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: StripeError
}
```

You can also use the `assertSuccess` helper to throw errors:

```typescript
import { assertSuccess } from '@keyloom/stripe'

try {
  const paymentIntent = assertSuccess(
    await stripe.payments.createPaymentIntent({ amount: 2000 })
  )
  console.log('Payment intent:', paymentIntent.id)
} catch (error) {
  if (error instanceof KeyloomStripeError) {
    console.error('Stripe error:', error.message, error.code)
  }
}
```

## Integration with Keyloom

This package is designed to work seamlessly with Keyloom's authentication system:

```typescript
import { createKeyloom } from '@keyloom/core'
import { createKeyloomStripe } from '@keyloom/stripe'

const keyloom = createKeyloom({
  // ... your keyloom config
})

const stripe = createKeyloomStripe({
  secretKey: process.env.STRIPE_SECRET_KEY!
})

// In your API route
export async function POST(request: Request) {
  const session = await keyloom.getSession(request)
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Create a customer linked to the Keyloom user
  const customerResult = await stripe.customers.create({
    email: session.user.email,
    metadata: {
      keyloomUserId: session.user.id
    }
  })
  
  // ... rest of your payment logic
}
```

## License

MIT
