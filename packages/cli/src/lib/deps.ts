export const ADAPTER_DEPS: Record<string, string[]> = {
  prisma: ['@prisma/client', 'prisma', '@keyloom/adapters'],
  'drizzle-pg': ['drizzle-orm', 'drizzle-kit', 'pg', '@keyloom/adapters'],
  'drizzle-mysql': ['drizzle-orm', 'drizzle-kit', 'mysql2', '@keyloom/adapters'],
  postgres: ['pg', '@keyloom/adapters'],
  mysql2: ['mysql2', '@keyloom/adapters'],
  mongo: ['mongoose', '@keyloom/adapters'],
}

export const PROVIDER_DEPS: Record<string, string[]> = {
  github: ['@keyloom/providers/github'],
  google: ['@keyloom/providers/google'],
  discord: ['@keyloom/providers/discord'],
}

export type AdapterChoice = keyof typeof ADAPTER_DEPS
export type ProviderChoice = keyof typeof PROVIDER_DEPS

export function resolveInitDeps(opts: {
  adapter?: AdapterChoice
  providers: ProviderChoice[]
  includeNextjs: boolean
}): string[] {
  const wanted = new Set<string>(['@keyloom/core'])
  if (opts.includeNextjs) wanted.add('@keyloom/nextjs')
  if (opts.adapter) ADAPTER_DEPS[opts.adapter]?.forEach((d) => wanted.add(d))
  for (const p of opts.providers) PROVIDER_DEPS[p]?.forEach((d) => wanted.add(d))
  return Array.from(wanted)
}
