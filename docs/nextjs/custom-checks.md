# Custom Validation & Checks (Next.js)

Keyloom supports pluggable validation in both Edge middleware and Node handlers.

## Edge: Middleware Checks (limited runtime)

Use `createAuthMiddleware(config, { customValidate })` to insert lightweight, latency-sensitive checks. At the edge you should avoid DB drivers; instead use:
- Cookie presence checks
- URL pattern rules
- Fetch to your own API for validation (best-effort)

```ts
import { createAuthMiddleware } from '@keyloom/nextjs/middleware'

export default createAuthMiddleware(keyloomConfig, {
  routes: /* routes manifest */ undefined,
  customValidate: async ({ req, url, authed }) => {
    // Example: block access to /exam routes outside exam window
    if (url.pathname.startsWith('/exam')) {
      const now = Date.now()
      const inWindow = now >= EXAM_START && now <= EXAM_END
      if (!inWindow) return Response.redirect(new URL('/exam-closed', url))
    }
    // Example: require cookie flag gate
    if (url.pathname.startsWith('/beta') && !req.cookies.get('beta')) {
      return new Response(JSON.stringify({ error: 'beta_required' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    }
    // continue
    return undefined
  },
})
```

Notes:
- Fail-open strategy: if your check throws, middleware proceeds to avoid lockouts.
- For RBAC and org checks, Keyloom already injects best-effort validations.

## Node: API Handler Hooks (full runtime)

Node handlers support an `onRequest` hook for all Keyloom API routes.

```ts
import { createNextHandler } from '@keyloom/nextjs'

export const { GET, POST } = createNextHandler({
  ...keyloomConfig,
  hooks: {
    onRequest: async ({ kind, req }) => {
      // kind: 'session' | 'csrf' | 'oauth_start' | 'oauth_callback' | 'register' | 'login' | 'logout'
      if (kind === 'login') {
        // Rate-limit by IP
        const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
        const allowed = await myRateLimiter.allow(ip)
        if (!allowed) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
      }
      // Continue normally
      return undefined
    },
  },
})
```

### Hybrid Approach
- Perform inexpensive cookie/pattern checks in Edge middleware
- Perform authoritative DB checks in Node handler via `onRequest`

This split honors Next.js runtime constraints and minimizes latency.

