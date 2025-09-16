import type {
  Account,
  Adapter,
  AuditEvent,
  ID,
  Session,
  User,
  VerificationToken,
} from '@keyloom/core'
// Note: We intentionally avoid tight coupling to Prisma types to keep this package buildable without a generated client
// If you have @prisma/client installed, your app will get proper intellisense
import { mapPrismaError } from './errors'

type AnyPrismaClient = any
import type { RbacAdapter } from '@keyloom/core'
import { rbacAdapter } from './rbac'

export default function prismaAdapter(prisma: AnyPrismaClient): Adapter & RbacAdapter & {
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
      const u = await prisma.user.findUnique({ where: { email } })
      return (u as unknown as User | null) ?? null
    },
    async updateUser(id: ID, data: Partial<User>) {
      try {
        const updateData: any = {}
        if (typeof (data as any).email !== 'undefined') updateData.email = (data as any).email
        if (typeof (data as any).emailVerified !== 'undefined') updateData.emailVerified = (data as any).emailVerified
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
  const extended = Object.assign(base, rbacAdapter(prisma))
  return extended
}


// Optional named export alias for convenience
export { prismaAdapter as PrismaAdapter }
