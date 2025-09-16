import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { KeyloomAdapter } from '@keyloom/core/adapter-types'
import {
  TestDataManager,
  randomEmail,
  randomUser,
  futureDate,
  pastDate,
  expectUser,
  expectSession,
  expectAccount,
  expectUniqueViolation,
  expectNotFound
} from './helpers'

/**
 * Core adapter contract tests
 * These tests must pass for all adapter implementations
 */
export function createAdapterContractTests(createAdapter: () => KeyloomAdapter) {
  describe('Adapter Contract Tests', () => {
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

    describe('User Management', () => {
      it('should create a user with minimal data', async () => {
        const userData = { email: randomEmail() }
        const user = await adapter.createUser(userData)

        expectUser(user)
        expect(user.email).toBe(userData.email)
        expect(user.emailVerified).toBeNull()
        expect(user.name).toBeNull()
        expect(user.image).toBeNull()
      })

      it('should create a user with full data', async () => {
        const userData = randomUser()
        const user = await adapter.createUser(userData)

        expectUser(user)
        expect(user.email).toBe(userData.email)
        expect(user.name).toBe(userData.name)
        expect(user.image).toBe(userData.image)
      })

      it('should retrieve a user by ID', async () => {
        const user = await testData.createUser()
        const retrieved = await adapter.getUser(user.id)

        expect(retrieved).toEqual(user)
      })

      it('should return null for non-existent user', async () => {
        const result = await adapter.getUser('non-existent-id')
        expectNotFound(result)
      })

      it('should retrieve a user by email', async () => {
        const user = await testData.createUser()
        const retrieved = await adapter.getUserByEmail(user.email!)

        expect(retrieved).toEqual(user)
      })

      it('should handle case-insensitive email lookup', async () => {
        const email = randomEmail()
        const user = await testData.createUser({ email })
        
        const retrieved = await adapter.getUserByEmail(email.toUpperCase())
        expect(retrieved).toEqual(user)
      })

      it('should update user data', async () => {
        const user = await testData.createUser()
        const updateData = {
          name: 'Updated Name',
          emailVerified: new Date()
        }

        const updated = await adapter.updateUser(user.id, updateData)

        expect(updated.name).toBe(updateData.name)
        expect(updated.emailVerified).toEqual(updateData.emailVerified)
        expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime())
      })

      it('should enforce unique email constraint', async () => {
        const email = randomEmail()
        await testData.createUser({ email })

        await expect(
          testData.createUser({ email })
        ).rejects.toThrow()
      })
    })

    describe('Account Management', () => {
      it('should link an account to a user', async () => {
        const user = await testData.createUser()
        const accountData = {
          userId: user.id,
          provider: 'github',
          providerAccountId: '12345',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'bearer',
          scope: 'read:user',
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }

        const account = await adapter.linkAccount(accountData)

        expectAccount(account)
        expect(account.userId).toBe(user.id)
        expect(account.provider).toBe(accountData.provider)
        expect(account.providerAccountId).toBe(accountData.providerAccountId)
      })

      it('should retrieve account by provider', async () => {
        const user = await testData.createUser()
        const accountData = {
          userId: user.id,
          provider: 'github',
          providerAccountId: '12345'
        }

        const account = await adapter.linkAccount(accountData)
        const retrieved = await adapter.getAccountByProvider('github', '12345')

        expect(retrieved).toEqual(account)
      })

      it('should enforce unique provider account constraint', async () => {
        const user1 = await testData.createUser()
        const user2 = await testData.createUser()

        await adapter.linkAccount({
          userId: user1.id,
          provider: 'github',
          providerAccountId: '12345'
        })

        await expect(
          adapter.linkAccount({
            userId: user2.id,
            provider: 'github',
            providerAccountId: '12345'
          })
        ).rejects.toThrow()
      })
    })

    describe('Session Management', () => {
      it('should create a session', async () => {
        const user = await testData.createUser()
        const expiresAt = futureDate()

        const session = await adapter.createSession({
          userId: user.id,
          expiresAt
        })

        expectSession(session)
        expect(session.userId).toBe(user.id)
        expect(session.expiresAt).toEqual(expiresAt)
      })

      it('should retrieve a session by ID', async () => {
        const user = await testData.createUser()
        const session = await testData.createSession(user.id)

        const retrieved = await adapter.getSession(session.id)
        expect(retrieved).toEqual(session)
      })

      it('should delete a session', async () => {
        const user = await testData.createUser()
        const session = await testData.createSession(user.id)

        await adapter.deleteSession(session.id)

        const retrieved = await adapter.getSession(session.id)
        expectNotFound(retrieved)
      })

      it('should handle deletion of non-existent session gracefully', async () => {
        await expect(
          adapter.deleteSession('non-existent-id')
        ).resolves.not.toThrow()
      })
    })

    describe('Verification Tokens', () => {
      it('should create a verification token', async () => {
        const tokenData = {
          identifier: randomEmail(),
          token: 'plain-token',
          expiresAt: futureDate()
        }

        const token = await adapter.createVerificationToken(tokenData)

        expect(token.identifier).toBe(tokenData.identifier)
        expect(token.expiresAt).toEqual(tokenData.expiresAt)
        expect(token.createdAt).toBeInstanceOf(Date)
      })

      it('should consume a verification token', async () => {
        const tokenData = {
          identifier: randomEmail(),
          token: 'plain-token',
          expiresAt: futureDate()
        }

        const token = await adapter.createVerificationToken(tokenData)
        const consumed = await adapter.useVerificationToken(
          token.identifier,
          tokenData.token
        )

        expect(consumed).toEqual(token)

        // Token should be consumed and not usable again
        const secondUse = await adapter.useVerificationToken(
          token.identifier,
          tokenData.token
        )
        expectNotFound(secondUse)
      })

      it('should return null for non-existent token', async () => {
        const result = await adapter.useVerificationToken(
          'non-existent@example.com',
          'non-existent-token'
        )
        expectNotFound(result)
      })

      it('should enforce unique identifier+token constraint', async () => {
        const tokenData = {
          identifier: randomEmail(),
          token: 'plain-token',
          expiresAt: futureDate()
        }

        await adapter.createVerificationToken(tokenData)

        await expect(
          adapter.createVerificationToken(tokenData)
        ).rejects.toThrow()
      })
    })

    describe('Audit Logging', () => {
      it('should append audit events', async () => {
        const user = await testData.createUser()
        const auditEvent = {
          type: 'user.login',
          userId: user.id,
          ip: '192.168.1.1',
          ua: 'Mozilla/5.0...',
          at: new Date(),
          meta: { method: 'password' }
        }

        await expect(
          adapter.appendAudit(auditEvent)
        ).resolves.not.toThrow()
      })

      it('should handle audit events without user', async () => {
        const auditEvent = {
          type: 'system.startup',
          at: new Date(),
          meta: { version: '1.0.0' }
        }

        await expect(
          adapter.appendAudit(auditEvent)
        ).resolves.not.toThrow()
      })
    })

    describe('Health Check', () => {
      it('should perform health check if supported', async () => {
        if (adapter.healthCheck) {
          const health = await adapter.healthCheck()
          expect(health.status).toMatch(/^(healthy|unhealthy)$/)
        }
      })
    })

    describe('Cleanup', () => {
      it('should perform cleanup if supported', async () => {
        if (adapter.cleanup) {
          const result = await adapter.cleanup()
          expect(typeof result.sessions).toBe('number')
          expect(typeof result.tokens).toBe('number')
          expect(typeof result.refreshTokens).toBe('number')
        }
      })
    })
  })
}
