import type { Account, AuditEvent, ID, Session, User, VerificationToken } from './types'

export interface Adapter {
  // Users
  createUser(data: Partial<User>): Promise<User>
  getUser(id: ID): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  updateUser(id: ID, data: Partial<User>): Promise<User>

  // Accounts (OAuth)
  linkAccount(acc: Account): Promise<Account>
  getAccountByProvider(provider: string, providerAccountId: string): Promise<Account | null>

  // Sessions
  createSession(s: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session>
  getSession(id: ID): Promise<Session | null>
  deleteSession(id: ID): Promise<void>

  // Tokens (email verify, password reset)
  createVerificationToken(
    v: Omit<VerificationToken, 'id' | 'createdAt' | 'consumedAt'>,
  ): Promise<VerificationToken>
  useVerificationToken(identifier: string, token: string): Promise<VerificationToken | null>

  // Audit
  appendAudit(event: AuditEvent): Promise<void>
}

// Note: We intentionally accept Partial for createUser/updateUser so adapters can set defaults (ids/timestamps).
// Adapters must enforce unique email and unique (provider, providerAccountId) with consistent errors (map DB errors to KeyloomError codes).
