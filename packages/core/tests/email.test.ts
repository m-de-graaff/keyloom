import { describe, expect, it, vi } from 'vitest'
import { createEmailService } from '../src/email/service'
import { defaultMagicLinkTemplate } from '../src/email/templates'
import type { EmailMessage, EmailResult } from '../src/email/types'

// Mock nodemailer for SMTP tests
vi.mock('nodemailer', () => ({
  createTransporter: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  })),
}))

// Mock fetch for Resend tests
global.fetch = vi.fn()

describe('Email Service', () => {
  describe('SMTP Provider', () => {
    it('should create SMTP email service', () => {
      const emailService = createEmailService({
        provider: {
          type: 'smtp',
          config: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: {
              user: 'test@example.com',
              pass: 'password',
            },
          },
        },
        from: 'noreply@example.com',
      })

      expect(emailService).toBeDefined()
      expect(emailService.getProvider().id).toBe('smtp')
    })

    it('should send magic link email via SMTP', async () => {
      const emailService = createEmailService({
        provider: {
          type: 'smtp',
          config: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: {
              user: 'test@example.com',
              pass: 'password',
            },
          },
        },
        from: 'noreply@example.com',
      })

      const result = await emailService.sendMagicLink({
        email: 'user@example.com',
        magicLinkUrl: 'http://localhost:3000/auth/magic-link/verify?token=abc123',
        appName: 'Test App',
        expirationMinutes: 15,
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('mock-message-id')
    })
  })

  describe('Resend Provider', () => {
    it('should create Resend email service', () => {
      const emailService = createEmailService({
        provider: {
          type: 'resend',
          config: {
            apiKey: 're_test_api_key',
          },
        },
        from: 'noreply@example.com',
      })

      expect(emailService).toBeDefined()
      expect(emailService.getProvider().id).toBe('resend')
    })

    it('should send magic link email via Resend', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'resend-message-id' }),
      } as Response)

      const emailService = createEmailService({
        provider: {
          type: 'resend',
          config: {
            apiKey: 're_test_api_key',
          },
        },
        from: 'noreply@example.com',
      })

      const result = await emailService.sendMagicLink({
        email: 'user@example.com',
        magicLinkUrl: 'http://localhost:3000/auth/magic-link/verify?token=abc123',
        appName: 'Test App',
        expirationMinutes: 15,
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('resend-message-id')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer re_test_api_key',
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should handle Resend API errors', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid API key' }),
      } as Response)

      const emailService = createEmailService({
        provider: {
          type: 'resend',
          config: {
            apiKey: 're_invalid_key',
          },
        },
        from: 'noreply@example.com',
      })

      const result = await emailService.sendMagicLink({
        email: 'user@example.com',
        magicLinkUrl: 'http://localhost:3000/auth/magic-link/verify?token=abc123',
        appName: 'Test App',
        expirationMinutes: 15,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid API key')
    })
  })

  describe('Email Templates', () => {
    it('should generate magic link email content', () => {
      const data = {
        email: 'user@example.com',
        magicLinkUrl: 'http://localhost:3000/auth/magic-link/verify?token=abc123',
        appName: 'Test App',
        expirationMinutes: 15,
        userName: 'John Doe',
      }

      const subject = defaultMagicLinkTemplate.subject(data)
      const html = defaultMagicLinkTemplate.html(data)
      const text = defaultMagicLinkTemplate.text(data)

      expect(subject).toBe('Sign in to Test App')
      expect(html).toContain('Test App')
      expect(html).toContain('John Doe')
      expect(html).toContain('http://localhost:3000/auth/magic-link/verify?token=abc123')
      expect(html).toContain('15 minutes')
      
      expect(text).toContain('Test App')
      expect(text).toContain('John Doe')
      expect(text).toContain('http://localhost:3000/auth/magic-link/verify?token=abc123')
      expect(text).toContain('15 minutes')
    })

    it('should handle missing user name gracefully', () => {
      const data = {
        email: 'user@example.com',
        magicLinkUrl: 'http://localhost:3000/auth/magic-link/verify?token=abc123',
        appName: 'Test App',
        expirationMinutes: 15,
      }

      const html = defaultMagicLinkTemplate.html(data)
      const text = defaultMagicLinkTemplate.text(data)

      expect(html).toContain('Hi there,')
      expect(text).toContain('Hi there,')
    })
  })

  describe('Environment Configuration', () => {
    it('should create email service from environment variables', async () => {
      // Mock environment variables
      const originalEnv = process.env
      process.env = {
        ...originalEnv,
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_USER: 'test@example.com',
        SMTP_PASS: 'password',
        EMAIL_FROM: 'noreply@example.com',
      }

      const { createEmailServiceFromEnv } = await import('../src/email/service')
      const emailService = createEmailServiceFromEnv()

      expect(emailService).toBeDefined()
      expect(emailService?.getProvider().id).toBe('smtp')

      // Restore environment
      process.env = originalEnv
    })

    it('should return null when environment is not configured', async () => {
      const originalEnv = process.env
      process.env = { ...originalEnv }
      delete process.env.SMTP_HOST
      delete process.env.RESEND_API_KEY
      delete process.env.EMAIL_FROM

      const { createEmailServiceFromEnv } = await import('../src/email/service')
      const emailService = createEmailServiceFromEnv()

      expect(emailService).toBeNull()

      // Restore environment
      process.env = originalEnv
    })
  })
})
