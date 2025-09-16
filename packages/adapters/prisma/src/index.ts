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

export default function prismaAdapter(
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
      const vt = await prisma.verificationToken.create({
        data: {
          identifier: v.identifier,
          tokenHash: (v as unknown as { tokenHash?: string }).tokenHash ?? v.token,
          expiresAt: v.expiresAt,
        },
      })
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: v.token ?? '***',
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: vt.consumedAt ?? null,
      } as unknown as VerificationToken
    },
    async useVerificationToken(identifier: string, tokenHashOrToken: string) {
      const vt = await prisma.verificationToken.findUnique({
        where: {
          identifier_tokenHash: { identifier, tokenHash: tokenHashOrToken },
        },
      })
      if (!vt) return null
      await prisma.verificationToken.delete({
        where: {
          identifier_tokenHash: { identifier, tokenHash: tokenHashOrToken },
        },
      })
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: '***',
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
