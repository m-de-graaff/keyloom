# Build a Custom OAuth Provider

This guide shows how to implement a custom OAuth provider for Keyloom with minimal boilerplate, including patterns for non‑standard IdPs.

## TL;DR (Factory)

Use the factory to reduce boilerplate and get strong typing:

```ts
import { createOAuthProvider } from '@keyloom/providers/factory'

export const myProvider = ({ clientId, clientSecret }: { clientId: string; clientSecret: string }) =>
  createOAuthProvider({
    id: 'my-idp',
    authorizationUrl: 'https://idp.example.com/oauth/authorize',
    tokenUrl: 'https://idp.example.com/oauth/token',
    userinfoUrl: 'https://idp.example.com/userinfo',
    scopes: ['openid', 'email', 'profile'],
    tokenStyle: 'json', // or 'form' for x-www-form-urlencoded
  })({ clientId, clientSecret })
```

## Full Example with Mapping and Token Body Customization

```ts
import type { OAuthProvider } from '@keyloom/core'
import { createOAuthProvider } from '@keyloom/providers/factory'

export function exampleIdp(opts: { clientId: string; clientSecret: string }): OAuthProvider & typeof opts {
  const build = createOAuthProvider({
    id: 'example-idp',
    authorizationUrl: 'https://example.com/oauth/authorize',
    tokenUrl: 'https://example.com/oauth/token',
    userinfoUrl: 'https://example.com/api/me',
    scopes: ['profile', 'email'],
    tokenStyle: 'form',
    tokenHeaders: { Accept: 'application/json' },
    customizeTokenBody: (body) => {
      // Add any custom parameters here
      if (body instanceof URLSearchParams) body.set('audience', 'example-api');
      return body;
    },
    mapProfile: (raw) => ({
      id: String(raw.id),
      email: raw.email ?? null,
      name: raw.name ?? null,
      image: raw.avatar_url ?? null,
    }),
  })
  return build(opts)
}
```

## Handling Non‑Standard IdPs

- Token exchange as form: set `tokenStyle: 'form'` and optional `tokenHeaders: { Accept: 'application/json' }`
- Odd `userinfo` fields: provide `mapProfile(raw, tokens)` and normalize into `{ id, email?, name?, image? }`
- No userinfo endpoint: provide `profileFromIdToken(claims)` instead
- Extra token params: implement `customizeTokenBody(body)` to add or transform params

## DX Utilities

- `@keyloom/providers/testing/contract` exposes:
  - `runProviderContract(provider)`: shape lint (id, authorization.url, token.url, userinfo or id_token mapping)
  - `mapOidcProfile(raw, tokens)`: quick OIDC‑ish mapper
  - `startMockOAuthServer(port)`: basic local endpoints for authorize/token/userinfo during testing

## Usage in Next.js

Register your provider in `createNextHandler` config:

```ts
import { createNextHandler } from '@keyloom/nextjs'
import { exampleIdp } from './providers/example-idp'

export const { GET, POST } = createNextHandler({
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
  secrets: { authSecret: process.env.AUTH_SECRET! },
  adapter: /* your adapter */ null as any,
  providers: [
    exampleIdp({ clientId: process.env.MY_IDP_CLIENT_ID!, clientSecret: process.env.MY_IDP_CLIENT_SECRET! }),
  ],
})
```

