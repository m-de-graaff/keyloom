## Build a GitHub OAuth app with Keyloom (Next.js App Router)

This step‑by‑step tutorial takes you from zero to a working GitHub OAuth authentication app in under 30 minutes using the Keyloom CLI and Next.js App Router.

---

### Prerequisites
- Node.js 18+ (recommended: 20+)
- A package manager: pnpm, npm, or yarn (examples use pnpm)
- A GitHub account
- Next.js 13+ (App Router) or a fresh app created with `create-next-app`

Useful links:
- GitHub Developer settings: https://github.com/settings/developers
- GitHub OAuth Apps docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
- Next.js App Router docs: https://nextjs.org/docs/app

---

### 1) Create a GitHub OAuth App

1. Open GitHub Developer Settings > OAuth Apps: https://github.com/settings/developers
2. Click “New OAuth App”.
3. Fill in the form:
   - Application name: Your app name
   - Homepage URL: http://localhost:3000
   - Authorization callback URL:
     - Use this exact value for Keyloom Next.js integration:
       - http://localhost:3000/api/auth/oauth/github/callback
     - Note: Keyloom’s Next.js handler expects `/api/auth/oauth/:provider/callback`.
4. Click “Register application”.
5. On the app page, copy your “Client ID”. Click “Generate a new client secret” and copy the value.

References with screenshots:
- Registering an OAuth app: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- Client ID & secrets: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app#about-client-ids-and-client-secrets

---

### 2) Create your Next.js app (if you don’t have one yet)

Run the Next.js starter (or use your existing project):
<augment_code_snippet mode="EXCERPT">
````bash
pnpm dlx create-next-app@latest my-keyloom-app --ts --eslint
cd my-keyloom-app
````
</augment_code_snippet>

Start the dev server once to verify:
<augment_code_snippet mode="EXCERPT">
````bash
pnpm dev
# open http://localhost:3000
````
</augment_code_snippet>

Stop the server before continuing.

---

### 3) Initialize Keyloom in your project

Use the Keyloom CLI to scaffold config, API routes, middleware, and route manifest.

Run:
<augment_code_snippet mode="EXCERPT">
````bash
npx keyloom init
````
</augment_code_snippet>

Recommended prompt selections:
- Session strategy: database (or jwt if you prefer stateless)
- Database adapter: prisma (or your choice)
- OAuth providers: GitHub
- Enable RBAC: Yes (defaults are fine)

What the CLI generates:
- keyloom.config.ts: your Keyloom configuration (session strategy, providers, etc.)
- app/api/auth/[...keyloom]/route.ts: Next.js App Router handler using `createNextHandler`
- middleware.ts: `createAuthMiddleware` + route manifest consumption
- .keyloom/routes.generated.ts: Auth route manifest (generated)
- .env.example: env template with AUTH_SECRET, DATABASE_URL, and provider placeholders

Example of `middleware.ts` scaffold:
<augment_code_snippet mode="EXCERPT">
````ts
import { createAuthMiddleware } from '@keyloom/nextjs'
import routes from './.keyloom/routes.generated'
import config from './keyloom.config'
export default createAuthMiddleware(config, { routes })
````
</augment_code_snippet>

---

### 4) Configure environment variables

Create `.env` at your project root and add:
<augment_code_snippet mode="EXCERPT">
````env
# Required by Keyloom
AUTH_SECRET=replace-with-a-long-random-string

# Database (adjust as needed)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb?schema=public

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Optional for JWT strategy
# KEYLOOM_JWT_ISSUER=http://localhost:3000
````
</augment_code_snippet>

If you selected JWT session strategy, ensure `baseUrl`/issuer is set in `keyloom.config.ts` or via env.

---

### 5) Minimal UI: Login/Logout and Session display

Create a simple App Router page at `app/page.tsx` that:
- Starts GitHub OAuth with a link to `/api/auth/oauth/github/start`
- Logs out with a POST to `/api/auth/logout` (CSRF protected)
- Shows current session/user by calling `/api/auth/session`

<augment_code_snippet mode="EXCERPT">
````tsx
'use client'

import { useEffect, useState } from 'react'

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...init })
  return res.json()
}

async function getCsrfToken() {
  const data = await fetchJson('/api/auth/csrf')
  return data?.csrfToken as string | undefined
}

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchJson('/api/auth/session').then((d) => {
      setSession(d?.session || null)
      setUser(d?.user || null)
    })
  }, [])

  const onLogout = async () => {
    const token = await getCsrfToken()
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { 'x-keyloom-csrf': token } : {},
      credentials: 'include',
    })
    location.reload()
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Keyloom + GitHub OAuth</h1>

      {!user ? (
        <a href="/api/auth/oauth/github/start">
          <button>Sign in with GitHub</button>
        </a>
      ) : (
        <button onClick={onLogout}>Logout</button>
      )}

      <pre style={{ marginTop: 16 }}>
        {JSON.stringify({ session, user }, null, 2)}
      </pre>
    </main>
  )
}
````
</augment_code_snippet>

---

### 6) Protected route example

Create a protected page at `app/protected/page.tsx` that redirects unauthenticated users to `/`.

<augment_code_snippet mode="EXCERPT">
````tsx
// app/protected/page.tsx (server component)
import { redirect } from 'next/navigation'

async function getSession() {
  const res = await fetch('http://localhost:3000/api/auth/session', { cache: 'no-store' })
  return res.json()
}

export default async function ProtectedPage() {
  const { user } = await getSession()
  if (!user) redirect('/')
  return <main style={{ padding: 24 }}>Protected content for {user.email || user.id}</main>
}
````
</augment_code_snippet>

Tip: You can also enforce route protection globally using the generated `middleware.ts` and route manifest. Run `npx keyloom routes` whenever you add/update routes so the manifest stays in sync.

---

### 7) Run and verify the OAuth flow

1. Start your dev server:
   <augment_code_snippet mode="EXCERPT">
````bash
pnpm dev
````
</augment_code_snippet>
2. Open http://localhost:3000
3. Click “Sign in with GitHub”
4. Approve the app when GitHub prompts
5. You should be redirected back to your app and see populated `session` and `user` in the JSON output
6. Visit http://localhost:3000/protected — you should see the protected content when signed in

Expected console output while running `npx keyloom init` (abridged):
<augment_code_snippet mode="EXCERPT">
````text
✓ Dependencies installed
✓ Wrote keyloom.config.ts
✓ Wrote middleware.ts
✓ Wrote app/api/auth/[...keyloom]/route.ts
✓ Route manifest generated
````
</augment_code_snippet>

---

### Troubleshooting

- Redirect URI mismatch
  - Ensure GitHub OAuth App callback is exactly: `http://localhost:3000/api/auth/oauth/github/callback`
  - Update in GitHub settings if needed

- invalid_client or bad_verification_code
  - Re‑copy Client ID/Client Secret without extra spaces
  - Regenerate the Client Secret if you suspect it’s leaked or wrong

- 403 CSRF when logging out or registering
  - All non‑OAuth POSTs require CSRF double‑submit
  - Fetch `/api/auth/csrf` and include header `x-keyloom-csrf: <token>` when calling POST endpoints

- Session always null
  - Ensure cookies are not blocked in the browser
  - If using JWT strategy, verify `KEYLOOM_JWT_ISSUER` and JWKS URL are correct (or set `baseUrl` in keyloom.config)
  - For DB sessions, confirm your adapter/client is configured and the DB is reachable

- Callback loops or 404 on callback
  - Confirm the handler file exists at `app/api/auth/[...keyloom]/route.ts` and exports `{ GET, POST }`
  - Ensure the path structure includes `/oauth/github/start` and `/oauth/github/callback`

- Typescript errors about Keyloom declarations
  - As of v2.1.7, packages include `.d.ts`. If you’re on an older version, re‑run `npx keyloom init` or upgrade `@keyloom/core` and `@keyloom/nextjs`.

---

### Working example repository

We can add an examples folder to this repository (e.g., `examples/nextjs-github-oauth`) with the above completed setup. If you want, I can scaffold and commit it next so you have a ready‑to‑run repo to clone.

---

### What’s next
- Customize `keyloom.config.ts` (session TTL, cookie settings, baseUrl)
- Add additional providers (Google, Discord, etc.)
- Persist users with Prisma or your chosen adapter and build your app UI

If you get stuck anywhere, open an issue or ask me to auto‑generate the example app in this repo.

