import { describe, expect, it } from 'vitest'
import { memoryAdapter } from '@keyloom/core'

describe('RBAC: last owner protection', () => {
  it('prevents removing the last owner', async () => {
    const a: any = memoryAdapter()
    const org = await a.createOrganization({ name: 'Acme' })
    const user = await a.createUser({ email: 'o1@example.com' })

    const m = await a.addMember({ userId: user.id, orgId: org.id, role: 'owner' })

    await expect(a.removeMember(m.id)).rejects.toThrow('last_owner')
  })

  it('prevents downgrading the last owner', async () => {
    const a: any = memoryAdapter()
    const org = await a.createOrganization({ name: 'Acme' })
    const user = await a.createUser({ email: 'o2@example.com' })

    const m = await a.addMember({ userId: user.id, orgId: org.id, role: 'owner' })

    await expect(a.updateMember(m.id, { role: 'member' })).rejects.toThrow('last_owner')
  })

  it('allows changes when another owner exists', async () => {
    const a: any = memoryAdapter()
    const org = await a.createOrganization({ name: 'Acme' })
    const u1 = await a.createUser({ email: 'o1@example.com' })
    const u2 = await a.createUser({ email: 'o2@example.com' })

    const m1 = await a.addMember({ userId: u1.id, orgId: org.id, role: 'owner' })
    const m2 = await a.addMember({ userId: u2.id, orgId: org.id, role: 'owner' })

    // Downgrade one owner
    const updated = await a.updateMember(m1.id, { role: 'member' })
    expect(updated.role).toBe('member')

    // Removing the remaining owner should now be prevented
    await expect(a.removeMember(m2.id)).rejects.toThrow('last_owner')

    // Add another owner, then removing one owner should succeed
    const u3 = await a.createUser({ email: 'o3@example.com' })
    const m3 = await a.addMember({ userId: u3.id, orgId: org.id, role: 'owner' })

    await a.removeMember(m2.id)
    const got = await a.getMembership(u2.id, org.id)
    expect(got).toBeNull()

    // Last remaining owner (m3) cannot be removed
    await expect(a.removeMember(m3.id)).rejects.toThrow('last_owner')
  })
})

