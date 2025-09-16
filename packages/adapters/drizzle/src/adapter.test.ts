import { runAdapterContractTests } from '@keyloom/adapters-contracts'
import { afterAll, beforeAll, describe, vi } from 'vitest'
import drizzleAdapter from './index'

// Mock Drizzle database for testing
const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    }),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
      }),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
      }),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    }),
  }),
  transaction: vi.fn().mockImplementation((fn) => fn(mockDb)),
}

describe('Drizzle Adapter Contract Tests - PostgreSQL', () => {
  beforeAll(() => {
    // Setup mock implementations for PostgreSQL dialect
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  // Run the contract tests
  runAdapterContractTests(() => drizzleAdapter(mockDb, { dialect: 'postgresql' }))
})

describe('Drizzle Adapter Contract Tests - MySQL', () => {
  beforeAll(() => {
    // Setup mock implementations for MySQL dialect
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  // Run the contract tests
  runAdapterContractTests(() => drizzleAdapter(mockDb, { dialect: 'mysql' }))
})

describe('Drizzle Adapter Contract Tests - SQLite', () => {
  beforeAll(() => {
    // Setup mock implementations for SQLite dialect
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  // Run the contract tests
  runAdapterContractTests(() => drizzleAdapter(mockDb, { dialect: 'sqlite' }))
})

// Additional Drizzle-specific tests
describe('Drizzle Adapter Specific Tests', () => {
  describe('Dialect-specific capabilities', () => {
    it('should have correct capabilities for PostgreSQL', () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'postgresql' })

      expect(adapter.capabilities.transactions).toBe(true)
      expect(adapter.capabilities.json).toBe(true)
      expect(adapter.capabilities.caseInsensitiveEmail).toBe('citext')
      expect(adapter.capabilities.maxIdentifierLength).toBe(63)
    })

    it('should have correct capabilities for MySQL', () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'mysql' })

      expect(adapter.capabilities.transactions).toBe(true)
      expect(adapter.capabilities.json).toBe(true)
      expect(adapter.capabilities.caseInsensitiveEmail).toBe('collation')
      expect(adapter.capabilities.maxIdentifierLength).toBe(191)
    })

    it('should have correct capabilities for SQLite', () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'sqlite' })

      expect(adapter.capabilities.transactions).toBe(true)
      expect(adapter.capabilities.json).toBe('limited')
      expect(adapter.capabilities.caseInsensitiveEmail).toBe('app-normalize')
      expect(adapter.capabilities.maxIdentifierLength).toBeUndefined()
    })
  })

  describe('Error mapping', () => {
    it('should map PostgreSQL unique constraint errors', async () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'postgresql' })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue({ code: '23505' }),
        }),
      })

      await expect(adapter.createUser({ email: 'test@example.com' })).rejects.toThrow()
    })

    it('should map MySQL duplicate entry errors', async () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'mysql' })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue({ errno: 1062 }),
        }),
      })

      await expect(adapter.createUser({ email: 'test@example.com' })).rejects.toThrow()
    })

    it('should map SQLite unique constraint errors', async () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'sqlite' })

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue({
            message: 'UNIQUE constraint failed: User.email',
          }),
        }),
      })

      await expect(adapter.createUser({ email: 'test@example.com' })).rejects.toThrow()
    })
  })

  describe('Transaction support', () => {
    it('should use transactions for invite acceptance', async () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'postgresql' })

      await adapter.acceptInvite('org-id', 'token-hash', 'user-id')

      expect(mockDb.transaction).toHaveBeenCalled()
    })

    it('should use transactions for refresh token rotation', async () => {
      const adapter = drizzleAdapter(mockDb, { dialect: 'postgresql' })

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

      await adapter.createChild(parent, child)

      expect(mockDb.transaction).toHaveBeenCalled()
    })
  })
})
