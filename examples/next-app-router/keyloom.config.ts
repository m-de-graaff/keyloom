// Temporary local defineKeyloom to avoid cross-package resolution during Phase-0
const defineKeyloom = <T>(config: T) => config

import prismaAdapter from '@keyloom/adapters/prisma'
import github from '@keyloom/providers/github'

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
  session: { strategy: 'database', ttlMinutes: 60, rolling: true },
  adapter: prismaAdapter({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID ?? 'dev',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? 'dev',
    }),
  ],
  rbac: { enabled: false },
  cookie: { sameSite: 'lax' },
  secrets: { authSecret: process.env.AUTH_SECRET ?? 'dev-secret-change' },
})
