import type { RefreshTokenRecord, RefreshTokenStore } from '@keyloom/core/jwt'
import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm'
import { withErrorMapping } from './errors'
import type { DrizzleAdapterConfig } from './index'
import * as schema from './schema'

// Union type for supported Drizzle database instances
type DrizzleDatabase = any // Keep loose for flexibility

/**
 * Create refresh token store for Drizzle
 */
export function createRefreshTokenStore(
  db: DrizzleDatabase,
  _config: DrizzleAdapterConfig,
): RefreshTokenStore {
  return {
    async save(record: RefreshTokenRecord) {
      return withErrorMapping(async () => {
        const tokenData = {
          id: crypto.randomUUID(),
          familyId: record.familyId,
          jti: record.jti,
          userId: record.userId,
          sessionId: record.sessionId || null,
          tokenHash: record.tokenHash,
          expiresAt: record.expiresAt,
          rotatedAt: null,
          revokedAt: null,
          parentJti: record.parentJti || null,
          ip: record.ip || null,
          userAgent: record.userAgent || null,
          createdAt: new Date(),
        }

        await db.insert(schema.refreshTokens).values(tokenData)
      })
    },

    async findByHash(tokenHash: string) {
      return withErrorMapping(async () => {
        const [token] = await db
          .select()
          .from(schema.refreshTokens)
          .where(eq(schema.refreshTokens.tokenHash, tokenHash))
          .limit(1)

        if (!token) return null

        return {
          familyId: token.familyId,
          jti: token.jti,
          userId: token.userId,
          sessionId: token.sessionId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          parentJti: token.parentJti,
          ip: token.ip,
          userAgent: token.userAgent,
        } as RefreshTokenRecord
      })
    },

    async markRotated(jti: string) {
      return withErrorMapping(async () => {
        await db
          .update(schema.refreshTokens)
          .set({ rotatedAt: new Date() })
          .where(eq(schema.refreshTokens.jti, jti))
      })
    },

    async revokeFamily(familyId: string) {
      return withErrorMapping(async () => {
        await db
          .update(schema.refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(schema.refreshTokens.familyId, familyId))
      })
    },

    async createChild(parent: RefreshTokenRecord, child: RefreshTokenRecord) {
      return withErrorMapping(async () => {
        // Use transaction to atomically mark parent as rotated and create child
        await db.transaction(async (tx: any) => {
          // Mark parent as rotated
          await tx
            .update(schema.refreshTokens)
            .set({ rotatedAt: new Date() })
            .where(eq(schema.refreshTokens.jti, parent.jti))

          // Create child token
          const childData = {
            id: crypto.randomUUID(),
            familyId: child.familyId,
            jti: child.jti,
            userId: child.userId,
            sessionId: child.sessionId || null,
            tokenHash: child.tokenHash,
            expiresAt: child.expiresAt,
            rotatedAt: null,
            revokedAt: null,
            parentJti: child.parentJti,
            ip: child.ip || null,
            userAgent: child.userAgent || null,
            createdAt: new Date(),
          }

          await tx.insert(schema.refreshTokens).values(childData)
        })
      })
    },

    async cleanupExpired(before?: Date) {
      return withErrorMapping(async () => {
        const cutoffDate = before || new Date()

        const result = await db
          .delete(schema.refreshTokens)
          .where(lt(schema.refreshTokens.expiresAt, cutoffDate))

        return result.rowsAffected || 0
      })
    },

    async isFamilyRevoked(familyId: string) {
      return withErrorMapping(async () => {
        const [token] = await db
          .select({ revokedAt: schema.refreshTokens.revokedAt })
          .from(schema.refreshTokens)
          .where(
            and(
              eq(schema.refreshTokens.familyId, familyId),
              isNotNull(schema.refreshTokens.revokedAt),
            ),
          )
          .limit(1)

        return !!token
      })
    },

    async getFamily(familyId: string) {
      return withErrorMapping(async () => {
        const tokens = await db
          .select()
          .from(schema.refreshTokens)
          .where(eq(schema.refreshTokens.familyId, familyId))

        return tokens.map((token) => ({
          familyId: token.familyId,
          jti: token.jti,
          userId: token.userId,
          sessionId: token.sessionId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          parentJti: token.parentJti,
          ip: token.ip,
          userAgent: token.userAgent,
        })) as RefreshTokenRecord[]
      })
    },

    // Additional helper methods for token management
    async isTokenRotated(jti: string) {
      return withErrorMapping(async () => {
        const [token] = await db
          .select({ rotatedAt: schema.refreshTokens.rotatedAt })
          .from(schema.refreshTokens)
          .where(eq(schema.refreshTokens.jti, jti))
          .limit(1)

        return !!token?.rotatedAt
      })
    },

    async getTokensByUser(userId: string) {
      return withErrorMapping(async () => {
        const tokens = await db
          .select()
          .from(schema.refreshTokens)
          .where(
            and(eq(schema.refreshTokens.userId, userId), isNull(schema.refreshTokens.revokedAt)),
          )

        return tokens.map((token) => ({
          familyId: token.familyId,
          jti: token.jti,
          userId: token.userId,
          sessionId: token.sessionId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          parentJti: token.parentJti,
          ip: token.ip,
          userAgent: token.userAgent,
        })) as RefreshTokenRecord[]
      })
    },

    async revokeUserTokens(userId: string) {
      return withErrorMapping(async () => {
        const result = await db
          .update(schema.refreshTokens)
          .set({ revokedAt: new Date() })
          .where(
            and(eq(schema.refreshTokens.userId, userId), isNull(schema.refreshTokens.revokedAt)),
          )

        return result.rowsAffected || 0
      })
    },

    async getActiveTokenCount(userId: string) {
      return withErrorMapping(async () => {
        const [result] = await db
          .select({ count: sql`count(*)` })
          .from(schema.refreshTokens)
          .where(
            and(
              eq(schema.refreshTokens.userId, userId),
              isNull(schema.refreshTokens.revokedAt),
              isNull(schema.refreshTokens.rotatedAt),
            ),
          )

        return Number(result?.count || 0)
      })
    },
  }
}
