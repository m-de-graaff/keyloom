/**
 * Magic link authentication types for Keyloom
 */

import type { KeyloomAdapter } from '../adapter-types'
import type { EmailService } from '../email/types'

/**
 * Magic link request input
 */
export interface MagicLinkRequestInput {
  /** User's email address */
  email: string
  /** Optional redirect URL after successful authentication */
  redirectTo?: string
  /** Optional TTL in minutes (defaults to 15) */
  ttlMinutes?: number
}

/**
 * Magic link verification input
 */
export interface MagicLinkVerifyInput {
  /** Email address (identifier) */
  email: string
  /** Magic link token */
  token: string
  /** Optional TTL for the created session in minutes */
  sessionTtlMinutes?: number
}

/**
 * Magic link request context
 */
export interface MagicLinkRequestContext {
  /** Database adapter */
  adapter: KeyloomAdapter
  /** Email service for sending magic links */
  emailService: EmailService
  /** Base URL for constructing magic link URLs */
  baseUrl: string
  /** Application name for email templates */
  appName?: string
}

/**
 * Magic link verification context
 */
export interface MagicLinkVerifyContext {
  /** Database adapter */
  adapter: KeyloomAdapter
  /** Optional audit function */
  audit?: (event: string, data: any) => Promise<void>
}

/**
 * Magic link request result
 */
export interface MagicLinkRequestResult {
  /** Whether the request was successful */
  success: boolean
  /** Error message if request failed */
  error?: string
  /** Email address the magic link was sent to */
  email?: string
}

/**
 * Magic link verification result
 */
export interface MagicLinkVerifyResult {
  /** Whether verification was successful */
  success: boolean
  /** User data if verification succeeded */
  user?: {
    id: string
    email: string
    name?: string | null
    image?: string | null
    emailVerified?: Date | null
  }
  /** Session data if verification succeeded */
  session?: {
    id: string
    userId: string
    expiresAt: Date
  }
  /** Error message if verification failed */
  error?: string
}

/**
 * Magic link configuration
 */
export interface MagicLinkConfig {
  /** Default TTL for magic link tokens in minutes */
  defaultTtlMinutes?: number
  /** Default TTL for created sessions in minutes */
  defaultSessionTtlMinutes?: number
  /** Whether to create user accounts automatically if they don't exist */
  autoCreateUser?: boolean
  /** Whether to require email verification for new users */
  requireEmailVerification?: boolean
  /** Custom magic link URL path (defaults to '/api/auth/magic-link/verify') */
  verifyPath?: string
}

/**
 * Magic link token data
 */
export interface MagicLinkToken {
  /** Email address (identifier) */
  email: string
  /** Token string */
  token: string
  /** Expiration date */
  expiresAt: Date
  /** Optional redirect URL */
  redirectTo?: string
}

/**
 * Magic link URL generation options
 */
export interface MagicLinkUrlOptions {
  /** Base URL of the application */
  baseUrl: string
  /** Email address */
  email: string
  /** Token string */
  token: string
  /** Optional redirect URL after successful authentication */
  redirectTo?: string
  /** Custom verification path (defaults to '/api/auth/magic-link/verify') */
  verifyPath?: string
}
