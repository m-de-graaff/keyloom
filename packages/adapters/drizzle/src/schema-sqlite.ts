/**
 * SQLite schema for Keyloom authentication
 */

import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// SQLite Schema - uses TEXT for most fields
export const users = sqliteTable(
  'User',
  {
    id: text('id').primaryKey(),
    email: text('email').unique(),
    emailVerified: integer('emailVerified', { mode: 'timestamp' }),
    name: text('name'),
    image: text('image'),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    emailIdx: index('User_email_idx').on(table.email),
  }),
)

export const accounts = sqliteTable(
  'Account',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    providerIdx: uniqueIndex('Account_provider_providerAccountId_key').on(
      table.provider,
      table.providerAccountId,
    ),
    userIdx: index('Account_userId_idx').on(table.userId),
  }),
)

export const sessions = sqliteTable(
  'Session',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdx: index('Session_userId_idx').on(table.userId),
    expiresIdx: index('Session_expiresAt_idx').on(table.expiresAt),
  }),
)

export const verificationTokens = sqliteTable(
  'VerificationToken',
  {
    identifier: text('identifier').notNull(),
    tokenHash: text('tokenHash').notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.tokenHash] }),
    expiresIdx: index('VerificationToken_expiresAt_idx').on(table.expiresAt),
  }),
)

export const auditEvents = sqliteTable(
  'AuditEvent',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
    ip: text('ip'),
    userAgent: text('userAgent'),
    timestamp: integer('timestamp', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    metadata: text('metadata'), // JSON stored as TEXT in SQLite
  },
  (table) => ({
    typeIdx: index('AuditEvent_type_idx').on(table.type),
    userIdx: index('AuditEvent_userId_idx').on(table.userId),
    timestampIdx: index('AuditEvent_timestamp_idx').on(table.timestamp),
  }),
)

// RBAC Tables
export const organizations = sqliteTable(
  'Organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugIdx: index('Organization_slug_idx').on(table.slug),
  }),
)

export const memberships = sqliteTable(
  'Membership',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: text('orgId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updatedAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userOrgIdx: uniqueIndex('Membership_userId_orgId_key').on(table.userId, table.orgId),
    orgIdx: index('Membership_orgId_idx').on(table.orgId),
  }),
)

export const invites = sqliteTable(
  'Invite',
  {
    id: text('id').primaryKey(),
    orgId: text('orgId')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull(),
    tokenHash: text('tokenHash').notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    acceptedAt: integer('acceptedAt', { mode: 'timestamp' }),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    orgTokenIdx: uniqueIndex('Invite_orgId_tokenHash_key').on(table.orgId, table.tokenHash),
    emailIdx: index('Invite_email_idx').on(table.email),
    expiresIdx: index('Invite_expiresAt_idx').on(table.expiresAt),
  }),
)

export const entitlements = sqliteTable('Entitlement', {
  id: text('id').primaryKey(),
  orgId: text('orgId')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  plan: text('plan'),
  seats: integer('seats'),
  features: text('features'), // JSON stored as TEXT
  limits: text('limits'), // JSON stored as TEXT
  validUntil: integer('validUntil', { mode: 'timestamp' }),
  createdAt: integer('createdAt', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

// JWT Refresh Tokens
export const refreshTokens = sqliteTable(
  'RefreshToken',
  {
    id: text('id').primaryKey(),
    familyId: text('familyId').notNull(),
    jti: text('jti').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: text('sessionId').references(() => sessions.id, { onDelete: 'set null' }),
    tokenHash: text('tokenHash').notNull().unique(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    rotatedAt: integer('rotatedAt', { mode: 'timestamp' }),
    revokedAt: integer('revokedAt', { mode: 'timestamp' }),
    parentJti: text('parentJti'),
    ip: text('ip'),
    userAgent: text('userAgent'),
    createdAt: integer('createdAt', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    familyIdx: index('RefreshToken_familyId_idx').on(table.familyId),
    userIdx: index('RefreshToken_userId_idx').on(table.userId),
    expiresIdx: index('RefreshToken_expiresAt_idx').on(table.expiresAt),
    tokenHashIdx: index('RefreshToken_tokenHash_idx').on(table.tokenHash),
  }),
)

// Export schema types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type VerificationToken = typeof verificationTokens.$inferSelect
export type NewVerificationToken = typeof verificationTokens.$inferInsert
export type AuditEvent = typeof auditEvents.$inferSelect
export type NewAuditEvent = typeof auditEvents.$inferInsert
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
export type Invite = typeof invites.$inferSelect
export type NewInvite = typeof invites.$inferInsert
export type Entitlement = typeof entitlements.$inferSelect
export type NewEntitlement = typeof entitlements.$inferInsert
export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
