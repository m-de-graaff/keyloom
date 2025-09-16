import { describe, expect, it } from 'vitest'
import { can, hasAnyRole, hasRole, type PermissionMap } from '../src/rbac/policy'

describe('rbac/policy', () => {
  const map: PermissionMap = {
    'org:manage': ['owner', 'admin'],
    'project:write': ['owner', 'admin', 'member'],
  }
  it('hasRole', () => {
    expect(hasRole('owner', 'owner')).toBe(true)
    expect(hasRole('admin', 'owner')).toBe(false)
  })
  it('hasAnyRole', () => {
    expect(hasAnyRole('admin', ['owner', 'admin'])).toBe(true)
    expect(hasAnyRole('viewer', ['owner', 'admin'])).toBe(false)
  })
  it('can', () => {
    expect(can('admin', 'org:manage', map)).toBe(true)
    expect(can('member', 'org:manage', map)).toBe(false)
    expect(can('member', 'project:write', map)).toBe(true)
  })
})
