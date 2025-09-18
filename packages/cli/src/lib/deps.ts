export const ADAPTER_DEPS: Record<string, string[]> = {
  prisma: ['@prisma/client', 'prisma'],
  drizzle: ['drizzle-orm', 'drizzle-kit'],
  pg: ['pg'],
  mysql2: ['mysql2'],
  mongo: ['mongoose'],
}

export const PROVIDER_DEPS: Record<string, string[]> = {
  github: ['@keyloom/providers/github'],
  google: ['@keyloom/providers/google'],
  discord: ['@keyloom/providers/discord'],
}

export async function ensureDeps(opts: {
  adapter?: keyof typeof ADAPTER_DEPS
  providers: (keyof typeof PROVIDER_DEPS)[]
  sessionStrategy?: 'database' | 'jwt'
  packageManager: 'pnpm' | 'npm' | 'yarn'
}) {
  const wanted = new Set<string>()
  if (opts.adapter) ADAPTER_DEPS[opts.adapter]?.forEach((d) => wanted.add(d))
  for (const p of opts.providers) PROVIDER_DEPS[p]?.forEach((d) => wanted.add(d))
  // JWT strategy might add jose later
  return Array.from(wanted)
}
