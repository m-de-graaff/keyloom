import type {
  Account,
  Adapter,
  AuditEvent,
  ID,
  Session,
  User,
  VerificationToken,
} from '@keyloom/core'
// Keep types loose to avoid requiring generated Prisma client at build time
export type AnyPrismaClient = any

// Minimal error mapping to keep nice messages without depending on Prisma types
function mapPrismaError(e: unknown) {
  const code = (e as { code?: string }).code
  if (code === 'P2002') {
    // unique constraint failed
    return new Error('Unique constraint failed')
  }
  return e
}

export function prismaAdapter(prisma: AnyPrismaClient): Adapter & {
  // credentials extension:
  createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }>
  getCredentialByUserId(userId: ID): Promise<{ id: ID; userId: ID; hash: string } | null>
  updateCredential(userId: ID, hash: string): Promise<void>
} {
  return {
    // Users
    async createUser(data: Partial<User>) {
      try {
        const u = await prisma.user.create({
          data: {
            email: (data as any).email ?? null,
            emailVerified: (data as any).emailVerified ?? null,
            name: (data as any).name ?? null,
            image: (data as any).image ?? null,
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
      const u = await prisma.user.findUnique({ where: { email } })
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
            accessToken: (acc as any).accessToken ?? null,
            refreshToken: (acc as any).refreshToken ?? null,
            tokenType: (acc as any).tokenType ?? null,
            scope: (acc as any).scope ?? null,
            expiresAt: (acc as any).expiresAt ?? null,
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
          expiresAt: (s as any).expiresAt,
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
          tokenHash: (v as any).tokenHash ?? (v as any).token,
          expiresAt: v.expiresAt,
        },
      })
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: (v as any).token ?? '***',
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: vt.consumedAt ?? null,
      } as unknown as VerificationToken
    },
    async useVerificationToken(identifier: string, tokenHashOrToken: string) {
      const vt = await prisma.verificationToken.findUnique({
        where: { identifier_tokenHash: { identifier, tokenHash: tokenHashOrToken } },
      })
      if (!vt) return null
      await prisma.verificationToken.delete({
        where: { identifier_tokenHash: { identifier, tokenHash: tokenHashOrToken } },
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
          actorId: (event as any).actorId ?? null,
          ip: (event as any).ip ?? null,
          ua: (event as any).ua ?? null,
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
      return c ? { id: c.id as ID, userId: c.userId as ID, hash: c.hash } : null
    },
    async updateCredential(userId: ID, hash: string) {
      await prisma.credential.update({ where: { userId }, data: { hash } })
    },
  }
}

export { prismaAdapter as PrismaAdapter }
