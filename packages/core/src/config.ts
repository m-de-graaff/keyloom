import type { JwtConfig } from './jwt/types'
import type { KeyloomConfig } from './types'

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<KeyloomConfig> = {
  cookie: {
    sameSite: 'lax',
    maxAgeSec: 60 * 60 * 24 * 7, // 7 days
  },
  session: {
    strategy: 'database',
    ttlMinutes: 60,
    rolling: true,
  },
  jwt: {
    algorithm: 'EdDSA',
    accessTTL: '10m',
    refreshTTL: '30d',
    clockSkewSec: 60,
    includeOrgRoleInAccess: false,
    keyRotationDays: 90,
    keyOverlapDays: 7,
  },
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
      ...config.cookie,
    },
    session: {
      ...DEFAULT_CONFIG.session,
      ...config.session,
    },
    jwt: {
      ...DEFAULT_CONFIG.jwt,
      ...config.jwt,
    },
    secrets: {
      ...config.secrets,
    },
  }
}

/**
 * Convert KeyloomConfig to JwtConfig
 */
export function createJwtConfigFromKeyloom(config: KeyloomConfig): JwtConfig {
  if (!config.jwt || !config.jwt.issuer) {
    throw new Error('JWT configuration is incomplete')
  }

  const out: JwtConfig = {
    alg: config.jwt.algorithm || 'EdDSA',
    issuer: config.jwt.issuer,
    accessTTL: config.jwt.accessTTL || '10m',
    refreshTTL: config.jwt.refreshTTL || '30d',
    clockSkewSec: config.jwt.clockSkewSec || 60,
    includeOrgRoleInAccess: config.jwt.includeOrgRoleInAccess || false,
  }
  if (config.jwt.audience !== undefined) out.audience = config.jwt.audience
  return out
}

/**
 * Get environment-based configuration
 */
export function getConfigFromEnv(): Partial<KeyloomConfig> {
  const out: Partial<KeyloomConfig> = {}

  const baseUrl = process.env.KEYLOOM_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (baseUrl !== undefined) out.baseUrl = baseUrl

  // secrets
  const authSecret = process.env.AUTH_SECRET || process.env.KEYLOOM_AUTH_SECRET
  if (authSecret !== undefined) out.secrets = { authSecret }

  // session
  const strategyEnv = process.env.SESSION_STRATEGY as 'database' | 'jwt' | undefined
  if (strategyEnv) out.session = { strategy: strategyEnv }

  // jwt
  const jwt: Partial<KeyloomConfig['jwt']> = {}
  const issuer = process.env.JWT_ISSUER || process.env.KEYLOOM_JWT_ISSUER
  if (issuer !== undefined) jwt.issuer = issuer

  const audience = process.env.JWT_AUDIENCE || process.env.KEYLOOM_JWT_AUDIENCE
  if (audience !== undefined) jwt.audience = audience

  const accessTTL = process.env.JWT_ACCESS_TTL || process.env.KEYLOOM_JWT_ACCESS_TTL
  if (accessTTL !== undefined) jwt.accessTTL = accessTTL

  const refreshTTL = process.env.JWT_REFRESH_TTL || process.env.KEYLOOM_JWT_REFRESH_TTL
  if (refreshTTL !== undefined) jwt.refreshTTL = refreshTTL

  const algorithm = process.env.JWT_ALGORITHM as 'EdDSA' | 'ES256' | undefined
  if (algorithm) jwt.algorithm = algorithm

  const clockSkewStr = process.env.JWT_CLOCK_SKEW_SEC
  if (clockSkewStr !== undefined) jwt.clockSkewSec = parseInt(clockSkewStr, 10)

  if (process.env.JWT_INCLUDE_ORG_ROLE === 'true') jwt.includeOrgRoleInAccess = true

  const jwksPath = process.env.JWKS_PATH || process.env.KEYLOOM_JWKS_PATH
  if (jwksPath !== undefined) jwt.jwksPath = jwksPath

  const keyRotationDaysStr = process.env.KEY_ROTATION_DAYS
  if (keyRotationDaysStr !== undefined) jwt.keyRotationDays = parseInt(keyRotationDaysStr, 10)

  const keyOverlapDaysStr = process.env.KEY_OVERLAP_DAYS
  if (keyOverlapDaysStr !== undefined) jwt.keyOverlapDays = parseInt(keyOverlapDaysStr, 10)

  if (Object.keys(jwt).length) out.jwt = jwt

  // cookie
  const cookie: Partial<KeyloomConfig['cookie']> = {}
  const cookieDomain = process.env.COOKIE_DOMAIN || process.env.KEYLOOM_COOKIE_DOMAIN
  if (cookieDomain !== undefined) cookie.domain = cookieDomain
  const sameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) || 'lax'
  cookie.sameSite = sameSite
  out.cookie = cookie

  return out
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
      ...userConfig.jwt,
    },
    secrets: {
      ...envConfig.secrets,
      ...userConfig.secrets,
    },
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
