import type { ID } from '@keyloom/core'
import type {
  RbacAdapter,
  Organization,
  Membership,
  Invite,
  Entitlements,
} from '@keyloom/core'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { withErrorMapping } from './errors'
import type { DrizzleAdapterConfig } from './index'
import * as schema from './schema'

// Union type for supported Drizzle database instances
type DrizzleDatabase = any // Keep loose for flexibility

/**
 * Create RBAC adapter for Drizzle
 */
export function createRbacAdapter(
  db: DrizzleDatabase,
  config: DrizzleAdapterConfig
): RbacAdapter {
  return {
    // Organizations
    async createOrganization(data: { name: string; slug?: string }) {
      return withErrorMapping(async () => {
        const orgData = {
          id: crypto.randomUUID(),
          name: data.name,
          slug: data.slug || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const [org] = await db.insert(schema.organizations).values(orgData).returning()
        return org as Organization
      })
    },

    async getOrganization(id: ID) {
      return withErrorMapping(async () => {
        const [org] = await db
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.id, id))
          .limit(1)
        
        return (org as Organization) || null
      })
    },

    async getOrganizationBySlug(slug: string) {
      return withErrorMapping(async () => {
        const [org] = await db
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.slug, slug))
          .limit(1)
        
        return (org as Organization) || null
      })
    },

    async updateOrganization(id: ID, data: Partial<Organization>) {
      return withErrorMapping(async () => {
        const updateData: any = {
          updatedAt: new Date()
        }
        
        if (data.name !== undefined) updateData.name = data.name
        if (data.slug !== undefined) updateData.slug = data.slug

        const [org] = await db
          .update(schema.organizations)
          .set(updateData)
          .where(eq(schema.organizations.id, id))
          .returning()
        
        return org as Organization
      })
    },

    async getUserOrganizations(userId: ID) {
      return withErrorMapping(async () => {
        const orgs = await db
          .select({
            id: schema.organizations.id,
            name: schema.organizations.name,
            slug: schema.organizations.slug,
            createdAt: schema.organizations.createdAt,
            updatedAt: schema.organizations.updatedAt,
          })
          .from(schema.organizations)
          .innerJoin(
            schema.memberships,
            and(
              eq(schema.memberships.orgId, schema.organizations.id),
              eq(schema.memberships.userId, userId),
              eq(schema.memberships.status, 'active')
            )
          )
          .orderBy(schema.organizations.createdAt)
        
        return orgs as Organization[]
      })
    },

    // Memberships
    async addMember(orgId: ID, userId: ID, role: string) {
      return withErrorMapping(async () => {
        const memberData = {
          id: crypto.randomUUID(),
          userId,
          orgId,
          role,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const [membership] = await db.insert(schema.memberships).values(memberData).returning()
        return membership as Membership
      })
    },

    async getMembership(userId: ID, orgId: ID) {
      return withErrorMapping(async () => {
        const [membership] = await db
          .select()
          .from(schema.memberships)
          .where(
            and(
              eq(schema.memberships.userId, userId),
              eq(schema.memberships.orgId, orgId)
            )
          )
          .limit(1)
        
        return (membership as Membership) || null
      })
    },

    async updateMemberRole(orgId: ID, userId: ID, role: string) {
      return withErrorMapping(async () => {
        const [membership] = await db
          .update(schema.memberships)
          .set({ 
            role,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(schema.memberships.userId, userId),
              eq(schema.memberships.orgId, orgId)
            )
          )
          .returning()
        
        return membership as Membership
      })
    },

    async removeMember(orgId: ID, userId: ID) {
      return withErrorMapping(async () => {
        await db
          .delete(schema.memberships)
          .where(
            and(
              eq(schema.memberships.userId, userId),
              eq(schema.memberships.orgId, orgId)
            )
          )
      })
    },

    async getOrganizationMembers(orgId: ID) {
      return withErrorMapping(async () => {
        const members = await db
          .select({
            id: schema.memberships.id,
            userId: schema.memberships.userId,
            orgId: schema.memberships.orgId,
            role: schema.memberships.role,
            status: schema.memberships.status,
            createdAt: schema.memberships.createdAt,
            updatedAt: schema.memberships.updatedAt,
            userEmail: schema.users.email,
          })
          .from(schema.memberships)
          .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
          .where(eq(schema.memberships.orgId, orgId))
        
        return members as (Membership & { userEmail?: string | null })[]
      })
    },

    // Invitations
    async createInvite(data: {
      orgId: ID
      email: string
      role: string
      tokenHash: string
      expiresAt: Date
    }) {
      return withErrorMapping(async () => {
        const inviteData = {
          id: crypto.randomUUID(),
          orgId: data.orgId,
          email: data.email,
          role: data.role,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          acceptedAt: null,
          createdAt: new Date(),
        }

        const [invite] = await db.insert(schema.invites).values(inviteData).returning()
        return invite as Invite
      })
    },

    async getInviteByToken(orgId: ID, tokenHash: string) {
      return withErrorMapping(async () => {
        const [invite] = await db
          .select()
          .from(schema.invites)
          .where(
            and(
              eq(schema.invites.orgId, orgId),
              eq(schema.invites.tokenHash, tokenHash)
            )
          )
          .limit(1)
        
        return (invite as Invite) || null
      })
    },

    async acceptInvite(orgId: ID, tokenHash: string, userId: ID) {
      return withErrorMapping(async () => {
        // Use transaction to atomically accept invite and create membership
        return await db.transaction(async (tx: any) => {
          // Update invite
          const [invite] = await tx
            .update(schema.invites)
            .set({ acceptedAt: new Date() })
            .where(
              and(
                eq(schema.invites.orgId, orgId),
                eq(schema.invites.tokenHash, tokenHash)
              )
            )
            .returning()

          // Create membership
          const memberData = {
            id: crypto.randomUUID(),
            userId,
            orgId,
            role: invite.role,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const [membership] = await tx.insert(schema.memberships).values(memberData).returning()

          return {
            invite: invite as Invite,
            membership: membership as Membership
          }
        })
      })
    },

    async getOrganizationInvites(orgId: ID) {
      return withErrorMapping(async () => {
        const invites = await db
          .select()
          .from(schema.invites)
          .where(
            and(
              eq(schema.invites.orgId, orgId),
              isNull(schema.invites.acceptedAt)
            )
          )
          .orderBy(desc(schema.invites.createdAt))
        
        return invites as Invite[]
      })
    },

    async revokeInvite(orgId: ID, tokenHash: string) {
      return withErrorMapping(async () => {
        await db
          .delete(schema.invites)
          .where(
            and(
              eq(schema.invites.orgId, orgId),
              eq(schema.invites.tokenHash, tokenHash)
            )
          )
      })
    },

    // Entitlements
    async getEntitlement(orgId: ID) {
      return withErrorMapping(async () => {
        const [entitlement] = await db
          .select()
          .from(schema.entitlements)
          .where(eq(schema.entitlements.orgId, orgId))
          .limit(1)
        
        if (!entitlement) return null

        return {
          orgId,
          plan: entitlement.plan || undefined,
          seats: entitlement.seats || undefined,
          features: (entitlement.features as Record<string, boolean>) || {},
          limits: (entitlement.limits as Record<string, number>) || {},
          validUntil: entitlement.validUntil || null,
          createdAt: entitlement.createdAt,
          updatedAt: entitlement.updatedAt
        } as Entitlements & { orgId: ID; createdAt: Date; updatedAt: Date }
      })
    },

    async setEntitlement(orgId: ID, ent: Partial<Entitlements>) {
      return withErrorMapping(async () => {
        const entitlementData = {
          id: crypto.randomUUID(),
          orgId,
          plan: ent.plan || null,
          seats: ent.seats || null,
          features: ent.features || {},
          limits: ent.limits || {},
          validUntil: ent.validUntil || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Use upsert pattern
        const [result] = await db
          .insert(schema.entitlements)
          .values(entitlementData)
          .onConflictDoUpdate({
            target: schema.entitlements.orgId,
            set: {
              plan: entitlementData.plan,
              seats: entitlementData.seats,
              features: entitlementData.features,
              limits: entitlementData.limits,
              validUntil: entitlementData.validUntil,
              updatedAt: entitlementData.updatedAt,
            }
          })
          .returning()
        
        return {
          orgId,
          plan: result.plan || undefined,
          seats: result.seats || undefined,
          features: (result.features as Record<string, boolean>) || {},
          limits: (result.limits as Record<string, number>) || {},
          validUntil: result.validUntil || null,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        } as Entitlements & { orgId: ID; createdAt: Date; updatedAt: Date }
      })
    },
  }
}
