import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSecrets,
  deriveJwtSecret,
  generateSecret,
  getEffectiveJwtSecret,
  getJwksPath,
  getSecretsFromEnv,
  getSecretsManager,
  initializeSecrets,
  resetSecretsManager,
  SecretsManager,
  validateSecrets,
} from '../src/secrets'

afterEach(() => {
  Reflect.deleteProperty(process.env, 'AUTH_SECRET')
  Reflect.deleteProperty(process.env, 'JWT_SECRET')
  Reflect.deleteProperty(process.env, 'JWKS_PATH')
  resetSecretsManager()
  vi.restoreAllMocks()
})

describe('secrets utilities', () => {
  it('validates length and warns on default secret', () => {
    expect(() => validateSecrets({ authSecret: '' } as any)).toThrow('required')
    expect(() => validateSecrets({ authSecret: 'short' } as any)).toThrow('at least 16')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateSecrets({ authSecret: 'dev-secret-change-in-production' })
    expect(warn).toHaveBeenCalled()
  })

  it('derives deterministic secrets', () => {
    const seed = 'super-secret-value-123456'
    const derived1 = deriveJwtSecret(seed)
    const derived2 = deriveJwtSecret(seed)
    expect(derived1).toBe(derived2)
  })

  it('reads secrets from env and allows overrides', () => {
    process.env.AUTH_SECRET = 'env-secret-value-123456'
    process.env.JWT_SECRET = 'jwt-secret-value-987654'
    process.env.JWKS_PATH = '/tmp/jwks.json'
    const envSecrets = getSecretsFromEnv()
    expect(envSecrets).toEqual({
      authSecret: 'env-secret-value-123456',
      jwtSecret: 'jwt-secret-value-987654',
      jwksPath: '/tmp/jwks.json',
    })

    const merged = createSecrets({ authSecret: 'override-secret-value-789012' })
    expect(getEffectiveJwtSecret(merged)).toBe('jwt-secret-value-987654')

    Reflect.deleteProperty(process.env, 'JWT_SECRET')
    const derived = createSecrets({ authSecret: 'override-secret-value-789012' })
    expect(getEffectiveJwtSecret(derived)).toBe(deriveJwtSecret('override-secret-value-789012'))
  })
  it('createSecrets prioritizes explicit overrides', () => {
    process.env.AUTH_SECRET = 'env-secret-value-123456'
    process.env.JWT_SECRET = 'env-jwt-secret-987654'
    process.env.JWKS_PATH = '/env/jwks.json'
    const secrets = createSecrets({
      authSecret: 'override-secret-value-789012',
      jwtSecret: 'explicit-jwt',
      jwksPath: '/custom/jwks.json',
    })
    expect(secrets).toMatchObject({
      authSecret: 'override-secret-value-789012',
      jwtSecret: 'explicit-jwt',
      jwksPath: '/custom/jwks.json',
    })
  })

  it('manages secrets lifecycle via SecretsManager', () => {
    process.env.AUTH_SECRET = 'env-secret-value-123456'
    const manager = new SecretsManager({})
    expect(manager.getAuthSecret()).toBe('env-secret-value-123456')
    const hash = manager.createTokenHash('token')
    expect(manager.verifyTokenHash('token', hash)).toBe(true)
    manager.updateSecrets({ authSecret: 'changed-secret-value-654321', jwksPath: '/jwks.json' })
    expect(manager.getJwksPath()).toBe('/jwks.json')
    expect(manager.getJwtSecret()).toBe(deriveJwtSecret('changed-secret-value-654321'))
  })

  it('handles global secrets manager', () => {
    process.env.AUTH_SECRET = 'env-secret-value-123456'
    const manager = getSecretsManager()
    const same = getSecretsManager()
    expect(manager).toBe(same)
    const fresh = initializeSecrets({ authSecret: 'reset-secret-value-123456' })
    expect(fresh.getAuthSecret()).toBe('reset-secret-value-123456')
  })

  it('generates sufficiently random secrets', () => {
    const secret = generateSecret(16)
    expect(secret).toHaveLength(22)
    expect(/^[A-Za-z0-9_-]+$/.test(secret)).toBe(true)
  })

  it('getJwksPath falls back to default', () => {
    expect(getJwksPath({ authSecret: 'secret-value-123456' }, 'default.json')).toBe('default.json')
    expect(getJwksPath({ authSecret: 'secret-value-123456', jwksPath: 'custom.json' })).toBe(
      'custom.json',
    )
  })
})
