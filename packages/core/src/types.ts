export type ISODateString = string // validated where needed

export type ID = string // opaque id (nanoid/uuid); do not assume format

export type User = {
  id: ID
  email: string | null
  emailVerified?: Date | null
  name?: string | null
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

export type Account = {
  id: ID
  userId: ID
  provider: string // e.g., 'github'
  providerAccountId: string // provider user id
  accessToken?: string | null
  refreshToken?: string | null
  tokenType?: string | null
  expiresAt?: number | null // epoch seconds
  scope?: string | null
}

export type Session = {
  id: ID
  userId: ID
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  // room for deviceId, ip, userAgent in Phase 2
}

export type VerificationToken = {
  id: ID
  identifier: string // email or opaque id for password reset
  token: string // stored as hash (Phase 2), plaintext only for return
  expiresAt: Date
  createdAt?: Date
  consumedAt?: Date | null
}

export type AuthKey = {
  id: ID
  userId: ID
  type: 'webauthn' | 'totp'
  publicKey?: string // COSE for webauthn (Phase 8)
  counter?: number
  label?: string
  createdAt: Date
}

export type AuditEvent = {
  id?: ID
  type: string // see audit/events.ts
  userId?: ID
  actorId?: ID // admin/service actor
  ip?: string
  ua?: string
  at: Date
  meta?: Record<string, unknown>
}

// Alias for external naming consistency
export type AuditLog = AuditEvent

export type KeyloomConfig = {
  adapter: unknown // Adapter factory or instance
  cookie?: {
    sameSite?: 'lax' | 'strict' | 'none'
    domain?: string
    maxAgeSec?: number
  }
  session?: {
    strategy?: 'database' | 'jwt'
    ttlMinutes?: number
    rolling?: boolean
  }
  jwt?: {
    issuer?: string
    audience?: string | string[]
    accessTTL?: string // e.g., '10m', '15m'
    refreshTTL?: string // e.g., '30d', '7d'
    algorithm?: 'EdDSA' | 'ES256'
    clockSkewSec?: number
    includeOrgRoleInAccess?: boolean
    jwksPath?: string
    keyRotationDays?: number
    keyOverlapDays?: number
  }
  rbac?: RbacConfig
  secrets?: {
    authSecret?: string
    jwtSecret?: string
  }
  baseUrl?: string
}

// RBAC configuration (supports legacy flat and new structured mapping)
export type RbacRolePermissions = {
  permissions: string[]
}
export type RbacRolesMapping = Record<string, RbacRolePermissions>
export type RbacConfig = {
  enabled?: boolean // when false, org/role checks are skipped by guards/middleware
  /**
   * Roles declaration.
   * - Legacy flat: string[]
   * - Structured mapping: Record<role, { permissions: string[] }>
   */
  roles?: string[] | RbacRolesMapping
  /** Legacy flat permissions list (no mapping). Maintained for backward compatibility */
  permissions?: string[]
}
