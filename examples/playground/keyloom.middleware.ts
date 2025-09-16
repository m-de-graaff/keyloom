// Middleware-safe config (no Node.js imports)
const defineKeyloom = <T>(config: T) => config

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  session: { strategy: 'database', ttlMinutes: 60, rolling: true },
  // No adapter needed for middleware - it only checks cookies
  providers: [
    {
      id: 'github',
      name: 'GitHub',
      type: 'oauth',
    },
  ],
  rbac: { enabled: false },
  cookie: { sameSite: 'lax' },
  secrets: { authSecret: process.env.AUTH_SECRET ?? 'dev-secret-change' },
})
