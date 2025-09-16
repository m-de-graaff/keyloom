// Temporary local defineKeyloom to avoid cross-package resolution during Phase-0
const defineKeyloom = <T>(config: T) => config

import { memoryAdapter } from '@keyloom/core'
import { github } from '@keyloom/providers/github'
import devProvider from './dev-provider'

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173',
  session: { strategy: 'database', ttlMinutes: 60, rolling: true },
  adapter: memoryAdapter(),
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID ?? 'dev',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? 'dev',
    }),
    devProvider({
      clientId: 'fake',
      clientSecret: 'fake',
      authorizationUrl: 'http://localhost:5173/api/fake-oauth/authorize',
      tokenUrl: 'http://localhost:5173/api/fake-oauth/token',
      userinfoUrl: 'http://localhost:5173/api/fake-oauth/userinfo',
    }),
  ],
  rbac: { enabled: false },
  cookie: { sameSite: 'lax' },
  secrets: { authSecret: process.env.AUTH_SECRET ?? 'dev-secret-change' },
})
