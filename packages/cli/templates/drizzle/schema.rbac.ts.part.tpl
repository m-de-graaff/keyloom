import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const memberships = pgTable('memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  orgId: text('org_id').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const entitlements = pgTable('entitlements', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  plan: text('plan').notNull(),
  seats: text('seats').notNull(),
  limits: jsonb('limits').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

