import { runAdapterContractTests } from '@keyloom/adapters-contracts'
import { afterAll, beforeAll, describe, vi } from 'vitest'
import { prismaAdapter } from './index'

// A minimal in-memory PrismaClient stub sufficient for contract tests
function createInMemoryPrisma() {
  let uid = 0
  const genId = (p: string) => `${p}_${++uid}`

  const now = () => new Date()
  const uniqueViolation = () => {
    const err: any = new Error('ADAPTER_UNIQUE_VIOLATION')
    err.code = 'ADAPTER_UNIQUE_VIOLATION'
    return err
  }

  const users: any[] = []
  const accounts: any[] = []
  const sessions: any[] = []
  const verificationTokens: any[] = []
  const auditLogs: any[] = []
  const organizations: any[] = []
  const memberships: any[] = []
  const invites: any[] = []
  const entitlements: any[] = []
  const refreshTokens: any[] = []

  const matchWhere = (obj: any, where: any) => {
    if (!where) return true
    // handle simple equals
    for (const k of Object.keys(where)) {
      const v = where[k]
      if (k === 'AND' && Array.isArray(v)) return v.every((c: any) => matchWhere(obj, c))
      if (k === 'OR' && Array.isArray(v)) return v.some((c: any) => matchWhere(obj, c))
      if (typeof v === 'object' && v !== null) {
        if ('lt' in v) {
          if (!(obj[k] < v.lt)) return false
        } else if ('gt' in v) {
          if (!(obj[k] > v.gt)) return false
        } else if ('not' in v) {
          if (!(obj[k] !== v.not)) return false
        } else if (k === 'userId_orgId') {
          if (!(obj.userId === v.userId && obj.orgId === v.orgId)) return false
        } else if (k === 'provider_providerAccountId') {
          if (!(obj.provider === v.provider && obj.providerAccountId === v.providerAccountId))
            return false
        } else if (k === 'identifier_tokenHash') {
          if (!(obj.identifier === v.identifier && obj.tokenHash === v.tokenHash)) return false
        } else if (k === 'orgId_tokenHash') {
          if (!(obj.orgId === v.orgId && obj.tokenHash === v.tokenHash)) return false
        } else {
          // nested not handled here
          if (!matchWhere(obj[k], v)) return false
        }
      } else if (obj[k] !== v) {
        return false
      }
    }
    return true
  }

  const prisma = {
    user: {
      create: async ({ data }: any) => {
        if (data.email && users.some((u) => u.email === data.email)) {
          throw uniqueViolation()
        }
        const row = {
          id: genId('user'),
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        users.push(row)
        return { ...row }
      },
      findUnique: async ({ where }: any) => users.find((u) => matchWhere(u, where)) ?? null,
      update: async ({ where, data }: any) => {
        const u = users.find((r) => matchWhere(r, where))
        if (!u) throw new Error('User not found')
        Object.assign(u, data, { updatedAt: new Date(Date.now() + 1) })
        return { ...u }
      },
    },
    account: {
      create: async ({ data }: any) => {
        if (
          accounts.some(
            (a) => a.provider === data.provider && a.providerAccountId === data.providerAccountId,
          )
        ) {
          throw uniqueViolation()
        }
        const row = {
          id: genId('acc'),
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        accounts.push(row)
        return row
      },
      findUnique: async ({ where }: any) => accounts.find((a) => matchWhere(a, where)) ?? null,
    },
    session: {
      create: async ({ data }: any) => {
        const row = {
          id: genId('sess'),
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        sessions.push(row)
        return row
      },
      findUnique: async ({ where }: any) => sessions.find((s) => matchWhere(s, where)) ?? null,
      delete: async ({ where }: any) => {
        const idx = sessions.findIndex((s) => matchWhere(s, where))
        if (idx >= 0) sessions.splice(idx, 1)
      },
      deleteMany: async ({ where }: any) => {
        const before = sessions.length
        for (let i = sessions.length - 1; i >= 0; i--)
          if (matchWhere(sessions[i], where)) sessions.splice(i, 1)
        return { count: before - sessions.length }
      },
    },
    verificationToken: {
      create: async ({ data }: any) => {
        if (
          verificationTokens.some(
            (t) => t.identifier === data.identifier && t.tokenHash === data.tokenHash,
          )
        ) {
          throw uniqueViolation()
        }
        const row = {
          id: genId('vt'),
          createdAt: now(),
          consumedAt: null,
          ...data,
        }
        verificationTokens.push(row)
        return row
      },
      findUnique: async ({ where }: any) =>
        verificationTokens.find((t) => matchWhere(t, where)) ?? null,
      delete: async ({ where }: any) => {
        const idx = verificationTokens.findIndex((t) => matchWhere(t, where))
        if (idx >= 0) verificationTokens.splice(idx, 1)
      },
      deleteMany: async ({ where }: any) => {
        const before = verificationTokens.length
        for (let i = verificationTokens.length - 1; i >= 0; i--)
          if (matchWhere(verificationTokens[i], where)) verificationTokens.splice(i, 1)
        return { count: before - verificationTokens.length }
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const row = { id: genId('audit'), ...data }
        auditLogs.push(row)
        return row
      },
    },
    organization: {
      create: async ({ data }: any) => {
        if (data.slug && organizations.some((o) => o.slug === data.slug)) {
          throw uniqueViolation()
        }
        const row = {
          id: genId('org'),
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        organizations.push(row)
        return { ...row }
      },
      findUnique: async ({ where }: any) => organizations.find((o) => matchWhere(o, where)) ?? null,
      findMany: async ({ where, orderBy }: any) => {
        let r = organizations.filter((o) => {
          if (!where) return true
          if (where.members?.some) {
            const { userId, status } = where.members.some
            return memberships.some(
              (m) => m.orgId === o.id && m.userId === userId && (!status || m.status === status),
            )
          }
          return matchWhere(o, where)
        })
        if (orderBy?.createdAt === 'asc') r = r.sort((a, b) => a.createdAt - b.createdAt)
        return r
      },
      update: async ({ where, data }: any) => {
        const o = organizations.find((r) => matchWhere(r, where))
        if (!o) throw new Error('Organization not found')
        Object.assign(o, data, { updatedAt: new Date(Date.now() + 1) })
        return { ...o }
      },
    },
    membership: {
      create: async ({ data }: any) => {
        if (memberships.some((m) => m.userId === data.userId && m.orgId === data.orgId)) {
          throw uniqueViolation()
        }
        const row = {
          id: genId('mem'),
          createdAt: now(),
          updatedAt: now(),
          ...data,
        }
        memberships.push(row)
        return row
      },
      findUnique: async ({ where }: any) => memberships.find((m) => matchWhere(m, where)) ?? null,
      findMany: async ({ where, include }: any) => {
        const rows = memberships.filter((m) => matchWhere(m, where))
        if (include?.user) {
          return rows.map((m) => ({
            ...m,
            user: users.find((u) => u.id === m.userId),
          }))
        }
        return rows
      },
      update: async ({ where, data }: any) => {
        const m = memberships.find((r) => matchWhere(r, where))
        if (!m) throw new Error('Membership not found')
        Object.assign(m, data, { updatedAt: now() })
        return m
      },
      delete: async ({ where }: any) => {
        const idx = memberships.findIndex((m) => matchWhere(m, where))
        if (idx >= 0) memberships.splice(idx, 1)
      },
    },
    invite: {
      create: async ({ data }: any) => {
        const row = {
          id: genId('inv'),
          createdAt: now(),
          updatedAt: now(),
          acceptedAt: null,
          ...data,
        }
        invites.push(row)
        return row
      },
      findUnique: async ({ where }: any) => invites.find((i) => matchWhere(i, where)) ?? null,
      findMany: async ({ where, orderBy }: any) => {
        let r = invites.filter((i) => matchWhere(i, where))
        if (orderBy?.createdAt === 'asc') r = r.sort((a, b) => a.createdAt - b.createdAt)
        return r
      },
      update: async ({ where, data }: any) => {
        const inv = invites.find((i) => matchWhere(i, where))
        if (!inv) throw new Error('Invite not found')
        Object.assign(inv, data)
        return inv
      },
      delete: async ({ where }: any) => {
        const idx = invites.findIndex((i) => matchWhere(i, where))
        if (idx >= 0) invites.splice(idx, 1)
      },
    },
    entitlement: {
      findUnique: async ({ where }: any) => entitlements.find((e) => matchWhere(e, where)) ?? null,
      upsert: async ({ where, update, create }: any) => {
        const existing = entitlements.find((e) => matchWhere(e, where))
        if (existing) {
          Object.assign(existing, update)
          return existing
        }
        const row = {
          id: genId('ent'),
          createdAt: now(),
          updatedAt: now(),
          ...create,
        }
        entitlements.push(row)
        return row
      },
    },
    refreshToken: {
      create: async ({ data }: any) => {
        if (refreshTokens.some((t) => t.id === data.id || t.jti === data.jti)) {
          throw uniqueViolation()
        }
        const row = {
          createdAt: now(),
          rotatedAt: null,
          revokedAt: null,
          ...data,
        }
        refreshTokens.push(row)
        return row
      },
      findUnique: async ({ where }: any) => refreshTokens.find((t) => matchWhere(t, where)) ?? null,
      findFirst: async ({ where }: any) => refreshTokens.find((t) => matchWhere(t, where)) ?? null,
      findMany: async ({ where, orderBy }: any) => {
        let r = refreshTokens.filter((t) => matchWhere(t, where))
        if (orderBy?.createdAt === 'asc') r = r.sort((a, b) => a.createdAt - b.createdAt)
        return r
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0
        for (const t of refreshTokens)
          if (matchWhere(t, where)) {
            Object.assign(t, data)
            count++
          }
        return { count }
      },
      deleteMany: async ({ where }: any) => {
        const before = refreshTokens.length
        for (let i = refreshTokens.length - 1; i >= 0; i--)
          if (matchWhere(refreshTokens[i], where)) refreshTokens.splice(i, 1)
        return { count: before - refreshTokens.length }
      },
      count: async ({ where }: any = {}) =>
        refreshTokens.filter((t) => matchWhere(t, where)).length,
    },
    $transaction: async (ops: any) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops)
      }
      if (typeof ops === 'function') return ops(prisma)
    },
    $queryRaw: async () => [{ '1': 1 }],
    $disconnect: async () => {},
  }

  return prisma
}

describe('Prisma Adapter Contract Tests', () => {
  beforeAll(() => {
    // ensure clean state if needed
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  runAdapterContractTests(() => prismaAdapter(createInMemoryPrisma()))
})
