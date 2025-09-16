import type { Entitlements, ID, Invite, Membership, Organization, RbacAdapter } from '@keyloom/core'

// Keep prisma type loose to avoid requiring generated client at build time
export function rbacAdapter(prisma: any): RbacAdapter {
  return {
    async createOrganization(data) {
      const o = await prisma.organization.create({
        data: { name: data.name, slug: data.slug ?? null },
      })
      return o as unknown as Organization
    },
    async getOrganization(id) {
      const o = await prisma.organization.findUnique({ where: { id } })
      return (o as unknown as Organization | null) ?? null
    },
    async getOrganizationsByUser(userId: ID) {
      const orgs = await prisma.organization.findMany({
        where: { members: { some: { userId, status: 'active' } } },
        orderBy: { createdAt: 'asc' },
      })
      return orgs as unknown as Organization[]
    },

    async addMember(data: { userId: ID; orgId: ID; role: string }) {
      const m = await prisma.membership.create({
        data: {
          userId: data.userId,
          orgId: data.orgId,
          role: data.role,
          status: 'active',
        },
      })
      return m as unknown as Membership
    },
    async updateMember(id: ID, data: Partial<Pick<Membership, 'role' | 'status'>>) {
      const m = await prisma.membership.update({
        where: { id },
        data,
      })
      return m as unknown as Membership
    },
    async removeMember(id: ID) {
      await prisma.membership.delete({ where: { id } }).catch(() => {})
    },
    async getMembership(userId, orgId) {
      const m = await prisma.membership.findUnique({
        where: { userId_orgId: { userId, orgId } },
      })
      return (m as unknown as Membership | null) ?? null
    },
    async listMembers(orgId: ID) {
      const rows = await prisma.membership.findMany({
        where: { orgId },
        include: { user: true },
      })
      return rows.map((r: any) => ({
        ...r,
        userEmail: r.user?.email ?? null,
      })) as unknown as (Membership & { userEmail?: string | null })[]
    },

    async createInvite({ orgId, email, role, tokenHash, expiresAt }) {
      const inv = await prisma.invite.create({
        data: { orgId, email, role, tokenHash, expiresAt },
      })
      return inv as unknown as Invite
    },
    async getInviteByTokenHash(orgId: ID, tokenHash: string) {
      const inv = await prisma.invite.findUnique({
        where: { orgId_tokenHash: { orgId, tokenHash } },
      })
      return (inv as unknown as Invite | null) ?? null
    },
    async consumeInvite(inviteId: ID) {
      await prisma.invite.delete({ where: { id: inviteId } }).catch(() => {})
    },

    async getEntitlements(orgId: ID) {
      const e = await prisma.entitlement.findUnique({ where: { orgId } })
      if (!e) return null
      const { plan, seats, features, limits, validUntil } = e
      return {
        orgId,
        plan: plan ?? undefined,
        seats: seats ?? undefined,
        features: (features as unknown as Record<string, boolean>) ?? {},
        limits: (limits as unknown as Record<string, number>) ?? {},
        validUntil: validUntil ?? null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      } as Entitlements & { orgId: ID; createdAt: Date; updatedAt: Date }
    },
    async setEntitlements(orgId: ID, ent: Entitlements) {
      await prisma.entitlement.upsert({
        where: { orgId },
        update: {
          plan: ent.plan ?? null,
          seats: ent.seats ?? null,
          features: ent.features ?? {},
          limits: ent.limits ?? {},
          validUntil: ent.validUntil ?? null,
        },
        create: {
          orgId,
          plan: ent.plan ?? null,
          seats: ent.seats ?? null,
          features: ent.features ?? {},
          limits: ent.limits ?? {},
          validUntil: ent.validUntil ?? null,
        },
      })
    },
  }
}
