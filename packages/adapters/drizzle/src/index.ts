import type {
  Account,
  Adapter,
  AuditEvent,
  ID,
  Session,
  User,
  VerificationToken,
} from '@keyloom/core'
import type {
  AdapterCapabilities,
  BaseAdapterConfig,
  KeyloomAdapter,
} from '@keyloom/core/adapter-types'
import { normalizeEmail } from '@keyloom/core/adapter-types'
import { and, eq, lt } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { withErrorMapping } from './errors'
import { createRbacAdapter } from './rbac'
import { createRefreshTokenStore } from './refresh'
import * as schema from './schema'

// Union type for supported Drizzle database instances
type DrizzleDatabase =
  | NodePgDatabase<typeof schema>
  | MySql2Database<typeof schema>
  | DrizzleD1Database<typeof schema>

/**
 * Drizzle adapter configuration
 */
export interface DrizzleAdapterConfig extends BaseAdapterConfig {
  /** Database dialect */
  dialect: 'postgresql' | 'mysql' | 'sqlite'
  /** Enable debug logging for queries */
  enableQueryLogging?: boolean
}

/**
 * Get adapter capabilities based on database dialect
 */
function getCapabilities(dialect: string): AdapterCapabilities {
  const base: AdapterCapabilities = {
    transactions: true,
    json: true,
    upsert: true,
    maxIdentifierLength: 191,
  }

  switch (dialect) {
    case 'postgresql':
      return {
        ...base,
        ttlIndex: false, // PostgreSQL doesn't have native TTL
        caseInsensitiveEmail: 'citext', // Can use citext extension
        maxIdentifierLength: 63,
      }

    case 'mysql':
      return {
        ...base,
        ttlIndex: false,
        caseInsensitiveEmail: 'collation', // Use utf8mb4_unicode_ci
        maxIdentifierLength: 191, // utf8mb4 limitation
      }

    case 'sqlite':
      return {
        ...base,
        ttlIndex: false,
        caseInsensitiveEmail: 'app-normalize', // No native case-insensitive support
        json: 'limited', // SQLite JSON support is limited
        maxIdentifierLength: undefined, // No practical limit
      }

    default:
      return base
  }
}

/**
 * Create Drizzle adapter
 */
export default function drizzleAdapter(
  db: DrizzleDatabase,
  config: DrizzleAdapterConfig,
): KeyloomAdapter {
  const capabilities = getCapabilities(config.dialect)

  const base: Adapter = {
    // Users
    async createUser(data: Partial<User>) {
      return withErrorMapping(async () => {
        const userData = {
          id: crypto.randomUUID(),
          email: data.email ? normalizeEmail(data.email) : null,
          emailVerified: data.emailVerified || null,
          name: data.name || null,
          image: data.image || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const [user] = await db.insert(schema.users).values(userData).returning()
        return user as User
      })
    },

    async getUser(id: ID) {
      return withErrorMapping(async () => {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)

        return (user as User) || null
      })
    },

    async getUserByEmail(email: string) {
      return withErrorMapping(async () => {
        const normalizedEmail = normalizeEmail(email)
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, normalizedEmail))
          .limit(1)

        return (user as User) || null
      })
    },

    async updateUser(id: ID, data: Partial<User>) {
      return withErrorMapping(async () => {
        const updateData: any = {
          updatedAt: new Date(),
        }

        if (data.email !== undefined)
          updateData.email = data.email ? normalizeEmail(data.email) : null
        if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified
        if (data.name !== undefined) updateData.name = data.name
        if (data.image !== undefined) updateData.image = data.image

        const [user] = await db
          .update(schema.users)
          .set(updateData)
          .where(eq(schema.users.id, id))
          .returning()

        return user as User
      })
    },

    // Accounts
    async linkAccount(data: Parameters<Adapter['linkAccount']>[0]) {
      return withErrorMapping(async () => {
        const accountData = {
          id: crypto.randomUUID(),
          userId: data.userId,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refreshToken: data.refreshToken || null,
          accessToken: data.accessToken || null,
          expiresAt: data.expiresAt || null,
          tokenType: data.tokenType || null,
          scope: data.scope || null,
          idToken: data.idToken || null,
          sessionState: data.sessionState || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const [account] = await db.insert(schema.accounts).values(accountData).returning()
        return account as Account
      })
    },

    async getAccountByProvider(provider: string, providerAccountId: string) {
      return withErrorMapping(async () => {
        const [account] = await db
          .select()
          .from(schema.accounts)
          .where(
            and(
              eq(schema.accounts.provider, provider),
              eq(schema.accounts.providerAccountId, providerAccountId),
            ),
          )
          .limit(1)

        return (account as Account) || null
      })
    },

    // Sessions
    async createSession(data: { userId: ID; expiresAt: Date }) {
      return withErrorMapping(async () => {
        const sessionData = {
          id: crypto.randomUUID(),
          userId: data.userId,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        }

        const [session] = await db.insert(schema.sessions).values(sessionData).returning()
        return session as Session
      })
    },

    async getSession(id: ID) {
      return withErrorMapping(async () => {
        const [session] = await db
          .select()
          .from(schema.sessions)
          .where(eq(schema.sessions.id, id))
          .limit(1)

        return (session as Session) || null
      })
    },

    async deleteSession(id: ID) {
      return withErrorMapping(async () => {
        await db.delete(schema.sessions).where(eq(schema.sessions.id, id))
      })
    },

    // Verification Tokens
    async createVerificationToken(data: { identifier: string; token: string; expiresAt: Date }) {
      return withErrorMapping(async () => {
        const tokenData = {
          identifier: data.identifier,
          tokenHash: await this.hashToken(data.token),
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        }

        const [token] = await db.insert(schema.verificationTokens).values(tokenData).returning()
        return token as VerificationToken
      })
    },

    async useVerificationToken(identifier: string, token: string) {
      return withErrorMapping(async () => {
        const tokenHash = await this.hashToken(token)

        // Find and delete the token atomically
        const [foundToken] = await db
          .delete(schema.verificationTokens)
          .where(
            and(
              eq(schema.verificationTokens.identifier, identifier),
              eq(schema.verificationTokens.tokenHash, tokenHash),
            ),
          )
          .returning()

        return (foundToken as VerificationToken) || null
      })
    },

    // Audit Events
    async appendAudit(event: AuditEvent) {
      return withErrorMapping(async () => {
        const auditData = {
          id: crypto.randomUUID(),
          type: event.type,
          userId: event.userId || null,
          ip: event.ip || null,
          userAgent: event.ua || null,
          timestamp: event.at || new Date(),
          metadata: event.meta || null,
        }

        await db.insert(schema.auditEvents).values(auditData)
      })
    },

    // Helper method for token hashing
    async hashToken(token: string): Promise<string> {
      const encoder = new TextEncoder()
      const data = encoder.encode(token)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    },
  }

  // Create RBAC and refresh token adapters
  const rbacAdapter = createRbacAdapter(db, config)
  const refreshTokenStore = createRefreshTokenStore(db, config)

  // Combine all adapters
  const extended = Object.assign(base, rbacAdapter, refreshTokenStore, {
    capabilities,

    // Optional methods
    async cleanup() {
      const now = new Date()

      // Clean up expired sessions
      const expiredSessions = await db
        .delete(schema.sessions)
        .where(lt(schema.sessions.expiresAt, now))

      // Clean up expired verification tokens
      const expiredTokens = await db
        .delete(schema.verificationTokens)
        .where(lt(schema.verificationTokens.expiresAt, now))

      // Clean up expired refresh tokens
      const expiredRefreshTokens = await refreshTokenStore.cleanupExpired(now)

      return {
        sessions: expiredSessions.rowsAffected || 0,
        tokens: expiredTokens.rowsAffected || 0,
        refreshTokens: expiredRefreshTokens,
      }
    },

    async healthCheck() {
      try {
        // Simple query to test database connectivity
        await db.select().from(schema.users).limit(1)
        return { status: 'healthy' as const }
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  })

  return extended
}

export { mapError } from './errors'
// Export schema and types
export * from './schema'
export type { DrizzleAdapterConfig }
