import type { PrismaClient } from '@prisma/client'
import type { RefreshTokenStore, RefreshTokenRecord } from '@keyloom/core/jwt'

/**
 * Prisma-based refresh token store implementation
 */
export function createRefreshTokenStore(prisma: PrismaClient): RefreshTokenStore {
  return {
    async save(record: RefreshTokenRecord): Promise<void> {
      await prisma.refreshToken.create({
        data: {
          id: record.familyId + '_' + record.jti, // Ensure unique ID
          familyId: record.familyId,
          jti: record.jti,
          userId: record.userId,
          sessionId: record.sessionId,
          tokenHash: record.tokenHash,
          expiresAt: record.expiresAt,
          parentJti: record.parentJti,
          ip: record.ip,
          userAgent: record.userAgent,
        }
      })
    },

    async findByHash(hash: string): Promise<RefreshTokenRecord | null> {
      const token = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash }
      })

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
      }
    },

    async markRotated(jti: string): Promise<void> {
      await prisma.refreshToken.updateMany({
        where: { 
          jti,
          rotatedAt: null // Only update if not already rotated
        },
        data: { rotatedAt: new Date() }
      })
    },

    async revokeFamily(familyId: string): Promise<void> {
      await prisma.refreshToken.updateMany({
        where: { 
          familyId,
          revokedAt: null // Only revoke tokens that aren't already revoked
        },
        data: { revokedAt: new Date() }
      })
    },

    async createChild(parentRecord: RefreshTokenRecord, childRecord: RefreshTokenRecord): Promise<void> {
      // First mark parent as rotated, then create child
      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { 
            jti: parentRecord.jti,
            rotatedAt: null
          },
          data: { rotatedAt: new Date() }
        }),
        prisma.refreshToken.create({
          data: {
            id: childRecord.familyId + '_' + childRecord.jti,
            familyId: childRecord.familyId,
            jti: childRecord.jti,
            userId: childRecord.userId,
            sessionId: childRecord.sessionId,
            tokenHash: childRecord.tokenHash,
            expiresAt: childRecord.expiresAt,
            parentJti: childRecord.parentJti,
            ip: childRecord.ip,
            userAgent: childRecord.userAgent,
          }
        })
      ])
    },

    async cleanupExpired(before = new Date()): Promise<number> {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: before }
        }
      })
      return result.count
    },

    async isFamilyRevoked(familyId: string): Promise<boolean> {
      const revokedToken = await prisma.refreshToken.findFirst({
        where: {
          familyId,
          revokedAt: { not: null }
        }
      })
      return !!revokedToken
    },

    async getFamily(familyId: string): Promise<RefreshTokenRecord[]> {
      const tokens = await prisma.refreshToken.findMany({
        where: { familyId },
        orderBy: { createdAt: 'asc' }
      })

      return tokens.map(token => ({
        familyId: token.familyId,
        jti: token.jti,
        userId: token.userId,
        sessionId: token.sessionId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        parentJti: token.parentJti,
        ip: token.ip,
        userAgent: token.userAgent,
      }))
    }
  }
}

/**
 * Helper to get refresh token statistics
 */
export async function getRefreshTokenStats(prisma: PrismaClient): Promise<{
  total: number
  expired: number
  revoked: number
  rotated: number
  active: number
}> {
  const now = new Date()
  
  const [total, expired, revoked, rotated] = await Promise.all([
    prisma.refreshToken.count(),
    prisma.refreshToken.count({
      where: { expiresAt: { lt: now } }
    }),
    prisma.refreshToken.count({
      where: { revokedAt: { not: null } }
    }),
    prisma.refreshToken.count({
      where: { rotatedAt: { not: null } }
    })
  ])

  const active = total - expired - revoked

  return { total, expired, revoked, rotated, active }
}

/**
 * Helper to revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: { revokedAt: new Date() }
  })
  return result.count
}

/**
 * Helper to get active refresh token families for a user
 */
export async function getUserRefreshTokenFamilies(
  prisma: PrismaClient,
  userId: string
): Promise<string[]> {
  const families = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: { familyId: true },
    distinct: ['familyId']
  })

  return families.map(f => f.familyId)
}
