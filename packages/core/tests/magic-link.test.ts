import { describe, expect, it, beforeEach, vi } from 'vitest'
import { memoryAdapter } from '../src/adapters/memory'
import { requestMagicLink, verifyMagicLink } from '../src/magic-link'
import type { EmailService, EmailResult, MagicLinkEmailData } from '../src/email/types'

// Mock email service for testing
class MockEmailService implements EmailService {
  public sentEmails: MagicLinkEmailData[] = []
  public shouldFail = false

  async sendMagicLink(data: MagicLinkEmailData): Promise<EmailResult> {
    if (this.shouldFail) {
      return { success: false, error: 'Mock email service failure' }
    }
    
    this.sentEmails.push(data)
    return { success: true, messageId: 'mock-message-id' }
  }

  async sendEmail(): Promise<EmailResult> {
    return { success: true, messageId: 'mock-message-id' }
  }

  reset() {
    this.sentEmails = []
    this.shouldFail = false
  }
}

describe('Magic Link Authentication', () => {
  let adapter: any
  let emailService: MockEmailService

  beforeEach(() => {
    adapter = memoryAdapter()
    emailService = new MockEmailService()
  })

  describe('requestMagicLink', () => {
    it('should successfully request a magic link for existing user', async () => {
      // Create a user first
      const user = await adapter.createUser({
        email: 'test@example.com',
        emailVerified: new Date(),
      })

      const result = await requestMagicLink(
        { email: 'test@example.com' },
        {
          adapter,
          emailService,
          baseUrl: 'http://localhost:3000',
          appName: 'Test App',
        }
      )

      expect(result.success).toBe(true)
      expect(result.email).toBe('test@example.com')
      expect(emailService.sentEmails).toHaveLength(1)
      expect(emailService.sentEmails[0].email).toBe('test@example.com')
      expect(emailService.sentEmails[0].appName).toBe('Test App')
      expect(emailService.sentEmails[0].magicLinkUrl).toContain('http://localhost:3000')
    })

    it('should create user automatically when autoCreateUser is true', async () => {
      const result = await requestMagicLink(
        { email: 'newuser@example.com' },
        {
          adapter,
          emailService,
          baseUrl: 'http://localhost:3000',
          appName: 'Test App',
        },
        { autoCreateUser: true }
      )

      expect(result.success).toBe(true)
      expect(result.email).toBe('newuser@example.com')
      expect(emailService.sentEmails).toHaveLength(1)
    })

    it('should fail when user does not exist and autoCreateUser is false', async () => {
      const result = await requestMagicLink(
        { email: 'nonexistent@example.com' },
        {
          adapter,
          emailService,
          baseUrl: 'http://localhost:3000',
          appName: 'Test App',
        },
        { autoCreateUser: false }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
      expect(emailService.sentEmails).toHaveLength(0)
    })

    it('should fail when email service fails', async () => {
      emailService.shouldFail = true

      const result = await requestMagicLink(
        { email: 'test@example.com' },
        {
          adapter,
          emailService,
          baseUrl: 'http://localhost:3000',
          appName: 'Test App',
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Mock email service failure')
    })

    it('should validate email format', async () => {
      const result = await requestMagicLink(
        { email: 'invalid-email' },
        {
          adapter,
          emailService,
          baseUrl: 'http://localhost:3000',
          appName: 'Test App',
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email address')
      expect(emailService.sentEmails).toHaveLength(0)
    })
  })

  describe('verifyMagicLink', () => {
    it('should successfully verify magic link and create session', async () => {
      // Create user and verification token
      const user = await adapter.createUser({
        email: 'test@example.com',
        emailVerified: new Date(),
      })

      await adapter.createVerificationToken({
        identifier: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      })

      const result = await verifyMagicLink(
        { email: 'test@example.com', token: 'test-token' },
        { adapter }
      )

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.email).toBe('test@example.com')
      expect(result.session).toBeDefined()
      expect(result.session?.userId).toBe(user.id)
    })

    it('should fail with invalid token', async () => {
      const result = await verifyMagicLink(
        { email: 'test@example.com', token: 'invalid-token' },
        { adapter }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or expired magic link')
    })

    it('should create user when autoCreateUser is true and user does not exist', async () => {
      await adapter.createVerificationToken({
        identifier: 'newuser@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const result = await verifyMagicLink(
        { email: 'newuser@example.com', token: 'test-token' },
        { adapter },
        { autoCreateUser: true }
      )

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.email).toBe('newuser@example.com')
      expect(result.session).toBeDefined()
    })

    it('should fail when user does not exist and autoCreateUser is false', async () => {
      await adapter.createVerificationToken({
        identifier: 'nonexistent@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const result = await verifyMagicLink(
        { email: 'nonexistent@example.com', token: 'test-token' },
        { adapter },
        { autoCreateUser: false }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should validate required parameters', async () => {
      const result1 = await verifyMagicLink(
        { email: '', token: 'test-token' },
        { adapter }
      )
      expect(result1.success).toBe(false)
      expect(result1.error).toBe('Email and token are required')

      const result2 = await verifyMagicLink(
        { email: 'test@example.com', token: '' },
        { adapter }
      )
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('Email and token are required')
    })
  })
})
