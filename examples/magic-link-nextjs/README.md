# Magic Link Authentication Example

This example demonstrates how to implement magic link (passwordless) authentication in a Next.js application using Keyloom.

## Features

- ✅ Magic link authentication flow
- ✅ Email sending with SMTP or Resend
- ✅ Rate limiting and CSRF protection
- ✅ Automatic user creation
- ✅ Session management
- ✅ TypeScript support

## Setup

1. **Install dependencies**:
```bash
npm install @keyloom/core @keyloom/nextjs @keyloom/ui @keyloom/adapters
npm install @prisma/client prisma
```

2. **Environment variables** (`.env.local`):
```bash
# Required
AUTH_SECRET=your-base64url-encoded-secret-here
DATABASE_URL=your-database-connection-string

# Email provider (choose one)
# Option 1: SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com

# Option 2: Resend
# RESEND_API_KEY=re_your_api_key_here
# EMAIL_FROM=noreply@yourapp.com
```

3. **Database setup**:
```bash
npx prisma generate
npx prisma db push
```

## Configuration

### Keyloom Config (`lib/auth.ts`)

```typescript
import { createKeyloom } from '@keyloom/core'
import { PrismaAdapter } from '@keyloom/adapters'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const keyloom = createKeyloom({
  adapter: PrismaAdapter(prisma),
  secrets: {
    authSecret: process.env.AUTH_SECRET!,
  },
  appName: 'Magic Link Demo',
  session: {
    strategy: 'database',
    ttlMinutes: 60 * 24 * 7, // 7 days
    rolling: true,
  },
  magicLink: {
    enabled: true,
    defaultTtlMinutes: 15,
    autoCreateUser: true,
    verifyPath: '/auth/magic-link/verify',
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
    from: process.env.EMAIL_FROM!,
  },
})
```

### API Route (`pages/api/auth/[...keyloom].ts`)

```typescript
import { createKeyloomHandler } from '@keyloom/nextjs'
import { keyloom } from '../../../lib/auth'

export default createKeyloomHandler(keyloom)
```

### Sign In Page (`pages/auth/signin.tsx`)

```tsx
import { useState } from 'react'
import { MagicLinkForm } from '@keyloom/ui/auth'
import { AuthUIProvider } from '@keyloom/ui'

export default function SignInPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)

  return (
    <AuthUIProvider
      config={{
        apiBasePath: '/api/auth',
        localization: {
          magicLinkForm: {
            title: 'Sign in with Magic Link',
            emailLabel: 'Email address',
            emailPlaceholder: 'Enter your email',
            submitButton: 'Send Magic Link',
            submittingButton: 'Sending...',
            successMessage: 'Check your email for a magic link!',
            errorMessage: 'Something went wrong. Please try again.',
          },
        },
      }}
    >
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
          </div>
          
          {!isSubmitted ? (
            <MagicLinkForm
              onSuccess={() => setIsSubmitted(true)}
              onError={(error) => console.error('Magic link error:', error)}
              className="mt-8 space-y-6"
            />
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Check your email!
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                We've sent you a magic link. Click it to sign in.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="mt-4 text-sm text-blue-600 hover:text-blue-500"
              >
                Send another link
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthUIProvider>
  )
}
```

### Protected Page (`pages/dashboard.tsx`)

```tsx
import { GetServerSideProps } from 'next'
import { getCurrentSession } from '@keyloom/core/runtime/current-session'
import { keyloom } from '../lib/auth'

interface DashboardProps {
  user: {
    id: string
    email: string
  }
}

export default function Dashboard({ user }: DashboardProps) {
  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth/signin'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to your dashboard!
            </h1>
            <p className="text-gray-600 mb-4">
              You're signed in as: <strong>{user.email}</strong>
            </p>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const sessionId = context.req.cookies['__keyloom_session']
  
  if (!sessionId) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  try {
    const session = await getCurrentSession(sessionId, {
      adapter: keyloom.adapter,
    })

    if (!session) {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      }
    }

    return {
      props: {
        user: {
          id: session.userId,
          email: session.user.email,
        },
      },
    }
  } catch (error) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }
}
```

## Usage Flow

1. User visits `/auth/signin`
2. User enters their email address
3. System sends a magic link to their email
4. User clicks the magic link in their email
5. System verifies the token and creates a session
6. User is redirected to `/dashboard` (or specified redirect URL)

## Customization

### Custom Email Template

```typescript
// In your Keyloom config
email: {
  // ... provider config
  template: {
    subject: (data) => `🔐 Your magic link for ${data.appName}`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome back!</h1>
        <p>Click the button below to sign in to ${data.appName}:</p>
        <a href="${data.magicLinkUrl}" 
           style="display: inline-block; background: #007bff; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Sign In to ${data.appName}
        </a>
        <p style="color: #666; font-size: 14px;">
          This link expires in ${data.expirationMinutes} minutes.
        </p>
      </div>
    `,
    text: (data) => `
      Welcome back!
      
      Click this link to sign in to ${data.appName}:
      ${data.magicLinkUrl}
      
      This link expires in ${data.expirationMinutes} minutes.
    `,
  },
}
```

### Rate Limiting Configuration

The default rate limits are:
- Magic link requests: 3 per IP every 10 seconds
- Magic link verification: 10 per IP every 2 seconds

These can be customized by modifying the handler implementation.

## Security Considerations

- Magic links expire after 15 minutes by default
- Tokens are cryptographically secure and single-use
- Rate limiting prevents abuse
- CSRF protection on all POST endpoints
- Sessions are securely managed with rolling expiration

## Troubleshooting

1. **Email not sending**: Check your SMTP/Resend configuration
2. **Magic link not working**: Verify the `verifyPath` matches your API route
3. **Rate limiting**: Wait between requests or adjust rate limits
4. **Session issues**: Check your database connection and session configuration
