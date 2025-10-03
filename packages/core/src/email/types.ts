/**
 * Email provider types and interfaces for Keyloom authentication
 * Supports SMTP and Resend email providers for magic link authentication
 */

/**
 * Base email message interface
 */
export interface EmailMessage {
  /** Recipient email address */
  to: string
  /** Sender email address */
  from: string
  /** Email subject */
  subject: string
  /** HTML email content */
  html: string
  /** Plain text email content (optional) */
  text?: string
}

/**
 * Email sending result
 */
export interface EmailResult {
  /** Whether the email was sent successfully */
  success: boolean
  /** Message ID from the email provider (if available) */
  messageId?: string
  /** Error message if sending failed */
  error?: string
}

/**
 * Base email provider interface
 */
export interface EmailProvider {
  /** Provider identifier */
  id: string
  /** Send an email message */
  send(message: EmailMessage): Promise<EmailResult>
}

/**
 * SMTP configuration options
 */
export interface SMTPConfig {
  /** SMTP server hostname */
  host: string
  /** SMTP server port */
  port: number
  /** Whether to use secure connection (TLS) */
  secure?: boolean
  /** Authentication credentials */
  auth: {
    /** Username for SMTP authentication */
    user: string
    /** Password for SMTP authentication */
    pass: string
  }
  /** Additional SMTP options */
  options?: {
    /** Connection timeout in milliseconds */
    connectionTimeout?: number
    /** Socket timeout in milliseconds */
    socketTimeout?: number
    /** Whether to ignore TLS certificate errors */
    ignoreTLS?: boolean
    /** Whether to require TLS */
    requireTLS?: boolean
  }
}

/**
 * Resend configuration options
 */
export interface ResendConfig {
  /** Resend API key */
  apiKey: string
  /** Base URL for Resend API (optional, defaults to official API) */
  baseUrl?: string
}

/**
 * Email provider configuration union type
 */
export type EmailProviderConfig = 
  | { type: 'smtp'; config: SMTPConfig }
  | { type: 'resend'; config: ResendConfig }

/**
 * Magic link email template data
 */
export interface MagicLinkEmailData {
  /** User's email address */
  email: string
  /** Magic link URL */
  magicLinkUrl: string
  /** Application name */
  appName: string
  /** Link expiration time in minutes */
  expirationMinutes: number
  /** User's name (if available) */
  userName?: string
}

/**
 * Email template interface
 */
export interface EmailTemplate {
  /** Generate email subject */
  subject(data: MagicLinkEmailData): string
  /** Generate HTML email content */
  html(data: MagicLinkEmailData): string
  /** Generate plain text email content */
  text(data: MagicLinkEmailData): string
}

/**
 * Email service configuration
 */
export interface EmailServiceConfig {
  /** Email provider configuration */
  provider: EmailProviderConfig
  /** Default sender email address */
  from: string
  /** Email template (optional, uses default if not provided) */
  template?: EmailTemplate
}

/**
 * Email service interface
 */
export interface EmailService {
  /** Send a magic link email */
  sendMagicLink(data: MagicLinkEmailData): Promise<EmailResult>
  /** Send a generic email */
  sendEmail(message: EmailMessage): Promise<EmailResult>
}

/**
 * Email provider factory function type
 */
export type EmailProviderFactory<T = any> = (config: T) => EmailProvider

/**
 * Available email provider types
 */
export type EmailProviderType = 'smtp' | 'resend'

/**
 * Email provider registry
 */
export interface EmailProviderRegistry {
  smtp: EmailProviderFactory<SMTPConfig>
  resend: EmailProviderFactory<ResendConfig>
}
