/**
 * Email module exports for Keyloom
 * Provides email sending functionality for magic link authentication
 */

// Types
export type {
  EmailMessage,
  EmailResult,
  EmailProvider,
  EmailProviderConfig,
  EmailProviderType,
  EmailProviderRegistry,
  EmailProviderFactory,
  SMTPConfig,
  ResendConfig,
  MagicLinkEmailData,
  EmailTemplate,
  EmailService,
  EmailServiceConfig,
} from './types'

// Templates
export {
  defaultMagicLinkTemplate,
  createMagicLinkTemplate,
} from './templates'

// Providers
export {
  SMTPEmailProvider,
  createSMTPProvider,
  createSMTPProviderWithPreset,
  validateSMTPConfig,
  smtpPresets,
} from './providers/smtp'

export {
  ResendEmailProvider,
  ResendSDKEmailProvider,
  createResendProvider,
  createResendSDKProvider,
  validateResendConfig,
} from './providers/resend'

// Service
export {
  KeyloomEmailService,
  createEmailService,
  createValidatedEmailService,
  createEmailServiceFromEnv,
} from './service'

// Provider registry
import { createSMTPProvider } from './providers/smtp'
import { createResendProvider } from './providers/resend'
import type { EmailProviderRegistry } from './types'

export const emailProviders: EmailProviderRegistry = {
  smtp: createSMTPProvider,
  resend: createResendProvider,
}
