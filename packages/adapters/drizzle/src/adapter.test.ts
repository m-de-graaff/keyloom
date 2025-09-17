import { runAdapterContractTests } from '@keyloom/adapters-contracts'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createInMemoryDrizzle } from '../tests/inmemory-db'
import drizzleAdapter from './index'
import * as schema from './schema'

// Drizzle Adapter Contract Tests across dialects using in-memory harness

describe('Drizzle Adapter Contract Tests - PostgreSQL', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  runAdapterContractTests(() =>
    drizzleAdapter(createInMemoryDrizzle(schema), { dialect: 'postgresql' }),
  )
})

describe('Drizzle Adapter Contract Tests - MySQL', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  runAdapterContractTests(() => drizzleAdapter(createInMemoryDrizzle(schema), { dialect: 'mysql' }))
})

describe('Drizzle Adapter Contract Tests - SQLite', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  runAdapterContractTests(() =>
    drizzleAdapter(createInMemoryDrizzle(schema), { dialect: 'sqlite' }),
  )
})

// Additional Drizzle-specific tests

describe('Drizzle Adapter Specific Tests', () => {
  describe('Dialect-specific capabilities', () => {
    it('should have correct capabilities for PostgreSQL', () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'postgresql',
      })
      expect(adapter.capabilities.transactions).toBe(true)
      expect(adapter.capabilities.json).toBe(true)
      expect(adapter.capabilities.caseInsensitiveEmail).toBe('citext')
      expect(adapter.capabilities.maxIdentifierLength).toBe(63)
    })

    it('should have correct capabilities for MySQL', () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'mysql',
      })
      expect(adapter.capabilities.transactions).toBe(true)
      expect(adapter.capabilities.json).toBe(true)
      expect(adapter.capabilities.caseInsensitiveEmail).toBe('collation')
      expect(adapter.capabilities.maxIdentifierLength).toBe(191)
    })

    it('should have correct capabilities for SQLite', () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'sqlite',
      })
      expect(adapter.capabilities.transactions).toBe(true)
      expect(adapter.capabilities.json).toBe('limited')
      expect(adapter.capabilities.caseInsensitiveEmail).toBe('app-normalize')
      expect(adapter.capabilities.maxIdentifierLength).toBeUndefined()
    })
  })

  describe('Error mapping', () => {
    it('should surface a duplicate user error (PostgreSQL)', async () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'postgresql',
      })
      await adapter.createUser({ email: 'dupe@example.com' })
      await expect(adapter.createUser({ email: 'dupe@example.com' })).rejects.toThrow()
    })

    it('should surface a duplicate user error (MySQL)', async () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'mysql',
      })
      await adapter.createUser({ email: 'dupe@example.com' })
      await expect(adapter.createUser({ email: 'dupe@example.com' })).rejects.toThrow()
    })

    it('should surface a duplicate user error (SQLite)', async () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'sqlite',
      })
      await adapter.createUser({ email: 'dupe@example.com' })
      await expect(adapter.createUser({ email: 'dupe@example.com' })).rejects.toThrow()
    })
  })

  describe('Transaction support (smoke)', () => {
    it('invite acceptance runs without error', async () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'postgresql',
      })
      await expect(
        (adapter as any).acceptInvite('org-id', 'token-hash', 'user-id'),
      ).resolves.toBeUndefined()
    })

    it('in-memory harness sanity: select after insert works', async () => {
      const db = createInMemoryDrizzle(schema)
      await db.insert(schema.users).values({
        id: 'u_test',
        email: 'x@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const rowsNoWhere = await db.select().from(schema.users).limit(1)
      expect(rowsNoWhere.length).toBe(1)
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'u_test'))
        .limit(1)
      expect(rows.length).toBe(1)
      expect(rows[0].id).toBe('u_test')
    })

    it('refresh token rotation runs without error', async () => {
      const adapter = drizzleAdapter(createInMemoryDrizzle(schema), {
        dialect: 'postgresql',
      })
      const parent = {
        familyId: 'family-id',
        jti: 'parent-jti',
        userId: 'user-id',
        sessionId: null,
        tokenHash: 'parent-hash',
        expiresAt: new Date(),
        parentJti: null,
        ip: null,
        userAgent: null,
      }
      const child = {
        familyId: 'family-id',
        jti: 'child-jti',
        userId: 'user-id',
        sessionId: null,
        tokenHash: 'child-hash',
        expiresAt: new Date(),
        parentJti: 'parent-jti',
        ip: null,
        userAgent: null,
      }
      await expect((adapter as any).createChild(parent, child)).resolves.toBeUndefined()
    })
  })
})
