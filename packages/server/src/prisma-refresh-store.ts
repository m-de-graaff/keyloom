import type { RefreshTokenRecord, RefreshTokenStore } from '@keyloom/core/jwt'

// Lightweight Prisma-based refresh token store for @keyloom/server
// Keeps prisma typed as any to avoid requiring generated client at build time
export function createRefreshTokenStore(prisma: any): RefreshTokenStore {
  return {
    async save(record: RefreshTokenRecord): Promise<void> {
      await prisma.refreshToken.create({
        data: {
          id: `${record.familyId}_${record.jti}`,
          familyId: record.familyId,
          jti: record.jti,
          userId: record.userId,
          sessionId: record.sessionId,
          tokenHash: record.tokenHash,
          expiresAt: record.expiresAt,
          parentJti: record.parentJti,
          ip: record.ip,
          userAgent: record.userAgent,
          rotatedAt: null,
          revokedAt: null,
        },
      })
    },

    async findByHash(hash: string): Promise<RefreshTokenRecord | null> {
      const token = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash },
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
      } as RefreshTokenRecord
    },

    async markRotated(jti: string): Promise<void> {
      await prisma.refreshToken.update({
        where: { jti },
        data: { rotatedAt: new Date() },
      })
    },

    async revokeFamily(familyId: string): Promise<void> {
      await prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    },

    async createChild(
      parentRecord: RefreshTokenRecord,
      childRecord: RefreshTokenRecord,
    ): Promise<void> {
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { jti: parentRecord.jti },
          data: { rotatedAt: new Date() },
        }),
        prisma.refreshToken.create({
          data: {
            id: `${childRecord.familyId}_${childRecord.jti}`,
            familyId: childRecord.familyId,
            jti: childRecord.jti,
            userId: childRecord.userId,
            sessionId: childRecord.sessionId,
            tokenHash: childRecord.tokenHash,
            expiresAt: childRecord.expiresAt,
            parentJti: childRecord.parentJti,
            ip: childRecord.ip,
            userAgent: childRecord.userAgent,
            rotatedAt: null,
            revokedAt: null,
          },
        }),
      ])
    },

    async cleanupExpired(before = new Date()): Promise<number> {
      const result = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: before } },
      })
      return result.count ?? 0
    },

    async isFamilyRevoked(familyId: string): Promise<boolean> {
      const revokedToken = await prisma.refreshToken.findFirst({
        where: { familyId, revokedAt: { not: null } },
      })
      return !!revokedToken
    },

    async getFamily(familyId: string): Promise<RefreshTokenRecord[]> {
      const tokens = await prisma.refreshToken.findMany({
        where: { familyId },
        orderBy: { createdAt: 'asc' },
      })
      return tokens.map((token: any) => ({
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
    },
  }
}
