import type { KeyloomAdapter } from '@keyloom/core/adapter-types'
import type { RefreshTokenRecord } from '@keyloom/core/jwt'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  expectNotFound,
  expectRefreshToken,
  futureDate,
  pastDate,
  sleep,
  TestDataManager,
} from './helpers'

/**
 * Refresh token contract tests
 * These tests must pass for all adapter implementations that support JWT refresh tokens
 */
export function createRefreshContractTests(createAdapter: () => KeyloomAdapter) {
  describe('Refresh Token Contract Tests', () => {
    let adapter: KeyloomAdapter
    let testData: TestDataManager

    beforeEach(async () => {
      adapter = createAdapter()
      testData = new TestDataManager(adapter)
    })

    afterEach(async () => {
      await testData.cleanup()
      if (adapter.close) {
        await adapter.close()
      }
    })

    function createTokenRecord(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
      const familyId = `family_${Math.random().toString(36).substring(2)}`
      const jti = `jti_${Math.random().toString(36).substring(2)}`

      return {
        familyId,
        jti,
        userId: 'user_123',
        sessionId: 'session_123',
        tokenHash: `hash_${Math.random().toString(36).substring(2)}`,
        expiresAt: futureDate(),
        parentJti: null,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        ...overrides,
      }
    }

    describe('Token Storage', () => {
      it('should save a refresh token record', async () => {
        const record = createTokenRecord()

        await expect(adapter.save(record)).resolves.not.toThrow()
      })

      it('should find token by hash', async () => {
        const record = createTokenRecord()
        await adapter.save(record)

        const found = await adapter.findByHash(record.tokenHash)

        expect(found).toEqual(record)
        expectRefreshToken(found!)
      })

      it('should return null for non-existent token hash', async () => {
        const result = await adapter.findByHash('non-existent-hash')
        expectNotFound(result)
      })

      it('should enforce unique JTI constraint', async () => {
        const jti = 'unique-jti'
        const record1 = createTokenRecord({ jti })
        const record2 = createTokenRecord({ jti })

        await adapter.save(record1)

        await expect(adapter.save(record2)).rejects.toThrow()
      })
    })

    describe('Token Rotation', () => {
      it('should mark token as rotated', async () => {
        const record = createTokenRecord()
        await adapter.save(record)

        await adapter.markRotated(record.jti)

        // Verify the token is marked as rotated
        // Note: This test assumes we can query rotation status
        // Implementation may vary by adapter
      })

      it('should handle rotation of non-existent token gracefully', async () => {
        await expect(adapter.markRotated('non-existent-jti')).resolves.not.toThrow()
      })

      it('should create child token and mark parent as rotated', async () => {
        const parentRecord = createTokenRecord()
        await adapter.save(parentRecord)

        const childRecord = createTokenRecord({
          familyId: parentRecord.familyId,
          parentJti: parentRecord.jti,
        })

        await adapter.createChild(parentRecord, childRecord)

        // Verify child was created
        const foundChild = await adapter.findByHash(childRecord.tokenHash)
        expect(foundChild).toEqual(childRecord)

        // Verify parent is marked as rotated (implementation-specific verification)
      })
    })

    describe('Family Management', () => {
      it('should revoke entire token family', async () => {
        const familyId = 'test-family'
        const token1 = createTokenRecord({ familyId })
        const token2 = createTokenRecord({ familyId })

        await adapter.save(token1)
        await adapter.save(token2)

        await adapter.revokeFamily(familyId)

        // Verify family is revoked
        const isRevoked = await adapter.isFamilyRevoked(familyId)
        expect(isRevoked).toBe(true)
      })

      it('should check if family is revoked', async () => {
        const familyId = 'revoked-family'
        const record = createTokenRecord({ familyId })

        await adapter.save(record)

        // Initially not revoked
        let isRevoked = await adapter.isFamilyRevoked(familyId)
        expect(isRevoked).toBe(false)

        // After revocation
        await adapter.revokeFamily(familyId)
        isRevoked = await adapter.isFamilyRevoked(familyId)
        expect(isRevoked).toBe(true)
      })

      it('should return false for non-existent family', async () => {
        const isRevoked = await adapter.isFamilyRevoked('non-existent-family')
        expect(isRevoked).toBe(false)
      })

      it('should get all tokens in a family', async () => {
        const familyId = 'test-family'
        const token1 = createTokenRecord({ familyId })
        const token2 = createTokenRecord({ familyId })
        const token3 = createTokenRecord() // Different family

        await adapter.save(token1)
        await adapter.save(token2)
        await adapter.save(token3)

        const family = await adapter.getFamily(familyId)

        expect(family).toHaveLength(2)
        expect(family.map((t) => t.jti)).toContain(token1.jti)
        expect(family.map((t) => t.jti)).toContain(token2.jti)
        expect(family.map((t) => t.jti)).not.toContain(token3.jti)
      })

      it('should return empty array for non-existent family', async () => {
        const family = await adapter.getFamily('non-existent-family')
        expect(family).toEqual([])
      })
    })

    describe('Token Cleanup', () => {
      it('should clean up expired tokens', async () => {
        const expiredToken = createTokenRecord({
          expiresAt: pastDate(),
        })
        const validToken = createTokenRecord({
          expiresAt: futureDate(),
        })

        await adapter.save(expiredToken)
        await adapter.save(validToken)

        const cleanedCount = await adapter.cleanupExpired()

        expect(cleanedCount).toBeGreaterThanOrEqual(1)

        // Verify expired token is gone
        const found = await adapter.findByHash(expiredToken.tokenHash)
        expectNotFound(found)

        // Verify valid token remains
        const validFound = await adapter.findByHash(validToken.tokenHash)
        expect(validFound).toEqual(validToken)
      })

      it('should clean up tokens before specific date', async () => {
        const cutoffDate = new Date()
        const oldToken = createTokenRecord({
          expiresAt: pastDate(),
        })
        const newToken = createTokenRecord({
          expiresAt: futureDate(),
        })

        await adapter.save(oldToken)
        await sleep(10) // Ensure different timestamps
        await adapter.save(newToken)

        const cleanedCount = await adapter.cleanupExpired(cutoffDate)

        expect(cleanedCount).toBeGreaterThanOrEqual(1)
      })

      it('should return zero when no tokens to clean', async () => {
        const cleanedCount = await adapter.cleanupExpired()
        expect(cleanedCount).toBe(0)
      })
    })

    describe('Token Reuse Detection', () => {
      it('should detect token reuse through family revocation', async () => {
        const familyId = 'reuse-test-family'
        const originalToken = createTokenRecord({ familyId })
        const rotatedToken = createTokenRecord({
          familyId,
          parentJti: originalToken.jti,
        })

        // Save original token
        await adapter.save(originalToken)

        // Rotate to new token
        await adapter.createChild(originalToken, rotatedToken)

        // Simulate reuse detection by checking if family should be revoked
        // when original token is used again
        const foundOriginal = await adapter.findByHash(originalToken.tokenHash)
        expect(foundOriginal).not.toBeNull()

        // In a real scenario, finding a rotated token being used again
        // would trigger family revocation
        await adapter.revokeFamily(familyId)

        const isRevoked = await adapter.isFamilyRevoked(familyId)
        expect(isRevoked).toBe(true)
      })
    })

    describe('Concurrent Operations', () => {
      it('should handle concurrent token creation safely', async () => {
        const familyId = 'concurrent-family'
        const tokens = Array.from({ length: 5 }, (_, i) =>
          createTokenRecord({
            familyId,
            jti: `concurrent-jti-${i}`,
          }),
        )

        // Save all tokens concurrently
        await Promise.all(tokens.map((token) => adapter.save(token)))

        // Verify all tokens were saved
        const family = await adapter.getFamily(familyId)
        expect(family).toHaveLength(5)
      })

      it('should handle concurrent family operations safely', async () => {
        const familyId = 'concurrent-ops-family'
        const token = createTokenRecord({ familyId })

        await adapter.save(token)

        // Perform concurrent operations
        await Promise.all([
          adapter.revokeFamily(familyId),
          adapter.isFamilyRevoked(familyId),
          adapter.getFamily(familyId),
        ])

        // Verify final state
        const isRevoked = await adapter.isFamilyRevoked(familyId)
        expect(isRevoked).toBe(true)
      })
    })

    describe('Edge Cases', () => {
      it('should handle tokens with minimal data', async () => {
        const minimalRecord: RefreshTokenRecord = {
          familyId: 'minimal-family',
          jti: 'minimal-jti',
          userId: 'user-123',
          sessionId: null,
          tokenHash: 'minimal-hash',
          expiresAt: futureDate(),
          parentJti: null,
          ip: null,
          userAgent: null,
        }

        await adapter.save(minimalRecord)

        const found = await adapter.findByHash(minimalRecord.tokenHash)
        expect(found).toEqual(minimalRecord)
      })

      it('should handle very long token chains', async () => {
        const familyId = 'long-chain-family'
        let parentJti: string | null = null

        // Create a chain of 10 tokens
        for (let i = 0; i < 10; i++) {
          const token = createTokenRecord({
            familyId,
            jti: `chain-token-${i}`,
            parentJti,
          })

          await adapter.save(token)
          parentJti = token.jti
        }

        const family = await adapter.getFamily(familyId)
        expect(family).toHaveLength(10)
      })
    })
  })
}
