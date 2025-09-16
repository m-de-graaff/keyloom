import type { KeyloomConfig } from './types'
import type { JwtConfig } from './jwt/types'

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<KeyloomConfig> = {
  cookie: {
    sameSite: 'lax',
    maxAgeSec: 60 * 60 * 24 * 7 // 7 days
  },
  session: {
    strategy: 'database',
    ttlMinutes: 60,
    rolling: true
  },
  jwt: {
    algorithm: 'EdDSA',
    accessTTL: '10m',
    refreshTTL: '30d',
    clockSkewSec: 60,
    includeOrgRoleInAccess: false,
    keyRotationDays: 90,
    keyOverlapDays: 7
  }
}

/**
 * Validate Keyloom configuration
 */
export function validateKeyloomConfig(config: KeyloomConfig): void {
  if (!config.adapter) {
    throw new Error('Keyloom config: adapter is required')
  }

  if (config.session?.strategy === 'jwt') {
    validateJwtConfig(config)
  }

  if (config.cookie?.sameSite && !['lax', 'strict', 'none'].includes(config.cookie.sameSite)) {
    throw new Error('Keyloom config: cookie.sameSite must be "lax", "strict", or "none"')
  }

  if (config.session?.ttlMinutes && config.session.ttlMinutes <= 0) {
    throw new Error('Keyloom config: session.ttlMinutes must be positive')
  }

  if (config.jwt?.clockSkewSec && config.jwt.clockSkewSec < 0) {
    throw new Error('Keyloom config: jwt.clockSkewSec must be non-negative')
  }

  if (config.jwt?.keyRotationDays && config.jwt.keyRotationDays <= 0) {
    throw new Error('Keyloom config: jwt.keyRotationDays must be positive')
  }

  if (config.jwt?.keyOverlapDays && config.jwt.keyOverlapDays < 0) {
    throw new Error('Keyloom config: jwt.keyOverlapDays must be non-negative')
  }
}

/**
 * Validate JWT-specific configuration
 */
function validateJwtConfig(config: KeyloomConfig): void {
  if (!config.jwt) {
    throw new Error('Keyloom config: jwt configuration is required when session.strategy is "jwt"')
  }

  if (!config.jwt.issuer) {
    throw new Error('Keyloom config: jwt.issuer is required for JWT strategy')
  }

  if (!config.secrets?.authSecret) {
    throw new Error('Keyloom config: secrets.authSecret is required for JWT strategy')
  }

  if (config.jwt.algorithm && !['EdDSA', 'ES256'].includes(config.jwt.algorithm)) {
    throw new Error('Keyloom config: jwt.algorithm must be "EdDSA" or "ES256"')
  }

  // Validate TTL format (basic check)
  if (config.jwt.accessTTL && !isValidTTLFormat(config.jwt.accessTTL)) {
    throw new Error('Keyloom config: jwt.accessTTL must be in format like "10m", "1h", "30s"')
  }

  if (config.jwt.refreshTTL && !isValidTTLFormat(config.jwt.refreshTTL)) {
    throw new Error('Keyloom config: jwt.refreshTTL must be in format like "30d", "7d", "24h"')
  }
}

/**
 * Check if TTL format is valid (basic regex check)
 */
function isValidTTLFormat(ttl: string): boolean {
  return /^\d+[smhd]$/.test(ttl)
}

/**
 * Merge configuration with defaults
 */
export function mergeWithDefaults(config: KeyloomConfig): KeyloomConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    cookie: {
      ...DEFAULT_CONFIG.cookie,
      ...config.cookie
    },
    session: {
      ...DEFAULT_CONFIG.session,
      ...config.session
    },
    jwt: {
      ...DEFAULT_CONFIG.jwt,
      ...config.jwt
    },
    secrets: {
      ...config.secrets
    }
  }
}

/**
 * Convert KeyloomConfig to JwtConfig
 */
export function createJwtConfigFromKeyloom(config: KeyloomConfig): JwtConfig {
  if (!config.jwt || !config.jwt.issuer) {
    throw new Error('JWT configuration is incomplete')
  }

  return {
    alg: config.jwt.algorithm || 'EdDSA',
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    accessTTL: config.jwt.accessTTL || '10m',
    refreshTTL: config.jwt.refreshTTL || '30d',
    clockSkewSec: config.jwt.clockSkewSec || 60,
    includeOrgRoleInAccess: config.jwt.includeOrgRoleInAccess || false
  }
}

/**
 * Get environment-based configuration
 */
export function getConfigFromEnv(): Partial<KeyloomConfig> {
  return {
    baseUrl: process.env.KEYLOOM_BASE_URL || process.env.NEXT_PUBLIC_APP_URL,
    secrets: {
      authSecret: process.env.AUTH_SECRET || process.env.KEYLOOM_AUTH_SECRET
    },
    session: {
      strategy: (process.env.SESSION_STRATEGY as 'database' | 'jwt') || 'database'
    },
    jwt: {
      issuer: process.env.JWT_ISSUER || process.env.KEYLOOM_JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE || process.env.KEYLOOM_JWT_AUDIENCE,
      accessTTL: process.env.JWT_ACCESS_TTL || process.env.KEYLOOM_JWT_ACCESS_TTL,
      refreshTTL: process.env.JWT_REFRESH_TTL || process.env.KEYLOOM_JWT_REFRESH_TTL,
      algorithm: (process.env.JWT_ALGORITHM as 'EdDSA' | 'ES256') || 'EdDSA',
      clockSkewSec: process.env.JWT_CLOCK_SKEW_SEC 
        ? parseInt(process.env.JWT_CLOCK_SKEW_SEC, 10) 
        : undefined,
      includeOrgRoleInAccess: process.env.JWT_INCLUDE_ORG_ROLE === 'true',
      jwksPath: process.env.JWKS_PATH || process.env.KEYLOOM_JWKS_PATH,
      keyRotationDays: process.env.KEY_ROTATION_DAYS 
        ? parseInt(process.env.KEY_ROTATION_DAYS, 10) 
        : undefined,
      keyOverlapDays: process.env.KEY_OVERLAP_DAYS 
        ? parseInt(process.env.KEY_OVERLAP_DAYS, 10) 
        : undefined
    },
    cookie: {
      domain: process.env.COOKIE_DOMAIN || process.env.KEYLOOM_COOKIE_DOMAIN,
      sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax'
    }
  }
}

/**
 * Create a complete configuration by merging user config with environment and defaults
 */
export function createKeyloomConfig(userConfig: KeyloomConfig): KeyloomConfig {
  const envConfig = getConfigFromEnv()
  const merged = mergeWithDefaults({
    ...envConfig,
    ...userConfig,
    jwt: {
      ...envConfig.jwt,
      ...userConfig.jwt
    },
    secrets: {
      ...envConfig.secrets,
      ...userConfig.secrets
    }
  })

  validateKeyloomConfig(merged)
  return merged
}

/**
 * Helper to check if JWT strategy is enabled
 */
export function isJwtStrategy(config: KeyloomConfig): boolean {
  return config.session?.strategy === 'jwt'
}

/**
 * Helper to check if database strategy is enabled
 */
export function isDatabaseStrategy(config: KeyloomConfig): boolean {
  return !config.session?.strategy || config.session.strategy === 'database'
}
