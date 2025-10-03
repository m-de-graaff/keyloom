# Magic Link Authentication

Magic link authentication allows users to sign in without passwords by clicking a secure link sent to their email address. This guide shows how to set up and use magic link authentication with Keyloom.

## Overview

Magic link authentication works by:
1. User enters their email address
2. System generates a secure token and sends an email with a magic link
3. User clicks the link in their email
4. System verifies the token and creates a session

## Configuration

### Basic Setup

Add magic link configuration to your Keyloom config:

```typescript
import { createKeyloom } from '@keyloom/core'
import { PrismaAdapter } from '@keyloom/adapters'

const keyloom = createKeyloom({
  adapter: PrismaAdapter(prisma),
  secrets: {
    authSecret: process.env.AUTH_SECRET!,
  },
  appName: 'My App',
  magicLink: {
    enabled: true,
    defaultTtlMinutes: 15, // Magic links expire after 15 minutes
    autoCreateUser: true, // Automatically create users if they don't exist
    verifyPath: '/auth/magic-link/verify', // Path for verification endpoint
  },
  email: {
    provider: {
      type: 'smtp', // or 'resend'
      config: {
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT!),
        secure: false,
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      },
    },
    from: 'noreply@myapp.com',
  },
})
```

### Email Provider Options

#### SMTP Provider

For generic SMTP servers:

```typescript
email: {
  provider: {
    type: 'smtp',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password',
      },
    },
  },
  from: 'noreply@myapp.com',
}
```

Common SMTP presets are available for popular providers:

```typescript
import { smtpPresets } from '@keyloom/core/email'

// Use Gmail preset
email: {
  provider: {
    type: 'smtp',
    config: {
      ...smtpPresets.gmail,
      auth: {
        user: process.env.GMAIL_USER!,
        pass: process.env.GMAIL_PASS!,
      },
    },
  },
  from: 'noreply@myapp.com',
}
```

#### Resend Provider

For Resend API:

```typescript
email: {
  provider: {
    type: 'resend',
    config: {
      apiKey: process.env.RESEND_API_KEY!,
    },
  },
  from: 'noreply@myapp.com',
}
```

### Environment Variables

Set up your environment variables:

```bash
# Required
AUTH_SECRET=your-base64url-encoded-secret

# For SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@myapp.com

# For Resend
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@myapp.com
```

## Usage

### Next.js Integration

The magic link endpoints are automatically available when using `@keyloom/nextjs`:

- `POST /api/auth/magic-link/request` - Request a magic link
- `GET /api/auth/magic-link/verify` - Verify magic link (from email)
- `POST /api/auth/magic-link/verify` - Verify magic link (programmatically)

### Frontend Implementation

Use the `MagicLinkForm` component from `@keyloom/ui`:

```tsx
import { MagicLinkForm } from '@keyloom/ui/auth'

export default function SignInPage() {
  return (
    <div>
      <h1>Sign In</h1>
      <MagicLinkForm
        onSuccess={(result) => {
          console.log('Magic link sent!', result)
        }}
        onError={(error) => {
          console.error('Error:', error)
        }}
        className="my-form-class"
      />
    </div>
  )
}
```

### Manual API Usage

Request a magic link:

```typescript
const response = await fetch('/api/auth/magic-link/request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Keyloom-CSRF': csrfToken,
  },
  body: JSON.stringify({
    email: 'user@example.com',
    redirectTo: '/dashboard', // Optional redirect after verification
    ttlMinutes: 10, // Optional custom expiration
  }),
})

const result = await response.json()
if (result.success) {
  console.log('Magic link sent!')
}
```

## Security Features

### Rate Limiting

Magic link requests are rate-limited to prevent abuse:
- **Request endpoint**: 3 requests per IP, refills at 0.1/second (1 every 10 seconds)
- **Verification endpoint**: 10 attempts per IP, refills at 0.5/second

### CSRF Protection

All POST endpoints require CSRF tokens using the double-submit cookie pattern.

### Token Security

- Magic link tokens are cryptographically secure random values
- Tokens are hashed before storage in the database
- Tokens expire after the configured TTL (default: 15 minutes)
- Tokens are single-use and deleted after verification

## Configuration Options

### Magic Link Options

```typescript
magicLink: {
  enabled: boolean // Enable/disable magic link authentication
  defaultTtlMinutes: number // Default token expiration (default: 15)
  defaultSessionTtlMinutes: number // Session duration after login (default: 60 * 24 * 7)
  autoCreateUser: boolean // Auto-create users if they don't exist (default: true)
  requireEmailVerification: boolean // Require email verification for new users (default: false)
  verifyPath: string // Verification endpoint path (default: '/auth/magic-link/verify')
}
```

### Email Template Customization

Customize the magic link email template:

```typescript
import { defaultMagicLinkTemplate } from '@keyloom/core/email'

email: {
  // ... provider config
  template: {
    subject: (data) => `Sign in to ${data.appName}`,
    html: (data) => `
      <h1>Welcome to ${data.appName}</h1>
      <p>Click the link below to sign in:</p>
      <a href="${data.magicLinkUrl}">Sign In</a>
      <p>This link expires in ${data.expirationMinutes} minutes.</p>
    `,
    text: (data) => `
      Welcome to ${data.appName}
      
      Click the link below to sign in:
      ${data.magicLinkUrl}
      
      This link expires in ${data.expirationMinutes} minutes.
    `,
  },
}
```

## Troubleshooting

### Common Issues

1. **Email not sending**: Check your email provider configuration and credentials
2. **Magic link expired**: Increase `defaultTtlMinutes` or ask users to request a new link
3. **Rate limiting**: Users hitting rate limits should wait before requesting new links
4. **CSRF errors**: Ensure CSRF tokens are properly included in requests

### Testing

Use the included test utilities to verify your setup:

```typescript
import { requestMagicLink, verifyMagicLink } from '@keyloom/core/magic-link'

// Test magic link request
const result = await requestMagicLink(
  { email: 'test@example.com' },
  { adapter, emailService, baseUrl: 'http://localhost:3000', appName: 'Test App' }
)

console.log('Magic link result:', result)
```
