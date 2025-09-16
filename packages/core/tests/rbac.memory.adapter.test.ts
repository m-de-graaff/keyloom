import { describe, expect, it } from 'vitest'
import { memoryAdapter } from '../src/adapters/memory'
import { issueInviteToken } from '../src/rbac/invites'

describe('memory adapter RBAC', () => {
  it('org create, add/list membership, invite/accept', async () => {
    const a = memoryAdapter()
    const u1 = await a.createUser({ email: 'a@b.co' })
    const u2 = await a.createUser({ email: 'c@d.co' })

    const org = await (a as any).createOrganization({ name: 'Acme' })
    await (a as any).addMember({ userId: u1.id, orgId: org.id, role: 'owner' })

    const orgsForU1 = await (a as any).getOrganizationsByUser(u1.id)
    expect(orgsForU1.map((o: any) => o.id)).toContain(org.id)

    const m1 = await (a as any).getMembership(u1.id, org.id)
    expect(m1?.role).toBe('owner')

    const { token, tokenHash, expiresAt } = issueInviteToken(
      'c@d.co',
      org.id,
      'member',
      'secret',
      5,
    )
    await (a as any).createInvite({
      orgId: org.id,
      email: 'c@d.co',
      role: 'member',
      tokenHash,
      expiresAt,
    })

    const inv = await (a as any).getInviteByTokenHash(org.id, tokenHash)
    expect(inv?.email).toBe('c@d.co')

    await (a as any).consumeInvite(inv?.id)
    await (a as any).addMember({ userId: u2.id, orgId: org.id, role: inv?.role })

    const m2 = await (a as any).getMembership(u2.id, org.id)
    expect(m2?.role).toBe('member')

    const members = await (a as any).listMembers(org.id)
    expect(members.length).toBe(2)
  })
})
