import type { Account, ID, Session, User, VerificationToken } from '../../types'

export type MemoryStore = {
  users: Map<ID, User>
  accounts: Map<ID, Account>
  sessions: Map<ID, Session>
  tokens: Map<string, VerificationToken> // key: `${identifier}:${tokenHashOrPlain}`
  audit: Array<{
    id: ID
    type: string
    userId?: ID | null
    actorId?: ID | null
    ip?: string | null
    ua?: string | null
    at: Date
    meta?: Record<string, unknown> | null
  }>

  // credentials
  credentials: Map<ID, { id: ID; userId: ID; hash: string }>
  credByUserId: Map<ID, ID>

  // Secondary indexes
  byEmail: Map<string, ID>
  byProvider: Map<string, ID> // `${provider}:${providerAccountId}` -> accountId
}

export function newStore(): MemoryStore {
  return {
    users: new Map(),
    accounts: new Map(),
    sessions: new Map(),
    tokens: new Map(),
    audit: [],
    credentials: new Map(),
    credByUserId: new Map(),
    byEmail: new Map(),
    byProvider: new Map(),
  }
}
