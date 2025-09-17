import type { Account, AuditEvent, ID, Session, User, VerificationToken } from '@keyloom/core'
import type {
  AdapterCapabilities,
  BaseAdapterConfig,
  KeyloomAdapter,
} from '@keyloom/core/adapter-types'
import { normalizeEmail } from '@keyloom/core/adapter-types'
// Note: We intentionally avoid tight coupling to Prisma types to keep this package buildable without a generated client
// If you have @prisma/client installed, your app will get proper intellisense
import { mapPrismaError } from './errors'
import { createRefreshTokenStore } from './jwt'
import { rbacAdapter } from './rbac'

type AnyPrismaClient = any

/**
 * Prisma adapter configuration
 */
export interface PrismaAdapterConfig extends BaseAdapterConfig {
  /** Enable case-insensitive email queries using database features */
  useCitext?: boolean
  /** Enable debug logging for Prisma queries */
  enableQueryLogging?: boolean
}

/**
 * Prisma adapter capabilities
 */
export const capabilities: AdapterCapabilities = {
  transactions: true,
  json: true,
  ttlIndex: false, // Prisma doesn't support TTL indexes directly
  caseInsensitiveEmail: 'app-normalize', // Can be 'citext' if using PostgreSQL with citext
  upsert: true,
  maxIdentifierLength: 191, // MySQL limitation, can be higher for PostgreSQL
}

export function prismaAdapter(
  prisma: AnyPrismaClient,
  _config: PrismaAdapterConfig = {},
): KeyloomAdapter & {
  // credentials extension:
  createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }>
  getCredentialByUserId(userId: ID): Promise<{ id: ID; userId: ID; hash: string } | null>
  updateCredential(userId: ID, hash: string): Promise<void>
} {
  const base = {
    // Users
    async createUser(data: Partial<User>) {
      try {
        const u = await prisma.user.create({
          data: {
            email: data.email ?? null,
            emailVerified: data.emailVerified ?? null,
            name: data.name ?? null,
            image: data.image ?? null,
          },
        })
        return u as unknown as User
      } catch (e) {
        throw mapPrismaError(e)
      }
    },
    async getUser(id: ID) {
      const u = await prisma.user.findUnique({ where: { id } })
      return (u as unknown as User | null) ?? null
    },
    async getUserByEmail(email: string) {
      // Normalize email for consistent lookup
      const normalizedEmail = normalizeEmail(email)
      const u = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
      return (u as unknown as User | null) ?? null
    },
    async updateUser(id: ID, data: Partial<User>) {
      try {
        const updateData: any = {}
        if (typeof (data as any).email !== 'undefined') updateData.email = (data as any).email
        if (typeof (data as any).emailVerified !== 'undefined')
          updateData.emailVerified = (data as any).emailVerified
        if (typeof (data as any).name !== 'undefined') updateData.name = (data as any).name
        if (typeof (data as any).image !== 'undefined') updateData.image = (data as any).image

        const u = await prisma.user.update({
          where: { id },
          data: updateData,
        })
        return u as unknown as User
      } catch (e) {
        throw mapPrismaError(e)
      }
    },

    // Accounts
    async linkAccount(acc: Account) {
      try {
        const a = await prisma.account.create({
          data: {
            userId: acc.userId,
            provider: acc.provider,
            providerAccountId: acc.providerAccountId,
            accessToken: acc.accessToken ?? null,
            refreshToken: acc.refreshToken ?? null,
            tokenType: acc.tokenType ?? null,
            scope: acc.scope ?? null,
            expiresAt: acc.expiresAt ?? null,
          },
        })
        return a as unknown as Account
      } catch (e) {
        throw mapPrismaError(e)
      }
    },
    async getAccountByProvider(provider: string, providerAccountId: string) {
      const a = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      })
      return (a as unknown as Account | null) ?? null
    },

    // Sessions
    async createSession(s: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) {
      const sess = await prisma.session.create({
        data: {
          userId: s.userId,
          expiresAt: s.expiresAt,
        },
      })
      return sess as unknown as Session
    },
    async getSession(id: ID) {
      const sess = await prisma.session.findUnique({ where: { id } })
      return (sess as unknown as Session | null) ?? null
    },
    async deleteSession(id: ID) {
      await prisma.session.delete({ where: { id } }).catch(() => {})
    },

    // Tokens
    async createVerificationToken(v: Omit<VerificationToken, 'id' | 'createdAt' | 'consumedAt'>) {
      const tokenHash = (v as unknown as { tokenHash?: string }).tokenHash ?? v.token
      const vt = await prisma.verificationToken.create({
        data: {
          identifier: v.identifier,
          tokenHash,
          expiresAt: v.expiresAt,
        },
      })
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: v.token, // return the plain token per contract expectations
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: vt.consumedAt ?? null,
      } as unknown as VerificationToken
    },
    async useVerificationToken(identifier: string, tokenOrHash: string) {
      const vt = await prisma.verificationToken.findUnique({
        where: {
          identifier_tokenHash: { identifier, tokenHash: tokenOrHash },
        },
      })
      if (!vt) return null
      await prisma.verificationToken.delete({
        where: {
          identifier_tokenHash: { identifier, tokenHash: tokenOrHash },
        },
      })
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: tokenOrHash, // echo the provided token back to satisfy contract equality
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: vt.consumedAt ?? null,
      } as unknown as VerificationToken
    },

    // Audit
    async appendAudit(event: AuditEvent) {
      await prisma.auditLog.create({
        data: {
          type: event.type,
          userId: event.userId ?? null,
          actorId: event.actorId ?? null,
          ip: event.ip ?? null,
          ua: event.ua ?? null,
          at: event.at ?? new Date(),
          meta: (event.meta as unknown) ?? null,
        },
      })
    },

    // Credentials extension
    async createCredential(userId: ID, hash: string) {
      const c = await prisma.credential.create({ data: { userId, hash } })
      return { id: c.id as ID, userId: c.userId as ID }
    },
    async getCredentialByUserId(userId: ID) {
      const c = await prisma.credential.findUnique({ where: { userId } })
      return c
        ? {
            id: c.id as ID,
            userId: c.userId as ID,
            hash: c.hash,
          }
        : null
    },
    async updateCredential(userId: ID, hash: string) {
      await prisma.credential.update({ where: { userId }, data: { hash } })
    },
  }

  // Create refresh token store
  const refreshTokenStore = createRefreshTokenStore(prisma)

  // Combine all adapter capabilities
  const extended = Object.assign(base, rbacAdapter(prisma), refreshTokenStore, {
    // Adapter capabilities
    capabilities,

    // RBAC contract wrappers expected by tests
    async getOrganizationBySlug(slug: string) {
      const o = await prisma.organization.findUnique({ where: { slug } })
      return (o as unknown as any) ?? null
    },
    async updateOrganization(id: ID, data: Partial<{ name: string; slug?: string | null }>) {
      const o = await prisma.organization.update({ where: { id }, data })
      return o as unknown as any
    },
    async getUserOrganizations(userId: ID) {
      const orgs = await prisma.organization.findMany({
        where: { members: { some: { userId, status: 'active' } } },
        orderBy: { createdAt: 'asc' },
      })
      return orgs as unknown as any[]
    },
    async addMember(orgId: ID, userId: ID, role: string) {
      const m = await prisma.membership.create({
        data: { orgId, userId, role, status: 'active' },
      })
      return m as unknown as any
    },
    async getMembership(userId: ID, orgId: ID) {
      const m = await prisma.membership.findUnique({
        where: { userId_orgId: { userId, orgId } },
      })
      return (m as unknown as any) ?? null
    },
    async updateMemberRole(orgId: ID, userId: ID, role: string) {
      const m = await prisma.membership.update({
        where: { userId_orgId: { userId, orgId } },
        data: { role },
      })
      return m as unknown as any
    },
    async removeMember(orgId: ID, userId: ID) {
      await prisma.membership.delete({ where: { userId_orgId: { userId, orgId } } }).catch(() => {})
    },
    async getOrganizationMembers(orgId: ID) {
      const rows = await prisma.membership.findMany({
        where: { orgId },
        include: { user: true },
      })
      return rows.map((r: any) => ({ ...r, userEmail: r.user?.email ?? null }))
    },
    async getInviteByToken(orgId: ID, tokenHash: string) {
      const inv = await prisma.invite.findUnique({
        where: { orgId_tokenHash: { orgId, tokenHash } },
      })
      return (inv as unknown as any) ?? null
    },
    async acceptInvite(orgId: ID, tokenHash: string, userId: ID) {
      const inv = await prisma.invite.findUnique({
        where: { orgId_tokenHash: { orgId, tokenHash } },
      })
      if (!inv) return null
      const accepted = await prisma.invite.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date() },
      })
      const membership = await prisma.membership.create({
        data: { orgId, userId, role: inv.role, status: 'active' },
      })
      return { invite: accepted, membership }
    },
    async getOrganizationInvites(orgId: ID) {
      const invites = await prisma.invite.findMany({
        where: { orgId },
        orderBy: { createdAt: 'asc' },
      })
      return invites as unknown as any[]
    },
    async revokeInvite(orgId: ID, tokenHash: string) {
      await prisma.invite
        .delete({ where: { orgId_tokenHash: { orgId, tokenHash } } })
        .catch(() => {})
    },
    async setEntitlement(orgId: ID, ent: any) {
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
      return this.getEntitlement(orgId)
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
        updatedAt: e.updatedAt,
      }
    },

    // Optional methods
    async cleanup() {
      const now = new Date()

      // Clean up expired sessions
      const expiredSessions = await prisma.session.deleteMany({
        where: { expiresAt: { lt: now } },
      })

      // Clean up expired verification tokens
      const expiredTokens = await prisma.verificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
      })

      // Clean up expired refresh tokens
      const expiredRefreshTokens = await refreshTokenStore.cleanupExpired(now)

      return {
        sessions: expiredSessions.count || 0,
        tokens: expiredTokens.count || 0,
        refreshTokens: expiredRefreshTokens,
      }
    },

    async healthCheck() {
      try {
        // Simple query to test database connectivity
        await prisma.$queryRaw`SELECT 1`
        return { status: 'healthy' as const }
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      }
    },

    async close() {
      if (prisma.$disconnect) {
        await prisma.$disconnect()
      }
    },
  })

  return extended
}

export { mapError, mapPrismaError } from './errors'
// Export selected helpers without re-declaring existing exports
export { createRefreshTokenStore } from './jwt'
export { rbacAdapter } from './rbac'

// Optional named export alias for convenience
export { prismaAdapter as PrismaAdapter }
