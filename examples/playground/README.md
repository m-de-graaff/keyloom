# Playground OAuth setup

## Environment variables (.env.local or .env.example)

```
# App
NEXT_PUBLIC_APP_URL=http://localhost:5173
AUTH_SECRET=changeme-super-secret

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

## Redirect URIs

- GitHub: https://YOUR_APP/api/auth/oauth/github/callback
- Google: https://YOUR_APP/api/auth/oauth/google/callback
- Discord: https://YOUR_APP/api/auth/oauth/discord/callback

## Default scopes

- GitHub: read:user user:email
- Google: openid email profile
- Discord: identify email

## Minimal DX snippet

```ts
// keyloom.config.ts
import { defineKeyloom } from '@keyloom/core'
import prismaAdapter from '@keyloom/adapters/prisma'
import github from '@keyloom/providers/github'

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
  session: { strategy: 'database' },
  adapter: prismaAdapter(),
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  secrets: { authSecret: process.env.AUTH_SECRET! },
})
```

Client button:

```tsx
<a href="/api/auth/oauth/github/start?callbackUrl=/dashboard">Continue with GitHub</a>
```

## Security defaults (OAuth)

- PKCE (S256) + state on all requests
- State cookie: HttpOnly; Secure; SameSite=Lax; Max-Age=600
- Callback clears the state cookie
- Account linking: if an active session exists, link provider to that user
- Email handling: if provider returns verified email, set emailVerified; if missing, user may be created without email

