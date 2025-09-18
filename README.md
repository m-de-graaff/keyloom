<div align="center">
  <img src="keyloom_banner.png" alt="Keyloom" width="850" height="250" />
  <h3>Authentication for Next.js</h3>
  <p><strong>Open Source. Full Stack. Own Your Data.</strong></p>
  
  <p>
    <a href="https://www.npmjs.com/package/@keyloom/core">
      <img alt="npm (core)" src="https://img.shields.io/npm/v/%40keyloom%2Fcore?label=%40keyloom%2Fcore" />
    </a>
    <a href="https://bundlephobia.com/package/@keyloom/core">
      <img alt="bundle size" src="https://img.shields.io/bundlephobia/minzip/%40keyloom%2Fcore" />
    </a>
    <a href="https://www.npmjs.com/package/@keyloom/core">
      <img alt="npm downloads" src="https://img.shields.io/npm/dm/%40keyloom%2Fcore" />
    </a>
    <a href="https://github.com/m-de-graaff/keyloom">
      <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/m-de-graaff/keyloom?style=social" />
    </a>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  </p>
</div>

---

## Overview

Keyloom is a modern, securityfirst authentication system for Next.js and Node.js. It provides a complete, productionready solution for:

- JWT or database sessions (your choice)
- OAuth 2.0/OIDC providers
- RoleBased Access Control (RBAC) with orgs/teams
- Secure cookies, CSRF protection, and rate limiting
- Firstclass DX with a typed API and a batteriesincluded CLI

Built for edge/runtime compatibility, strong crypto defaults, and minimal configuration.


## Monorepo Structure

- @keyloom/core  Core auth logic, crypto, cookies, JWT/JWKS, RBAC, CSRF
- @keyloom/nextjs  Next.js App/Pages Router integration, middleware, server helpers
- @keyloom/adapters/*  Database adapters (Prisma, Drizzle, Postgres, MySQL2, Mongo)
- @keyloom/providers/*  OAuth providers (GitHub, Google, Apple, Auth0, GitLab, Microsoft, X)
- @keyloom/cli  CLI: init, migrate, doctor, routes
- @keyloom/server  Server utilities (Fastify, keystore, JWT helpers)


## Getting Started

1) Install packages

```bash
# Core + Next.js integration
pnpm add @keyloom/core @keyloom/nextjs

# Add one or more providers and an adapter, e.g. Prisma + GitHub
pnpm add @keyloom/adapters @keyloom/providers
```

2) Create a strong AUTH_SECRET (base64url, 32 bytes)

```bash
# Example (Node.js):
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

3) Configure Keyloom (keyloom.config.ts)

```ts
import { memoryAdapter } from "@keyloom/core";
import github from "@keyloom/providers/github";

export default {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  session: {
    strategy: "jwt",              // "jwt" or "database"
    accessTokenTtl: 600,           // seconds (e.g. 10 minutes)
    refreshTokenTtl: 60 * 60 * 24, // seconds (e.g. 1 day)
  },
  adapter: memoryAdapter(),
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  rbac: { enabled: false },
  cookie: { sameSite: "lax" },
  secrets: { authSecret: process.env.AUTH_SECRET! },
};
```

4) Next.js route

```ts
// app/api/auth/[[...keyloom]]/route.ts
import { createNextHandler } from "@keyloom/nextjs";
import config from "../../../../keyloom.config";

export const { GET, POST } = createNextHandler(config);
```


## Key Features

- Sessions: JWT or database with rolling sessions, rotation, and JWKS support
- OAuth: GitHub, Google, Apple, Auth0, GitLab, Microsoft, X (more pluggable)
- RBAC: Multiorg memberships, roles, policies, lastowner protection
- Security: CSRF doublesubmit, secure cookies, PKCE S256, sealed OAuth state
- Crypto: Argon2id (strong defaults) with bcrypt fallback; HMAC hashing for tokens at rest
- Next.js: App/Pages Router, middleware guards, Edgecompatible code paths
- Adapters: Prisma, Drizzle, Postgres, MySQL2, Mongo  contracttested
- CLI: init, migrate, doctor, routes  adapteraware and productionfocused


## Security

Securityfirst design and defaults:

- Secrets: AUTH_SECRET must be base64url and decode to 32 bytes (validated by CLI doctor)
- Cookies: HttpOnly + Secure by default; SameSite=Lax default; SameSite=None requires HTTPS
- CSRF: Doublesubmit tokens and dedicated csrf endpoint
- OAuth: PKCE S256, sealed state cookies (AESGCM) with 10minute TTL, cleared on callback
- JWT: EdDSA/ES256, JWKS keystore with rotation and overlap, clock skew tolerance
- Tokens: Singleuse verification tokens hashed at rest
- Rate limiting: Utilities provided; Redisbacked limiter available

See SECURITY.md for disclosure process.


## TypeScript

All packages ship with firstclass TypeScript types. Strict typing across core and integrations.


## Code Examples

1) Basic Next.js API Route

```ts
// app/api/auth/[[...keyloom]]/route.ts
import { createNextHandler } from "@keyloom/nextjs";
import config from "../../../../keyloom.config";
export const { GET, POST } = createNextHandler(config);
```

2) Client  Minimal Session Hook

```tsx
import { useEffect, useState } from "react";

type Session = { user?: { id: string; email?: string | null } } | null;

export function useSession() {
  const [session, setSession] = useState<Session>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session").then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (alive) setSession(data?.session ?? null);
    });
    return () => { alive = false };
  }, []);
  return session;
}
```

3) Switching Session Strategy

```ts
// Database sessions
export default {
  session: { strategy: "database", ttlMinutes: 60, rolling: true },
  // ...
}

// JWT sessions
export default {
  session: {
    strategy: "jwt",
    accessTokenTtl: 600,
    refreshTokenTtl: 60 * 60 * 24,
  },
  // ...
}
```


## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) and follow the code of conduct. Run tests locally with `pnpm test -w`.


## License

MIT 9 Keyloom contributors. See [LICENSE](LICENSE).

