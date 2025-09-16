import { describe, it, expect } from 'vitest'
import { selectActiveOrg } from '../src/rbac/context'

describe('rbac/context.selectActiveOrg', () => {
  const allowed = ['o1', 'o2', 'o3']
  it('prefers query > header > cookie when allowed', () => {
    const id = selectActiveOrg({ fromQuery: 'o2', fromHeader: 'o3', fromCookie: 'o1', allowedOrgIds: allowed, strategy: 'lastUsed' })
    expect(id).toBe('o2')
  })
  it('falls back to first when strategy=first', () => {
    const id = selectActiveOrg({ fromQuery: null, fromHeader: null, fromCookie: null, allowedOrgIds: allowed, strategy: 'first' })
    expect(id).toBe('o1')
  })
  it('returns null when none allowed and strategy lastUsed', () => {
    const id = selectActiveOrg({ fromQuery: 'x', fromHeader: 'y', fromCookie: 'z', allowedOrgIds: allowed, strategy: 'lastUsed' })
    expect(id).toBeNull()
  })
})

