# @keyloom/nextjs

Next.js integration for Keyloom authentication.

## Installation

```bash
npm install @keyloom/nextjs @keyloom/core
# or
pnpm add @keyloom/nextjs @keyloom/core
```

## Quick Start

### 1. Configuration

Create `keyloom.config.ts`:

```typescript
import { defineKeyloom } from '@keyloom/core';
import prismaAdapter from '@keyloom/adapters/prisma';

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
  session: { strategy: 'database', ttlMinutes: 60, rolling: true },
  adapter: prismaAdapter(),
  rbac: { enabled: false },
  cookie: { sameSite: 'lax' },
  secrets: { authSecret: process.env.AUTH_SECRET! }
});
```

### 2. API Routes (App Router)

Create `app/api/auth/[...keyloom]/route.ts`:

```typescript
import { createNextHandler } from '@keyloom/nextjs';
import config from '@/keyloom.config';

export const { GET, POST } = createNextHandler(config);
```

### 3. Middleware (Optional)

Create `middleware.ts`:

```typescript
import { createAuthMiddleware } from '@keyloom/nextjs/middleware';
import config from '@/keyloom.config';

export default createAuthMiddleware(config, {
  publicRoutes: ['/', '/sign-in', '/api/auth']
});

export const config = { 
  matcher: ['/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)'] 
};
```

### 4. Server Components

```typescript
import { getSession } from '@keyloom/nextjs';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const { session, user } = await getSession();
  if (!session) redirect('/sign-in');
  
  return <div>Hello {user?.email}</div>;
}
```

## API Reference

### `createNextHandler(config)`

Creates GET and POST handlers for authentication routes:

- `GET /api/auth/session` - Get current session
- `GET /api/auth/csrf` - Get CSRF token
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### `createAuthMiddleware(config, options)`

Creates middleware for route protection.

**Options:**
- `publicRoutes?: (string | RegExp)[]` - Routes that don't require authentication
- `verifyAtEdge?: boolean` - Verify session at edge (slower but more secure)
- `afterAuth?: (ctx) => NextResponse` - Custom auth logic

### Server Helpers

- `getSession(config?)` - Get current session and user
- `getUser(config?)` - Get current user only
- `guard(options?, config?)` - Throw if not authenticated

### Edge Utilities

```typescript
import { hasSessionCookie } from '@keyloom/nextjs/edge';

// Check if session cookie exists (edge-safe)
const authed = hasSessionCookie(request.headers.get('cookie'));
```

## App Router vs Pages Router

This package is designed for **App Router** (Next.js 13+). For Pages Router compatibility, use `createPagesApiHandler`:

```typescript
// pages/api/auth/[...keyloom].ts
import { createPagesApiHandler } from '@keyloom/nextjs';
import config from '@/keyloom.config';

export default createPagesApiHandler(config);
```

## Edge Runtime

The middleware runs on the edge runtime by default. For better performance, keep `verifyAtEdge: false` (default) which only checks for cookie presence. Set `verifyAtEdge: true` for stronger verification at the cost of performance.

## Examples

See the [examples](../../examples) directory for complete implementations:

- `examples/playground` - Development playground
- `examples/next-app-router` - Production-ready example
