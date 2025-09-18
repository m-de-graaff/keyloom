import type { Adapter } from '../../adapter'
import { tokenHash } from '../../crypto/token-hash'
import { ERR, KeyloomError } from '../../errors'
import type { RbacAdapter } from '../../rbac/types'
import type { Account, AuditEvent, ID, Session, User, VerificationToken } from '../../types'
import { newId } from '../../util/ids'
import { now } from '../../util/time'
import { memoryRbac } from './rbac'
import { type MemoryStore, newStore } from './store'

export function memoryAdapter(init?: { store?: MemoryStore; tokenSecret?: string }): Adapter & {
  __store: MemoryStore
} & {
  createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }>
  getCredentialByUserId(userId: ID): Promise<{ id: ID; userId: ID; hash: string } | null>
  updateCredential(userId: ID, hash: string): Promise<void>
} & RbacAdapter {
  const store = init?.store ?? newStore()
  const TOKEN_SECRET =
    init?.tokenSecret ?? process.env.AUTH_SECRET ?? 'dev-secret-change-in-production'

  return Object.assign(
    {
      __store: store,

      // Users
      async createUser(data: Partial<User>): Promise<User> {
        if (data.email && store.byEmail.has(data.email)) throw new KeyloomError(ERR.EMAIL_EXISTS)
        const id = (data.id as ID | undefined) ?? newId()
        const nowDt = now()
        const u: User = {
          id,
          email: (data.email ?? null) as string | null,
          emailVerified: (data.emailVerified ?? null) as Date | null,
          name: (data.name ?? null) as string | null,
          image: (data.image ?? null) as string | null,
          createdAt: nowDt,
          updatedAt: nowDt,
        }
        store.users.set(id, u)
        if (u.email) store.byEmail.set(u.email, id)
        return u
      },

      async getUser(id: ID): Promise<User | null> {
        return store.users.get(id) ?? null
      },

      async getUserByEmail(email: string): Promise<User | null> {
        const id = store.byEmail.get(email)
        return id ? (store.users.get(id) ?? null) : null
      },

      async updateUser(id: ID, data: Partial<User>): Promise<User> {
        const u = store.users.get(id)
        if (!u) throw new KeyloomError(ERR.USER_NOT_FOUND)
        const updated: User = { ...u, ...data, updatedAt: now() }
        if (u.email !== updated.email) {
          if (updated.email && store.byEmail.has(updated.email))
            throw new KeyloomError(ERR.EMAIL_EXISTS)
          if (u.email) store.byEmail.delete(u.email)
          if (updated.email) store.byEmail.set(updated.email, id)
        }
        store.users.set(id, updated)
        return updated
      },

      // Accounts
      async linkAccount(acc: Account): Promise<Account> {
        const key = `${acc.provider}:${acc.providerAccountId}`
        if (store.byProvider.has(key)) throw new KeyloomError(ERR.ACCOUNT_LINKED)
        const id = (acc.id as ID | undefined) ?? newId()
        const a: Account = { ...acc, id }
        store.accounts.set(id, a)
        store.byProvider.set(key, id)
        return a
      },
      async getAccountByProvider(
        provider: string,
        providerAccountId: string,
      ): Promise<Account | null> {
        const id = store.byProvider.get(`${provider}:${providerAccountId}`)
        return id ? (store.accounts.get(id) ?? null) : null
      },

      // Sessions
      async createSession(s: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
        const id = newId()
        const nowDt = now()
        const sess: Session = {
          id,
          userId: s.userId,
          expiresAt: s.expiresAt,
          createdAt: nowDt,
          updatedAt: nowDt,
        }
        store.sessions.set(id, sess)
        return sess
      },
      async getSession(id: ID): Promise<Session | null> {
        return store.sessions.get(id) ?? null
      },
      async deleteSession(id: ID): Promise<void> {
        store.sessions.delete(id)
      },

      // Tokens
      async createVerificationToken(
        v: Omit<VerificationToken, 'id' | 'createdAt' | 'consumedAt'>,
      ): Promise<VerificationToken> {
        const id = newId()
        const vt: VerificationToken = { ...v, id }
        // Hash at rest using provided or env secret
        const hash = await tokenHash(v.token, TOKEN_SECRET)
        const stored: VerificationToken = { ...vt, token: hash }
        store.tokens.set(`${v.identifier}:${hash}`, stored)
        return vt
      },
      async useVerificationToken(
        identifier: string,
        token: string,
      ): Promise<VerificationToken | null> {
        const hash = await tokenHash(token, TOKEN_SECRET)
        const key = `${identifier}:${hash}`
        const vt = store.tokens.get(key) ?? null
        if (!vt) return null
        store.tokens.delete(key) // single-use
        // Return with plaintext token for caller convenience
        return { ...vt, token }
      },

      // Audit
      async appendAudit(event: AuditEvent): Promise<void> {
        store.audit.push({ ...event, id: newId(), at: now() })
      },

      // Credentials
      async createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }> {
        if (store.credByUserId.has(userId))
          throw new KeyloomError('CREDENTIAL_EXISTS', 'Credentials already exist')
        const id = newId()
        const rec = { id, userId, hash }
        store.credentials.set(id, rec)
        store.credByUserId.set(userId, id)
        return { id, userId }
      },
      async getCredentialByUserId(
        userId: ID,
      ): Promise<{ id: ID; userId: ID; hash: string } | null> {
        const id = store.credByUserId.get(userId)
        return id ? (store.credentials.get(id) ?? null) : null
      },
      async updateCredential(userId: ID, hash: string): Promise<void> {
        const id = store.credByUserId.get(userId)
        if (!id) throw new KeyloomError('CREDENTIAL_NOT_FOUND', 'No credentials for user')
        const prev = store.credentials.get(id)
        if (!prev) throw new KeyloomError('CREDENTIAL_NOT_FOUND', 'No credentials for user')
        store.credentials.set(id, { ...prev, hash })
      },
    },
    memoryRbac(store),
  )
}
