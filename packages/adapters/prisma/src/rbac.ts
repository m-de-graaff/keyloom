import type { ID } from '@keyloom/core'
import type {
  RbacAdapter,
  Organization,
  Membership,
  Invite,
  Entitlements,
} from '@keyloom/core'

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
    async getOrganizationBySlug(slug: string) {
      const o = await prisma.organization.findUnique({ where: { slug } })
      return (o as unknown as Organization | null) ?? null
    },
    async updateOrganization(id: ID, data: Partial<Organization>) {
      const o = await prisma.organization.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug
        }
      })
      return o as unknown as Organization
    },
    async getUserOrganizations(userId: ID) {
      const orgs = await prisma.organization.findMany({
        where: { members: { some: { userId, status: 'active' } } },
        orderBy: { createdAt: 'asc' },
      })
      return orgs as unknown as Organization[]
    },

    async addMember(orgId: ID, userId: ID, role: string) {
      const m = await prisma.membership.create({
        data: { userId, orgId, role, status: 'active' },
      })
      return m as unknown as Membership
    },
    async updateMemberRole(orgId: ID, userId: ID, role: string) {
      const m = await prisma.membership.update({
        where: { userId_orgId: { userId, orgId } },
        data: { role }
      })
      return m as unknown as Membership
    },
    async removeMember(orgId: ID, userId: ID) {
      await prisma.membership.delete({
        where: { userId_orgId: { userId, orgId } }
      }).catch(() => {})
    },
    async getMembership(userId, orgId) {
      const m = await prisma.membership.findUnique({
        where: { userId_orgId: { userId, orgId } },
      })
      return (m as unknown as Membership | null) ?? null
    },
    async getOrganizationMembers(orgId: ID) {
      const rows = await prisma.membership.findMany({
        where: { orgId },
        include: { user: true },
      })
      return rows.map((r: any) => ({ ...r, userEmail: r.user?.email ?? null })) as unknown as (
        Membership & { userEmail?: string | null }
      )[]
    },

    async createInvite({ orgId, email, role, tokenHash, expiresAt }) {
      const inv = await prisma.invite.create({
        data: { orgId, email, role, tokenHash, expiresAt },
      })
      return inv as unknown as Invite
    },
    async getInviteByToken(orgId: ID, tokenHash: string) {
      const inv = await prisma.invite.findUnique({
        where: { orgId_tokenHash: { orgId, tokenHash } },
      })
      return (inv as unknown as Invite | null) ?? null
    },
    async acceptInvite(orgId: ID, tokenHash: string, userId: ID) {
      // Use transaction to atomically accept invite and create membership
      const result = await prisma.$transaction(async (tx: any) => {
        // Update invite
        const invite = await tx.invite.update({
          where: { orgId_tokenHash: { orgId, tokenHash } },
          data: { acceptedAt: new Date() },
        })

        // Create membership
        const membership = await tx.membership.create({
          data: {
            userId,
            orgId,
            role: invite.role,
            status: 'active'
          }
        })

        return {
          invite: invite as unknown as Invite,
          membership: membership as unknown as Membership
        }
      })

      return result
    },
    async getOrganizationInvites(orgId: ID) {
      const invites = await prisma.invite.findMany({
        where: { orgId, acceptedAt: null },
        orderBy: { createdAt: 'desc' }
      })
      return invites as unknown as Invite[]
    },
    async revokeInvite(orgId: ID, tokenHash: string) {
      await prisma.invite.delete({
        where: { orgId_tokenHash: { orgId, tokenHash } }
      }).catch(() => {})
    },

    async getEntitlement(orgId: ID) {
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
        updatedAt: e.updatedAt
      } as Entitlements & { orgId: ID; createdAt: Date; updatedAt: Date }
    },
    async setEntitlement(orgId: ID, ent: Partial<Entitlements>) {
      const result = await prisma.entitlement.upsert({
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

      return {
        orgId,
        plan: result.plan ?? undefined,
        seats: result.seats ?? undefined,
        features: (result.features as unknown as Record<string, boolean>) ?? {},
        limits: (result.limits as unknown as Record<string, number>) ?? {},
        validUntil: result.validUntil ?? null,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      } as Entitlements & { orgId: ID; createdAt: Date; updatedAt: Date }
    },
  }
}

