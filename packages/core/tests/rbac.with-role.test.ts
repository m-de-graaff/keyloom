import { describe, expect, it, vi } from 'vitest'
import type { PermissionMap } from '../src/rbac/policy'
import { withRole } from '../src/rbac/with-role'

describe('withRole guard', () => {
  it('invokes handler when role matches requirements', async () => {
    const handler = vi.fn().mockResolvedValue('ok')
    const wrapped = withRole(handler, {
      requiredRoles: ['admin', 'editor'],
      getRole: async () => ({ role: 'admin' }),
      permMap: { write: ['admin'] } as PermissionMap,
      requiredPermission: 'write',
    })

    await expect(wrapped({ req: {} })).resolves.toBe('ok')
    expect(handler).toHaveBeenCalled()
  })

  it('uses onDenied when no role present', async () => {
    const onDenied = vi.fn().mockResolvedValue('denied')
    const wrapped = withRole(async () => 'never', {
      getRole: async () => ({ role: null }),
      onDenied,
    })

    await expect(wrapped({ req: {} })).resolves.toBe('denied')
    expect(onDenied).toHaveBeenCalled()
  })

  it('rejects when no onDenied and role missing', async () => {
    const wrapped = withRole(async () => 'never', {
      getRole: async () => ({ role: null }),
    })

    await expect(wrapped({ req: {} })).rejects.toThrow('unauthorized')
  })

  it('denies when role not in required list', async () => {
    const onDenied = vi.fn().mockResolvedValue('forbidden')
    const wrapped = withRole(async () => 'never', {
      requiredRoles: ['admin'],
      getRole: async () => ({ role: 'user' }),
      onDenied,
    })

    await expect(wrapped({ req: {} })).resolves.toBe('forbidden')
  })

  it('denies when permission check fails', async () => {
    const permMap: PermissionMap = { admin: ['read'] }
    const onDenied = vi.fn().mockResolvedValue('forbidden')
    const wrapped = withRole(async () => 'never', {
      requiredPermission: 'write',
      permMap,
      getRole: async () => ({ role: 'admin' }),
      onDenied,
    })

    await expect(wrapped({ req: {} })).resolves.toBe('forbidden')
  })
})
