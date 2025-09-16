import type { ID } from '../types'
import type { Entitlements } from './types'

export type ActiveOrgContext = {
  orgId: ID | null
  role?: string | null
  entitlements?: Entitlements | null
}

export function selectActiveOrg(opts: {
  fromCookie?: string | null
  fromHeader?: string | null
  fromQuery?: string | null
  allowedOrgIds: ID[]
  strategy?: 'lastUsed' | 'first' | 'prompt'
}): ID | null {
  const tryIds = [opts.fromQuery, opts.fromHeader, opts.fromCookie].filter(Boolean) as ID[]
  for (const id of tryIds) if (opts.allowedOrgIds.includes(id)) return id

  if (opts.strategy === 'first') return opts.allowedOrgIds[0] ?? null
  return null
}
