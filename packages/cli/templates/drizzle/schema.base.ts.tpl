import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdateFn(() => new Date()),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

