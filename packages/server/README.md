# @keyloom/server

Utilities and ready-made routes for running Keyloom in a Fastify server.

## Features
- Auth routes with CSRF, rate limiting, and secure cookies
- JWT and database session strategies
- JWKS keystore management and verification helpers
- Extensible adapters (use the same @keyloom/adapters as the rest of Keyloom)

## Installation
```bash
pnpm add @keyloom/server @keyloom/core @keyloom/adapters fastify
```

## Quick start
```ts
import Fastify from 'fastify'
import buildAuthRoutes from '@keyloom/server/src/routes/auth'
import { PrismaAdapter } from '@keyloom/adapters'
import { PrismaClient } from '@prisma/client'

const app = Fastify()
const prisma = new PrismaClient()

const adapter = PrismaAdapter(prisma)
const env = {
  AUTH_SECRET: process.env.AUTH_SECRET!,
  SESSION_STRATEGY: process.env.SESSION_STRATEGY ?? 'database',
  COOKIE_SAMESITE: 'lax' as const,
}

app.register(buildAuthRoutes({ adapter, env }))

app.listen({ port: 3001 })
```

## Routes
- `GET /v1/auth/csrf` 32 issues a CSRF token (double submit cookie)
- `POST /v1/auth/register`  registers a user (rate limited)
- `POST /v1/auth/login`  logs in (rate limited)
- `POST /v1/auth/logout`  clears session cookies
- `GET /v1/auth/session`  returns current session and user (rate limited)
- `GET /v1/auth/jwks.json`  JWKS for JWT verification (when JWT strategy)

## Rate limiting
Examples in the default routes use a simple token bucket utility from `@keyloom/core/guard/rate-limit`:
```ts
import * as rateLimit from '@keyloom/core/guard/rate-limit'

const ip = req.ip
const key = `login:${ip}`
if (!rateLimit.rateLimit(key, { capacity: 10, refillPerSec: 1 }))
  return reply.code(429).send({ error: 'rate_limited' })
```
Swap this for your production limiter (e.g., Redis-backed) as needed.

## Environment
Recommended environment variables:
- `AUTH_SECRET` (required in production)
- `SESSION_STRATEGY` = `database` | `jwt`
- `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` (when JWT)
- `COOKIE_SAMESITE` (e.g., `lax`), `COOKIE_DOMAIN`

## Testing locally
Use curl to smoke-test routes:
```bash
curl -i http://localhost:3001/v1/auth/csrf
```

## License
MIT

