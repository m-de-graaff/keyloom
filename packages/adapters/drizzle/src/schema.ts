/**
 * Drizzle schema for Keyloom authentication
 *
 * This is the PostgreSQL schema. For other databases, see:
 * - MySQL: schema-mysql.ts
 * - SQLite: schema-sqlite.ts
 */

import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  json,
  index,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/pg-core'

// PostgreSQL Schema (default export)
export const users = pgTable('User', {
  id: varchar('id', { length: 191 }).primaryKey(),
  email: varchar('email', { length: 191 }).unique(),
  emailVerified: timestamp('emailVerified'),
  name: varchar('name', { length: 191 }),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('User_email_idx').on(table.email),
}))

export const accounts = pgTable('Account', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('userId', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 191 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 191 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 191 }),
  scope: varchar('scope', { length: 191 }),
  idToken: text('id_token'),
  sessionState: varchar('session_state', { length: 191 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  providerIdx: uniqueIndex('Account_provider_providerAccountId_key').on(table.provider, table.providerAccountId),
  userIdx: index('Account_userId_idx').on(table.userId),
}))

export const sessions = pgTable('Session', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('userId', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('Session_userId_idx').on(table.userId),
  expiresIdx: index('Session_expiresAt_idx').on(table.expiresAt),
}))

export const verificationTokens = pgTable('VerificationToken', {
  identifier: varchar('identifier', { length: 191 }).notNull(),
  tokenHash: varchar('tokenHash', { length: 191 }).notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.tokenHash] }),
  expiresIdx: index('VerificationToken_expiresAt_idx').on(table.expiresAt),
}))

export const auditEvents = pgTable('AuditEvent', {
  id: varchar('id', { length: 191 }).primaryKey(),
  type: varchar('type', { length: 191 }).notNull(),
  userId: varchar('userId', { length: 191 }).references(() => users.id, { onDelete: 'set null' }),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('userAgent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: json('metadata'),
}, (table) => ({
  typeIdx: index('AuditEvent_type_idx').on(table.type),
  userIdx: index('AuditEvent_userId_idx').on(table.userId),
  timestampIdx: index('AuditEvent_timestamp_idx').on(table.timestamp),
}))

// RBAC Tables
export const organizations = pgTable('Organization', {
  id: varchar('id', { length: 191 }).primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  slug: varchar('slug', { length: 191 }).unique(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('Organization_slug_idx').on(table.slug),
}))

export const memberships = pgTable('Membership', {
  id: varchar('id', { length: 191 }).primaryKey(),
  userId: varchar('userId', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: varchar('orgId', { length: 191 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 191 }).notNull(),
  status: varchar('status', { length: 191 }).notNull().default('active'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('Membership_userId_orgId_key').on(table.userId, table.orgId),
  orgIdx: index('Membership_orgId_idx').on(table.orgId),
}))

export const invites = pgTable('Invite', {
  id: varchar('id', { length: 191 }).primaryKey(),
  orgId: varchar('orgId', { length: 191 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 191 }).notNull(),
  role: varchar('role', { length: 191 }).notNull(),
  tokenHash: varchar('tokenHash', { length: 191 }).notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  acceptedAt: timestamp('acceptedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  orgTokenIdx: uniqueIndex('Invite_orgId_tokenHash_key').on(table.orgId, table.tokenHash),
  emailIdx: index('Invite_email_idx').on(table.email),
  expiresIdx: index('Invite_expiresAt_idx').on(table.expiresAt),
}))

export const entitlements = pgTable('Entitlement', {
  id: varchar('id', { length: 191 }).primaryKey(),
  orgId: varchar('orgId', { length: 191 }).notNull().unique().references(() => organizations.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 191 }),
  seats: integer('seats'),
  features: json('features'),
  limits: json('limits'),
  validUntil: timestamp('validUntil'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
})

// JWT Refresh Tokens
export const refreshTokens = pgTable('RefreshToken', {
  id: varchar('id', { length: 191 }).primaryKey(),
  familyId: varchar('familyId', { length: 191 }).notNull(),
  jti: varchar('jti', { length: 191 }).notNull().unique(),
  userId: varchar('userId', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('sessionId', { length: 191 }).references(() => sessions.id, { onDelete: 'set null' }),
  tokenHash: varchar('tokenHash', { length: 191 }).notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  rotatedAt: timestamp('rotatedAt'),
  revokedAt: timestamp('revokedAt'),
  parentJti: varchar('parentJti', { length: 191 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  familyIdx: index('RefreshToken_familyId_idx').on(table.familyId),
  userIdx: index('RefreshToken_userId_idx').on(table.userId),
  expiresIdx: index('RefreshToken_expiresAt_idx').on(table.expiresAt),
  tokenHashIdx: index('RefreshToken_tokenHash_idx').on(table.tokenHash),
}))

// Export schema type for type inference
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
