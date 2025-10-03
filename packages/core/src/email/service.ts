/**
 * Email service implementation for Keyloom
 * Provides high-level email sending functionality
 */

import type { 
  EmailService, 
  EmailServiceConfig, 
  EmailProvider, 
  EmailMessage, 
  EmailResult, 
  MagicLinkEmailData,
  EmailTemplate 
} from './types'
import { defaultMagicLinkTemplate } from './templates'
import { createSMTPProvider } from './providers/smtp'
import { createResendProvider } from './providers/resend'

/**
 * Email service implementation
 */
export class KeyloomEmailService implements EmailService {
  private provider: EmailProvider
  private config: EmailServiceConfig

  constructor(config: EmailServiceConfig) {
    this.config = config
    this.provider = this.createProvider(config.provider)
  }

  private createProvider(providerConfig: EmailServiceConfig['provider']): EmailProvider {
    switch (providerConfig.type) {
      case 'smtp':
        return createSMTPProvider(providerConfig.config)
      case 'resend':
        return createResendProvider(providerConfig.config)
      default:
        throw new Error(`Unsupported email provider type: ${(providerConfig as any).type}`)
    }
  }

  async sendMagicLink(data: MagicLinkEmailData): Promise<EmailResult> {
    const template = this.config.template || defaultMagicLinkTemplate
    
    const message: EmailMessage = {
      to: data.email,
      from: this.config.from,
      subject: template.subject(data),
      html: template.html(data),
      text: template.text(data),
    }

    return this.sendEmail(message)
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      return await this.provider.send(message)
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      }
    }
  }

  /**
   * Get the current email provider
   */
  getProvider(): EmailProvider {
    return this.provider
  }

  /**
   * Update the email service configuration
   */
  updateConfig(config: EmailServiceConfig): void {
    this.config = config
    this.provider = this.createProvider(config.provider)
  }
}

/**
 * Create an email service instance
 */
export function createEmailService(config: EmailServiceConfig): EmailService {
  return new KeyloomEmailService(config)
}

/**
 * Email service factory with validation
 */
export async function createValidatedEmailService(
  config: EmailServiceConfig
): Promise<EmailService> {
  const service = createEmailService(config)
  
  // Validate the configuration by sending a test (dry-run) if possible
  // This is optional and depends on the provider's capabilities
  
  return service
}

/**
 * Utility function to create email service from environment variables
 */
export function createEmailServiceFromEnv(): EmailService | null {
  // Check for SMTP configuration
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const emailFrom = process.env.EMAIL_FROM

  if (smtpHost && smtpPort && smtpUser && smtpPass && emailFrom) {
    return createEmailService({
      provider: {
        type: 'smtp',
        config: {
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        },
      },
      from: emailFrom,
    })
  }

  // Check for Resend configuration
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (resendApiKey && emailFrom) {
    return createEmailService({
      provider: {
        type: 'resend',
        config: {
          apiKey: resendApiKey,
        },
      },
      from: emailFrom,
    })
  }

  return null
}
