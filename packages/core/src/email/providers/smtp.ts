/**
 * SMTP email provider implementation for Keyloom
 * Supports standard SMTP servers with authentication
 */

import type { EmailProvider, EmailMessage, EmailResult, SMTPConfig } from '../types'

/**
 * SMTP email provider
 */
export class SMTPEmailProvider implements EmailProvider {
  public readonly id = 'smtp'
  private config: SMTPConfig

  constructor(config: SMTPConfig) {
    this.config = config
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.host) {
      throw new Error('SMTP host is required')
    }
    if (!this.config.port || this.config.port <= 0) {
      throw new Error('SMTP port must be a positive number')
    }
    if (!this.config.auth?.user) {
      throw new Error('SMTP username is required')
    }
    if (!this.config.auth?.pass) {
      throw new Error('SMTP password is required')
    }
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      // Dynamic import to avoid bundling nodemailer in client-side code
      const nodemailer = await import('nodemailer')
      
      // Create transporter
      const transporter = nodemailer.createTransporter({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure ?? (this.config.port === 465),
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        connectionTimeout: this.config.options?.connectionTimeout ?? 60000,
        socketTimeout: this.config.options?.socketTimeout ?? 60000,
        ignoreTLS: this.config.options?.ignoreTLS ?? false,
        requireTLS: this.config.options?.requireTLS ?? false,
      })

      // Send email
      const info = await transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      console.error('SMTP email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMTP error',
      }
    }
  }
}

/**
 * Create an SMTP email provider
 */
export function createSMTPProvider(config: SMTPConfig): EmailProvider {
  return new SMTPEmailProvider(config)
}

/**
 * Common SMTP configurations for popular providers
 */
export const smtpPresets = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
  },
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
  },
  mailgun: {
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
  },
  ses: {
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
  },
} as const

/**
 * Create SMTP provider with preset configuration
 */
export function createSMTPProviderWithPreset(
  preset: keyof typeof smtpPresets,
  auth: { user: string; pass: string },
  options?: Partial<SMTPConfig>
): EmailProvider {
  const presetConfig = smtpPresets[preset]
  const config: SMTPConfig = {
    ...presetConfig,
    ...options,
    auth,
  }
  return createSMTPProvider(config)
}

/**
 * Validate SMTP configuration
 */
export async function validateSMTPConfig(config: SMTPConfig): Promise<boolean> {
  try {
    const provider = new SMTPEmailProvider(config)
    // Try to create transporter and verify connection
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure ?? (config.port === 465),
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    })
    
    await transporter.verify()
    return true
  } catch (error) {
    console.error('SMTP configuration validation failed:', error)
    return false
  }
}
