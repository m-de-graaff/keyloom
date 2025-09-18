# @keyloom/nextjs

Next.js integration for Keyloom authentication library. Provides seamless authentication for both App Router and Pages Router with middleware support.

## Features

- 🚀 **App Router & Pages Router** - Full support for both routing systems
- 🛡️ **Edge Runtime Middleware** - Fast route protection at the edge
- 🔐 **Server Components** - RSC-safe authentication helpers
- 🎯 **TypeScript First** - Complete type safety
- 🔒 **CSRF Protection** - Built-in security for all POST requests
- ⚡ **Session Management** - Database-backed sessions with rolling expiration
- 🔧 **Flexible Configuration** - Customizable auth flows and routes

## Installation

```bash
npm install @keyloom/nextjs @keyloom/core
# or
pnpm add @keyloom/nextjs @keyloom/core
# or
yarn add @keyloom/nextjs @keyloom/core
```

## Quick Start (10 minutes)

### 1. Create Keyloom Config

```typescript
// keyloom.config.ts
import { memoryAdapter } from '@keyloom/core'

export default {
  adapter: memoryAdapter(), // Use prismaAdapter(prisma) in production
  session: { 
    strategy: 'database' as const, 
    ttlMinutes: 60, 
    rolling: true 
  },
  secrets: { 
    authSecret: process.env.AUTH_SECRET ?? 'dev-secret-change-in-production' 
  },
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
}
```

### 2. Add API Routes

**App Router:**
```typescript
// app/api/auth/[[...keyloom]]/route.ts
import { createNextHandler } from '@keyloom/nextjs'
import keyloomConfig from '../../../../keyloom.config'

const { GET, POST } = createNextHandler(keyloomConfig)
export { GET, POST }
```

**Pages Router:**
```typescript
// pages/api/auth/[...keyloom].ts
import { createPagesApiHandler } from '@keyloom/nextjs'
import keyloomConfig from '../../../keyloom.config'

export default createPagesApiHandler(keyloomConfig)
```

### 3. Add Middleware (Optional but Recommended)

```typescript
// middleware.ts
import { createAuthMiddleware } from '@keyloom/nextjs/middleware'
import keyloomConfig from './keyloom.middleware' // Edge-safe config

export default createAuthMiddleware(keyloomConfig, {
  publicRoutes: ['/', '/sign-in', '/sign-up'],
  // Optional: verify sessions at edge (slower but more secure)
  verifyAtEdge: false
})

export const config = { 
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'] 
}
```

**Edge-safe config for middleware:**
```typescript
// keyloom.middleware.ts (no Node.js imports)
export default {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  session: { strategy: 'database', ttlMinutes: 60, rolling: true },
  secrets: { authSecret: process.env.AUTH_SECRET ?? 'dev-secret' },
}
```

### 4. Use in Components

**Server Components:**
```typescript
import { getSession, getUser, guard } from '@keyloom/nextjs'
import keyloomConfig from '../keyloom.config'

export default async function Dashboard() {
  // Option 1: Manual check
  const { session, user } = await getSession(keyloomConfig)
  if (!session) redirect('/sign-in')

  // Option 2: Guard helper
  const user = await guard(keyloomConfig) // Throws if not authenticated

  return <div>Welcome {user.email}!</div>
}
```

**Client Components:**
```typescript
'use client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Get CSRF token (also sets HttpOnly cookie)
    const csrfRes = await fetch('/api/auth/csrf')
    const { csrfToken } = await csrfRes.json()

    // Login (send token via header for double-submit validation)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-keyloom-csrf': csrfToken,
      },
      body: JSON.stringify({ email, password })
    })

    if (res.ok) {
      window.location.href = '/dashboard'
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email" 
        required 
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password" 
        required 
      />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

## API Reference

### `createNextHandler(config)`

Creates GET and POST handlers for authentication routes:

- `GET /api/auth/session` - Get current session
- `GET /api/auth/csrf` - Get CSRF token
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/oauth/:provider/start` - Begin OAuth flow (supports `?callbackUrl=`)
- `GET /api/auth/oauth/:provider/callback` - Complete OAuth code exchange
- `POST /api/auth/oauth/:provider/callback` - Complete OAuth when response_mode=form_post

### `createAuthMiddleware(config, options)`

Creates middleware for route protection with options:

- `publicRoutes` - Array of public route patterns
- `verifyAtEdge` - Verify sessions at edge (default: false)
- `afterAuth` - Custom logic after auth check

### Server Helpers

- `getSession(config)` - Get current session and user
- `getUser(config)` - Get current user (null if not authenticated)
- `guard(config)` - Throws if not authenticated, returns user

## App Router vs Pages Router

Both routing systems are fully supported with the same API:

**App Router** uses the `[[...keyloom]]` catch-all route pattern
**Pages Router** uses the `[...keyloom]` catch-all route pattern

The middleware and server helpers work identically in both systems.

## Security Features

- **CSRF Protection** - All POST requests require CSRF tokens
- **Secure Cookies** - HttpOnly, Secure, SameSite cookies
- **Session Validation** - Database-backed session verification
- **Edge Runtime** - Fast middleware execution at the edge

## RBAC & Organizations

Keyloom supports organization-based RBAC out of the box. Enable/disable RBAC via `rbac.enabled` in your Keyloom config; when disabled, org/role checks are skipped by middleware/guards.

### Organization Switching UI

```ts
// app/(auth)/orgs/page.tsx (Server Component)
import { getUser } from '@keyloom/nextjs'
import keyloomConfig from '../../keyloom.config'
import { cookies } from 'next/headers'
import { setActiveOrgCookie } from '@keyloom/nextjs/rbac'

export default async function OrgsPage() {
  const user = await getUser(keyloomConfig)
  if (!user) return null
  const orgs = await keyloomConfig.adapter.getOrganizationsByUser!(user.id)

  async function switchOrg(orgId: string) {
    'use server'
    cookies().set(setActiveOrgCookie(orgId))
  }

  return (
    <form action={switchOrg}>
      <select name="orgId">
        {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button type="submit">Use organization</button>
    </form>
  )
}
```

### Middleware route protection with org required

```ts
// middleware.ts
import { createAuthMiddleware } from '@keyloom/nextjs/middleware'
import cfg from './keyloom.middleware'

export default createAuthMiddleware(cfg, {
  publicRoutes: ['/', '/sign-in', '/sign-up'],
  verifyAtEdge: false,
  // Example: require org for app routes
  afterAuth: ({ request, next, getCookie, config }) => {
    const pathname = new URL(request.url).pathname
    if (pathname.startsWith('/app') && config?.rbac?.enabled !== false) {
      const hasOrg = Boolean(getCookie('__keyloom_org'))
      if (!hasOrg) return Response.redirect(new URL('/orgs', request.url))
    }
    return next()
  }
})

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'] }
```

### Server guard with roles/permissions

```ts
// app/app/admin/page.tsx
import { withRole, getActiveOrgId } from '@keyloom/nextjs/rbac'
import { guard } from '@keyloom/nextjs'
import keyloomConfig from '../../../keyloom.config'

export default async function AdminPage() {
  const user = await guard(keyloomConfig)
  const orgId = getActiveOrgId()
  const res = await withRole(async () => {
    return { ok: true } as any
  }, {
    requiredRoles: ['owner', 'admin'],
    getUser: async () => user,
    adapter: keyloomConfig.adapter,
    orgId,
    rbacEnabled: keyloomConfig.rbac?.enabled !== false,
    onDenied: () => new Response('forbidden', { status: 403 }),
  })
  if ((res as any).ok) {
    return <div>Admin area</div>
  }
  return res as unknown as JSX.Element
}
```

### Typical workflow

1) User logs in via Keyloom routes
2) If no org cookie, redirect to `/orgs` to choose an organization
3) On selection, set `__keyloom_org` using `setActiveOrgCookie()`
4) Protect admin/member routes with middleware and `withRole`

### Admin-only and org-member routes

```ts
// Example server action wrapper
import { withRole } from '@keyloom/nextjs/rbac'

export async function actionForMembers(fn: () => Promise<Response>) {
  return withRole(fn, {
    requiredRoles: ['owner','admin','member'],
    getUser: async () => /* fetch user */ null,
    adapter: /* your adapter */ null as any,
    rbacEnabled: true,
  })
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  NextKeyloomConfig,
  SessionData,
  AuthMiddlewareOptions 
} from '@keyloom/nextjs'
```

## License

MIT
