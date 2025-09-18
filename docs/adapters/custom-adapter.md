# Build a Custom Adapter

Keyloom adapters implement a unified interface for users, sessions, verification tokens, refresh tokens, and RBAC. This guide shows the required shape and how to validate your adapter.

## Interface Overview

At minimum, your adapter should implement methods such as:
- `createUser(input)`
- `getUserByEmail(email)`
- `createSession(input)`
- `getSession(id)`
- `deleteSession(id)`
- `createVerificationToken(input)`
- `useVerificationToken(identifier, token)`

Plus capability flags under `capabilities` (transactions, json, ttlIndex, etc.). See `@keyloom/core/adapter-types` for full details.

## Quick Contract Check (Shape)

```ts
import { testing as adapterTesting } from '@keyloom/adapters'

const { ok, errors } = adapterTesting.runAdapterContract(myAdapter)
if (!ok) throw new Error(errors.join('\n'))
```

## Fixtures

```ts
import { testing as adapterTesting } from '@keyloom/adapters'
const user = adapterTesting.fixtures.user('user@example.com')
```

## Tips
- Normalize emails consistently (`normalizeEmail`) according to your DB capability.
- Prefer database-provided case-insensitivity when available (`citext`/collation), otherwise lower-case in app.
- Provide `cleanup()` for expired sessions/tokens if your DB supports it.
- Implement `healthCheck()` if your runtime needs active readiness checks.

