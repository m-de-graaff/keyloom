import type { Adapter } from '../../adapter'
import { ERR, KeyloomError } from '../../errors'
import type { Account, ID, Session, User, VerificationToken } from '../../types'
import { newId } from '../../util/ids'
import { now } from '../../util/time'
import { type MemoryStore, newStore } from './store'

export function memoryAdapter(init?: { store?: MemoryStore }): Adapter & {
  __store: MemoryStore
} & {
  createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }>
  getCredentialByUserId(userId: ID): Promise<{ id: ID; userId: ID; hash: string } | null>
  updateCredential(userId: ID, hash: string): Promise<void>
} {
  const store = init?.store ?? newStore()

  return {
    __store: store,

    // Users
    async createUser(data) {
      if (data.email && store.byEmail.has(data.email)) throw new KeyloomError(ERR.EMAIL_EXISTS)
      const id = data.id ?? newId()
      const nowDt = now()
      const u: User = {
        id,
        email: data.email ?? null,
        emailVerified: data.emailVerified ?? null,
        name: data.name ?? null,
        image: data.image ?? null,
        createdAt: nowDt,
        updatedAt: nowDt,
      }
      store.users.set(id, u)
      if (u.email) store.byEmail.set(u.email, id)
      return u
    },

    async getUser(id) {
      return store.users.get(id) ?? null
    },

    async getUserByEmail(email) {
      const id = store.byEmail.get(email)
      return id ? (store.users.get(id) ?? null) : null
    },

    async updateUser(id, data) {
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
    async linkAccount(acc) {
      const key = `${acc.provider}:${acc.providerAccountId}`
      if (store.byProvider.has(key)) throw new KeyloomError(ERR.ACCOUNT_LINKED)
      const id = acc.id ?? newId()
      const a: Account = { ...acc, id }
      store.accounts.set(id, a)
      store.byProvider.set(key, id)
      return a
    },
    async getAccountByProvider(provider, providerAccountId) {
      const id = store.byProvider.get(`${provider}:${providerAccountId}`)
      return id ? (store.accounts.get(id) ?? null) : null
    },

    // Sessions
    async createSession(s) {
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
    async getSession(id) {
      return store.sessions.get(id) ?? null
    },
    async deleteSession(id) {
      store.sessions.delete(id)
    },

    // Tokens
    async createVerificationToken(v) {
      const id = newId()
      const vt: VerificationToken = { ...v, id }
      // Phase 1: store token as plain (tests), Phase 2 will hash
      store.tokens.set(`${v.identifier}:${v.token}`, vt)
      return vt
    },
    async useVerificationToken(identifier, token) {
      const key = `${identifier}:${token}`
      const vt = store.tokens.get(key) ?? null
      if (!vt) return null
      store.tokens.delete(key) // single-use
      return vt
    },

    // Audit
    async appendAudit(event) {
      store.audit.push({ ...event, id: newId(), at: now() })
    },

    // Credentials
    async createCredential(userId, hash) {
      if (store.credByUserId.has(userId))
        throw new KeyloomError('CREDENTIAL_EXISTS', 'Credentials already exist')
      const id = newId()
      const rec = { id, userId, hash }
      store.credentials.set(id, rec)
      store.credByUserId.set(userId, id)
      return { id, userId }
    },
    async getCredentialByUserId(userId) {
      const id = store.credByUserId.get(userId)
      return id ? (store.credentials.get(id) ?? null) : null
    },
    async updateCredential(userId, hash) {
      const id = store.credByUserId.get(userId)
      if (!id) throw new KeyloomError('CREDENTIAL_NOT_FOUND', 'No credentials for user')
      const prev = store.credentials.get(id)
      if (!prev) throw new KeyloomError('CREDENTIAL_NOT_FOUND', 'No credentials for user')
      store.credentials.set(id, { ...prev, hash })
    },
  }
}
