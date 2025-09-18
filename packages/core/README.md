# @keyloom/core

The core authentication library for Keyloom - a modern, type-safe authentication solution for JavaScript applications.

## Features

- 🔐 **Secure Session Management** - Database-backed sessions with rolling expiration
- 🛡️ **CSRF Protection** - Double-submit cookie pattern for enhanced security
- 🔑 **Password Hashing** - Argon2id for secure password storage
- 🎯 **TypeScript First** - Full type safety and excellent developer experience
- 🔌 **Adapter Pattern** - Support for multiple databases (Prisma, Memory, etc.)
- 🚀 **Framework Agnostic** - Works with any JavaScript framework

## Installation

```bash
npm install @keyloom/core
# or
pnpm add @keyloom/core
# or
yarn add @keyloom/core
```

## Quick Start

```typescript
import { createKeyloom, memoryAdapter } from "@keyloom/core";

const keyloom = createKeyloom({
  adapter: memoryAdapter(),
  session: {
    strategy: "database",
    ttlMinutes: 60,
    rolling: true,
  },
  secrets: {
    authSecret: process.env.AUTH_SECRET,
  },
});

// Register a user
const user = await keyloom.register({
  email: "user@example.com",
  password: "secure-password",
});

// Login
const session = await keyloom.login({
  email: "user@example.com",
  password: "secure-password",
});
```

## Core Concepts

### Adapters

Adapters provide database abstraction for storing users and sessions:

```typescript
import { PrismaAdapter } from "@keyloom/adapters/prisma";
import { memoryAdapter } from "@keyloom/core";

// Production: Use Prisma adapter
const adapter = PrismaAdapter(prisma);

// Development: Use memory adapter
const adapter = memoryAdapter();
```

### Session Management

Sessions are stored in the database with configurable TTL and rolling expiration:

```typescript
const config = {
  session: {
    strategy: "database" as const,
    ttlMinutes: 60, // Session expires after 60 minutes
    rolling: true, // Extend session on activity
  },
};
```

### CSRF Protection

Built-in CSRF protection using double-submit cookie pattern:

```typescript
import { issueCsrfToken, validateDoubleSubmit } from "@keyloom/core/guard/csrf";

// Issue CSRF token
const token = issueCsrfToken();

// Validate CSRF token
const isValid = validateDoubleSubmit(token, cookieValue);
```

## API Reference

### Core Functions

- `createKeyloom(config)` - Create a Keyloom instance
- `register(credentials)` - Register a new user
- `login(credentials)` - Authenticate a user
- `logout(sessionId)` - End a user session
- `getCurrentSession(sessionId)` - Get current session data

### Utilities

- `argon2idHasher` - Password hashing utilities
- `memoryAdapter()` - In-memory adapter for development
- `newId()` - Generate unique identifiers

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  KeyloomConfig,
  SessionData,
  UserData,
  Adapter,
} from "@keyloom/core";
```

## Password hashing selection

Keyloom provides multiple password hashers and a smart selector that picks the strongest available at runtime.

- Preferred order by default: `argon2id` → `bcrypt` → `noop` (dev only)
- Dynamic imports keep non‑used implementations out of Edge bundles

Use the default selector:

```ts
import { getDefaultPasswordHasher } from "@keyloom/core"

const hasher = await getDefaultPasswordHasher()
const hash = await hasher.hash("password")
const ok = await hasher.verify(hash, "password")
```

Customize preference ordering (e.g., prefer bcrypt):

```ts
import { getDefaultPasswordHasher } from "@keyloom/core"

const hasher = await getDefaultPasswordHasher(["bcrypt", "argon2id", "noop"])
```

Environment override with `KEYLOOM_HASHER`:

```bash
# choose one of: argon2id | bcrypt | noop
export KEYLOOM_HASHER=argon2id
```

```ts
import { getDefaultPasswordHasherFromEnv } from "@keyloom/core"

// If KEYLOOM_HASHER is set, it is preferred first; otherwise defaults are used.
const hasher = await getDefaultPasswordHasherFromEnv()
```

If the selected hasher isn’t available at runtime (e.g., missing native module), the selector gracefully falls back to the next option, preserving backward compatibility.

## Verification tokens (memory adapter) and token secrets

Verification tokens are single‑use and hashed at rest in the in‑memory adapter using HMAC‑SHA‑256.

By default, the adapter uses `process.env.AUTH_SECRET` (and falls back to a development default if not set). For explicit control, provide a `tokenSecret`:

```ts
import { memoryAdapter } from "@keyloom/core"

// Explicit token secret for hashing verification tokens at rest
const adapter = memoryAdapter({ tokenSecret: "test-secret-please-change" })

// Default behavior (uses AUTH_SECRET or a dev default):
const adapterDefault = memoryAdapter()
```

This keeps plaintext tokens out of storage while returning the plaintext to callers for delivery (e.g., email links). The adapter validates by hashing incoming tokens and comparing against stored hashes.

## Production hardening

Recommended environment variables and settings for secure deployments:

- AUTH_SECRET (required in production)
  - Used to sign/validate tokens (e.g., verification tokens) and for JWT flows.
  - Never commit this; rotate regularly.
- KEYLOOM_HASHER (optional)
  - One of: argon2id | bcrypt | noop. Defaults to preferring argon2id, then bcrypt.
  - If the module is unavailable at runtime, the selector falls back automatically.
- SESSION_STRATEGY (optional)
  - database (default) or jwt
  - For jwt: set JWT_ISSUER (and optionally JWT_AUDIENCE, JWT_ACCESS_TTL, JWT_REFRESH_TTL, JWT_ALGORITHM).
- COOKIE_SAMESITE and COOKIE_DOMAIN (optional)
  - SameSite recommended: "lax" for typical apps; use "none" only for cross-site and ensure Secure is enabled.
  - Set a cookie domain if serving across subdomains.

Cookie security best practices:
- HttpOnly: true (prevents JS access)
- Secure: true (required when SameSite=None; always in production)
- SameSite: lax (or none for cross-site flows)

Wiring the default hasher in your auth flows:

```ts
import { getDefaultHasherSingleton } from "@keyloom/core"
import { register, login } from "@keyloom/core"
import { memoryAdapter } from "@keyloom/core"

const adapter = memoryAdapter({ tokenSecret: process.env.AUTH_SECRET })
const hasher = await getDefaultHasherSingleton() // cached after first call

// Register
await register({ email: "user@example.com", password: "pw" }, { adapter, hasher })

// Login
await login({ email: "user@example.com", password: "pw" }, { adapter, hasher })
```

## License

MIT
