import { describe, expect, it, vi } from 'vitest'

import { notImplementedSigner } from '../src/crypto/jwt'
import {
  base64urlDecode,
  base64urlDecodeToString,
  base64urlEncode,
  decodeBase64urlToJson,
  encodeJsonToBase64url,
} from '../src/jwt/base64url'
import {
  isExpired,
  isNotYetValid,
  newAccessClaims,
  parseDurationToSeconds,
  validateAudience,
  validateClaimsTiming,
  validateIssuer,
  validateJwtClaims,
} from '../src/jwt/claims'
import { isJwtError, JWT_ERRORS, JwtError, throwJwtError } from '../src/jwt/errors'
import {
  createJwtHeader,
  getKeyGenParams,
  getWebCryptoAlgorithm,
  validateJwtHeader,
} from '../src/jwt/header'

describe('jwt base utilities', () => {
  it('encodes and decodes base64url payloads', () => {
    const encoded = base64urlEncode('hello')
    expect(encoded).toBe('aGVsbG8')
    expect(base64urlDecodeToString(encoded)).toBe('hello')

    const rawBytes = new Uint8Array([1, 2, 3, 4])
    const encodedBytes = base64urlEncode(rawBytes)
    expect(Array.from(base64urlDecode(encodedBytes))).toEqual(Array.from(rawBytes))

    const data = { foo: 'bar', count: 1 }
    const json = encodeJsonToBase64url(data)
    expect(JSON.parse(base64urlDecodeToString(json))).toEqual(data)
    expect(decodeBase64urlToJson(json)).toEqual(data)
  })

  it('parses duration strings into seconds', () => {
    expect(parseDurationToSeconds('30s')).toBe(30)
    expect(parseDurationToSeconds('5m')).toBe(300)
    expect(parseDurationToSeconds('2h')).toBe(7200)
    expect(parseDurationToSeconds('3d')).toBe(259200)
    expect(() => parseDurationToSeconds('bad')).toThrow(/Invalid duration/)
  })

  it('generates and validates access claims', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const claims = newAccessClaims({
      iss: 'issuer',
      sub: 'user-1',
      sid: 'session',
      org: 'org-1',
      role: 'admin',
      aud: ['app'],
      ttlSec: 120,
    })

    expect(claims).toMatchObject({
      iss: 'issuer',
      sub: 'user-1',
      aud: ['app'],
      sid: 'session',
      org: 'org-1',
      role: 'admin',
      iat: 1704067200,
      exp: 1704067320,
    })

    expect(validateJwtClaims(claims)).toBe(true)
    expect(validateJwtClaims(null)).toBe(false)
    expect(validateJwtClaims({ iss: 'a', sub: 1 })).toBe(false)

    vi.useRealTimers()
  })

  it('checks expiration and not-before windows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    const baseClaims = {
      iss: 'issuer',
      sub: 'user',
      iat: 1704067200,
      exp: 1704067800,
    }

    expect(isExpired(baseClaims)).toBe(false)

    vi.setSystemTime(new Date('2024-01-01T01:00:00Z'))
    expect(isExpired(baseClaims)).toBe(true)

    const futureNbf = Math.floor(new Date('2024-01-01T01:30:00Z').getTime() / 1000)
    const notYetClaims = { ...baseClaims, exp: futureNbf + 600, nbf: futureNbf }

    vi.setSystemTime(new Date('2024-01-01T00:30:00Z'))
    expect(isNotYetValid(notYetClaims)).toBe(true)

    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    expect(() => validateClaimsTiming({ ...baseClaims, exp: 1704067200 - 10 }, 0)).toThrow(
      'JWT token has expired',
    )

    vi.setSystemTime(new Date('2024-01-01T00:30:00Z'))
    expect(() => validateClaimsTiming(notYetClaims, 0)).toThrow('JWT token is not yet valid')

    vi.useRealTimers()
  })

  it('validates issuer and audience values', () => {
    const claims = {
      iss: 'issuer',
      sub: 'user',
      iat: 1,
      exp: 2,
      aud: ['web', 'mobile'],
    }

    expect(() => validateIssuer(claims, 'issuer')).not.toThrow()
    expect(() => validateIssuer(claims, 'other')).toThrow(/Invalid issuer/)

    expect(() => validateAudience(claims, 'web')).not.toThrow()
    expect(() => validateAudience(claims, ['mobile', 'web'])).not.toThrow()
    expect(() => validateAudience(claims, 'desktop')).toThrow(/Invalid audience/)
    expect(() => validateAudience(claims, undefined)).not.toThrow()
  })

  it('creates and validates jwt headers', () => {
    const header = createJwtHeader('EdDSA', 'kid-1')
    expect(header).toEqual({ alg: 'EdDSA', kid: 'kid-1', typ: 'JWT' })
    expect(validateJwtHeader(header)).toBe(true)
    expect(validateJwtHeader({ alg: 'foo', kid: 1, typ: 'JWT' })).toBe(false)

    expect(getWebCryptoAlgorithm('EdDSA')).toEqual({ name: 'Ed25519' })
    expect(getWebCryptoAlgorithm('ES256')).toEqual({ name: 'ECDSA', hash: 'SHA-256' })
    expect(() => getWebCryptoAlgorithm('foo' as never)).toThrow(/Unsupported JWT algorithm/)

    expect(getKeyGenParams('EdDSA')).toEqual({ name: 'Ed25519' })
    expect(getKeyGenParams('ES256')).toEqual({ name: 'ECDSA', namedCurve: 'P-256' })
    expect(() => getKeyGenParams('foo' as never)).toThrow(/Unsupported JWT algorithm/)
  })

  it('wraps jwt errors consistently', () => {
    const err = new JwtError(JWT_ERRORS.JWT_MALFORMED, 'bad token')
    expect(isJwtError(err)).toBe(true)
    expect(err.code).toBe('jwt_malformed')

    expect(() => throwJwtError(JWT_ERRORS.JWT_INVALID_SIGNATURE, 'nope')).toThrowError(JwtError)
  })

  it('decodes raw base64url into bytes', () => {
    const bytes = base64urlDecode('AAEC')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(Array.from(bytes)).toEqual([0, 1, 2])
  })

  it('provides a not-implemented signer placeholder', async () => {
    await expect(notImplementedSigner.sign({ iss: 'i', sub: 's', iat: 1, exp: 2 })).rejects.toThrow(
      /not implemented/i,
    )
    await expect(notImplementedSigner.verify('token')).rejects.toThrow(/not implemented/i)
    await expect(notImplementedSigner.exportPublicJwks()).resolves.toEqual({ keys: [] })
  })
})
