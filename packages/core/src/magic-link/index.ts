/**
 * Magic link authentication module exports for Keyloom
 */

// Types
export type {
  MagicLinkRequestInput,
  MagicLinkVerifyInput,
  MagicLinkRequestContext,
  MagicLinkVerifyContext,
  MagicLinkRequestResult,
  MagicLinkVerifyResult,
  MagicLinkConfig,
  MagicLinkToken,
  MagicLinkUrlOptions,
} from './types'

// Core functions
export {
  requestMagicLink,
  verifyMagicLink,
  generateMagicLinkUrl,
  defaultMagicLinkConfig,
} from './core'
