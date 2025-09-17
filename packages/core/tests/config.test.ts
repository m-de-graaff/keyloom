import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  createJwtConfigFromKeyloom,
  createKeyloomConfig,
  getConfigFromEnv,
  isDatabaseStrategy,
  isJwtStrategy,
  mergeWithDefaults,
  validateKeyloomConfig,
} from '../src/config'
import type { KeyloomConfig } from '../src/types'

const baseAdapter = {
  createUser: async () => ({ id: '1' }),
} as unknown as KeyloomConfig['adapter']

function baseConfig(): KeyloomConfig {
  return {
    adapter: baseAdapter,
    baseUrl: 'https://example.com',
    secrets: { authSecret: 'averysecuresecret123' },
    jwt: { issuer: 'keyloom', audience: 'app' },
  }
}

afterEach(() => {
  delete process.env.AUTH_SECRET
  delete process.env.COOKIE_DOMAIN
  delete process.env.COOKIE_SAMESITE
  delete process.env.SESSION_STRATEGY
  delete process.env.JWT_ACCESS_TTL
  delete process.env.JWT_REFRESH_TTL
  delete process.env.JWT_CLOCK_SKEW_SEC
  delete process.env.JWT_INCLUDE_ORG_ROLE
  delete process.env.JWT_ALGORITHM
  delete process.env.JWT_ISSUER
  delete process.env.JWT_AUDIENCE
  delete process.env.KEY_ROTATION_DAYS
  delete process.env.KEY_OVERLAP_DAYS
  delete process.env.KEYLOOM_BASE_URL
  delete process.env.JWKS_PATH
  delete process.env.JWT_SECRET
})

describe('config helpers', () => {
  it("validateKeyloomConfig requires an adapter", () => {
    expect(() => validateKeyloomConfig({} as KeyloomConfig)).toThrow('adapter is required')
  })
  it('mergeWithDefaults fills missing sections', () => {
    const merged = mergeWithDefaults({ adapter: baseAdapter } as KeyloomConfig)
    expect(merged.cookie?.sameSite).toBe(DEFAULT_CONFIG.cookie?.sameSite)
    expect(merged.session?.strategy).toBe('database')
    expect(merged.jwt?.accessTTL).toBe('10m')
  })

  it('createKeyloomConfig merges env values with user config', () => {
    process.env.AUTH_SECRET = 'env-secret-value-456789'
    process.env.COOKIE_DOMAIN = 'example.com'
    process.env.SESSION_STRATEGY = 'jwt'
    process.env.JWT_ACCESS_TTL = '5m'
    const cfg = createKeyloomConfig({
      ...baseConfig(),
      secrets: { authSecret: 'user-secret-value-7890' },
      session: { strategy: 'database' },
      jwt: { issuer: 'keyloom', audience: 'client', refreshTTL: '40d' },
    })
    expect(cfg.cookie?.domain).toBe('example.com')
    expect(cfg.secrets?.authSecret).toBe('user-secret-value-7890')
    expect(cfg.session?.strategy).toBe('database')
    expect(cfg.jwt?.accessTTL).toBe('5m')
  })

  it('validateKeyloomConfig enforces session and jwt numeric bounds', () => {
    const cfg = baseConfig()
    cfg.cookie = { sameSite: 'invalid' as any }
    expect(() => validateKeyloomConfig(cfg)).toThrow('cookie.sameSite')

    cfg.cookie = { sameSite: 'lax' }
    cfg.session = { ttlMinutes: -1 }
    expect(() => validateKeyloomConfig(cfg)).toThrow('ttlMinutes must be positive')

    cfg.session = { strategy: 'jwt', ttlMinutes: 60 }
    cfg.jwt = { issuer: 'issuer' }
    delete cfg.secrets?.authSecret
    expect(() => validateKeyloomConfig(cfg)).toThrow('authSecret')

    cfg.secrets = { authSecret: 'secret' }
    cfg.jwt = { issuer: 'issuer', clockSkewSec: -1 }
    cfg.adapter = baseAdapter
    expect(() => validateKeyloomConfig(cfg)).toThrow('clockSkewSec')

    cfg.jwt = { issuer: 'issuer', keyRotationDays: -1 }
    expect(() => validateKeyloomConfig(cfg)).toThrow('keyRotationDays must be positive')

    cfg.jwt = { issuer: 'issuer', keyOverlapDays: -1 }
    expect(() => validateKeyloomConfig(cfg)).toThrow('keyOverlapDays must be non-negative')
  })

  it('validateKeyloomConfig requires jwt configuration pieces when jwt strategy is chosen', () => {
    const noJwt = { adapter: baseAdapter, session: { strategy: 'jwt' }, secrets: { authSecret: 'secret-secret-123456' } } as KeyloomConfig
    expect(() => validateKeyloomConfig(noJwt)).toThrow('jwt configuration is required')

    const missingIssuer = baseConfig()
    missingIssuer.session = { strategy: 'jwt' }
    missingIssuer.jwt = { audience: 'client' } as any
    expect(() => validateKeyloomConfig(missingIssuer)).toThrow('jwt.issuer is required')

    const missingSecret = baseConfig()
    missingSecret.session = { strategy: 'jwt' }
    missingSecret.jwt = { issuer: 'issuer' }
    delete missingSecret.secrets?.authSecret
    expect(() => validateKeyloomConfig(missingSecret)).toThrow('secrets.authSecret')
  })

  it('validateJWTConfig enforces ttl format and algorithm choices', () => {
    const cfg = baseConfig()
    cfg.session = { strategy: 'jwt' }
    cfg.jwt = { issuer: 'issuer', algorithm: 'HS256' as any, accessTTL: '10minutes' }
    expect(() => validateKeyloomConfig(cfg)).toThrow('jwt.algorithm')

    cfg.jwt.algorithm = 'EdDSA'
    expect(() => validateKeyloomConfig(cfg)).toThrow('jwt.accessTTL')

    cfg.jwt.accessTTL = '15m'
    cfg.jwt.refreshTTL = '40days'
    expect(() => validateKeyloomConfig(cfg)).toThrow('jwt.refreshTTL')
  })

  it('createJwtConfigFromKeyloom builds jwt config with defaults and audience', () => {
    const cfg = baseConfig()
    cfg.jwt = { issuer: 'keyloom', audience: ['web', 'mobile'], includeOrgRoleInAccess: true }
    const jwt = createJwtConfigFromKeyloom(cfg)
    expect(jwt).toMatchObject({
      alg: 'EdDSA',
      issuer: 'keyloom',
      accessTTL: '10m',
      audience: ['web', 'mobile'],
      includeOrgRoleInAccess: true,
    })
  })

  it('createJwtConfigFromKeyloom throws when jwt settings are incomplete', () => {
    const cfg = { adapter: baseAdapter } as KeyloomConfig
    expect(() => createJwtConfigFromKeyloom(cfg)).toThrow('incomplete')

    const missingIssuer = baseConfig()
    delete missingIssuer.jwt?.issuer
    expect(() => createJwtConfigFromKeyloom(missingIssuer)).toThrow('incomplete')
  })

  it('getConfigFromEnv picks up env variables', () => {
    process.env.KEYLOOM_BASE_URL = 'https://env.example'
    process.env.AUTH_SECRET = 'env-secret'
    process.env.SESSION_STRATEGY = 'jwt'
    process.env.JWT_ALGORITHM = 'ES256'
    process.env.JWT_ISSUER = 'env-issuer'
    process.env.JWT_AUDIENCE = 'aud'
    process.env.JWT_INCLUDE_ORG_ROLE = 'true'
    process.env.JWT_CLOCK_SKEW_SEC = '120'
    process.env.KEY_ROTATION_DAYS = '45'
    process.env.KEY_OVERLAP_DAYS = '3'
    const cfg = getConfigFromEnv()
    expect(cfg.baseUrl).toBe('https://env.example')
    expect(cfg.secrets?.authSecret).toBe('env-secret')
    expect(cfg.session?.strategy).toBe('jwt')
    expect(cfg.jwt).toMatchObject({
      algorithm: 'ES256',
      issuer: 'env-issuer',
      audience: 'aud',
      includeOrgRoleInAccess: true,
      clockSkewSec: 120,
      keyRotationDays: 45,
      keyOverlapDays: 3,
    })
  })

  it('strategy helpers reflect config choice', () => {
    const cfg = baseConfig()
    expect(isDatabaseStrategy(cfg)).toBe(true)
    cfg.session = { strategy: 'jwt' }
    expect(isJwtStrategy(cfg)).toBe(true)
    expect(isDatabaseStrategy(cfg)).toBe(false)
  })
})
