import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cleanupExpiredKeys,
  createDefaultRotationPolicy,
  createKeystore,
  createOpaqueRefreshToken,
  createPublicJwks,
  createRefreshToken,
  createSigner,
  extractJwtClaims,
  extractPublicJwk,
  findKeyInKeystore,
  generateKeyPairWithKeys,
  getPublicKeysForVerification,
  hashRefreshToken,
  isPrivateJwk,
  isRefreshTokenExpired,
  isValidOpaqueTokenFormat,
  JWT_ERRORS,
  JwtError,
  needsRotation,
  parseOpaqueRefreshToken,
  RefreshTokenRotator,
  rotateKeys,
  signJwtWithKey,
  validateJwk,
  validateKeystore,
  validateRefreshTokenFormat,
  verify,
  verifyFull,
  verifyJwt,
  verifyJwtWithTiming,
} from '../src/jwt'
import type { RefreshTokenRecord } from '../src/jwt/types'

class MemoryRefreshStore implements RefreshTokenStore {
  private byHash = new Map<string, RefreshTokenRecord>()
  private families = new Map<string, RefreshTokenRecord[]>()
  private revoked = new Set<string>()

  async save(record: RefreshTokenRecord): Promise<void> {
    this.byHash.set(record.tokenHash, record)
    this.addToFamily(record)
  }

  async findByHash(hash: string): Promise<RefreshTokenRecord | null> {
    return this.byHash.get(hash) ?? null
  }

  async markRotated(jti: string): Promise<void> {
    for (const records of this.families.values()) {
      const match = records.find((rec) => rec.jti === jti)
      if (match && match.parentJti === null) {
        match.parentJti = 'ROTATED'
      }
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    this.revoked.add(familyId)
  }

  async createChild(_: RefreshTokenRecord, childRecord: RefreshTokenRecord): Promise<void> {
    this.byHash.set(childRecord.tokenHash, childRecord)
    this.addToFamily(childRecord)
  }

  async cleanupExpired(before = new Date()): Promise<number> {
    let removed = 0
    for (const [hash, record] of Array.from(this.byHash.entries())) {
      if (record.expiresAt <= before) {
        this.byHash.delete(hash)
        const family = this.families.get(record.familyId)
        if (family) {
          const idx = family.indexOf(record)
          if (idx >= 0) family.splice(idx, 1)
        }
        removed += 1
      }
    }
    return removed
  }

  async isFamilyRevoked(familyId: string): Promise<boolean> {
    return this.revoked.has(familyId)
  }

  async getFamily(familyId: string): Promise<RefreshTokenRecord[]> {
    return [...(this.families.get(familyId) ?? [])]
  }

  private addToFamily(record: RefreshTokenRecord) {
    const family = this.families.get(record.familyId) ?? []
    family.push(record)
    this.families.set(record.familyId, family)
  }
}

describe('jwt crypto workflow', () => {
  it('generates key pairs and exports JWKs safely', async () => {
    const { kid, publicKey, privateKey, publicJwk, privateJwk } =
      await generateKeyPairWithKeys('EdDSA')

    expect(publicKey.type).toBe('public')
    expect(privateKey.type).toBe('private')
    expect(publicJwk.kid).toBe(kid)
    expect(validateJwk(publicJwk, 'EdDSA')).toBe(true)
    expect(isPrivateJwk(privateJwk)).toBe(true)

    const extracted = extractPublicJwk(privateJwk)
    expect(extracted.d).toBeUndefined()

    const jwks = createPublicJwks([privateJwk])
    expect(jwks.keys).toHaveLength(1)
    expect(jwks.keys[0]).not.toHaveProperty('d')
  })

  it('rotates keystores and cleans up expired keys', async () => {
    const keystore = await createKeystore('EdDSA')
    const policy = { rotationDays: 1, overlapDays: 1 }

    keystore.active.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(needsRotation(keystore, policy)).toBe(true)

    const rotated = await rotateKeys(keystore, 'EdDSA', policy)
    expect(rotated.previous).toHaveLength(1)

    const cleaned = cleanupExpiredKeys({
      ...rotated,
      previous: [
        {
          ...rotated.previous[0]!,
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      ],
    })

    expect(cleaned.previous).toHaveLength(0)
    expect(validateKeystore(rotated)).toBe(true)
    expect(validateKeystore({} as unknown as Record<string, unknown>)).toBeFalsy()

    const activeKey = findKeyInKeystore(rotated, rotated.active.kid)
    expect(activeKey?.privateJwk).toBeDefined()

    const prevKey = findKeyInKeystore(rotated, rotated.previous[0]!.kid)
    expect(prevKey?.privateJwk).toBeUndefined()

    expect(getPublicKeysForVerification(rotated).length).toBeGreaterThanOrEqual(1)
    expect(createDefaultRotationPolicy()).toEqual({
      rotationDays: 90,
      overlapDays: 7,
    })
  })

  it('signs and verifies JWTs end-to-end', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    const { kid, publicKey, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const signer = createSigner(privateKey, publicKey, kid, 'EdDSA')

    const now = Math.floor(Date.now() / 1000)
    const claims = {
      iss: 'issuer',
      sub: 'user-1',
      iat: now,
      exp: now + 600,
      aud: 'web',
    }

    const token = await signer.sign(claims)

    const verified = await verify(token, [publicJwk])
    expect(verified.claims).toMatchObject(claims)

    const withTiming = await verifyJwtWithTiming(token, [publicJwk], 10)
    expect(withTiming.claims.exp).toBe(claims.exp)

    const full = await verifyFull(token, [publicJwk], {
      expectedIssuer: 'issuer',
      expectedAudience: 'web',
    })
    expect(full.claims.sub).toBe('user-1')

    expect(extractJwtClaims(token)).toMatchObject({ sub: 'user-1' })

    await expect(
      verifyFull(token, [publicJwk], { expectedAudience: 'mobile' }),
    ).rejects.toThrowError(JwtError)

    await expect(verify(token, [{ ...publicJwk, kid: 'other' }])).rejects.toThrowError(JwtError)

    vi.useRealTimers()
  })

  it('throws for expired and malformed JWTs', async () => {
    const { kid, publicKey, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const signer = createSigner(privateKey, publicKey, kid, 'EdDSA')

    const now = Math.floor(Date.now() / 1000)
    const expired = await signer.sign({
      iss: 'i',
      sub: 's',
      iat: now - 100,
      exp: now - 10,
    })

    await expect(verifyJwtWithTiming(expired, [publicJwk], 0)).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_EXPIRED,
      message: 'JWT token has expired',
    })
    await expect(verify('bad.token', [publicJwk])).rejects.toThrowError(JwtError)
  })

  it('manages refresh tokens and rotation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    const store = new MemoryRefreshStore()
    const secret = 'super-secret'

    const { token, record } = await createRefreshToken('user-1', secret, 60_000, {
      sessionId: 'sess-1',
      ip: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(validateRefreshTokenFormat(token)).not.toBeNull()
    expect(isRefreshTokenExpired(record)).toBe(false)

    await store.save(record)

    const rotator = new RefreshTokenRotator(store, secret)
    const rotation = await rotator.rotate(token, 120_000, {
      sessionId: 'sess-1',
      ip: '10.0.0.1',
      userAgent: 'vitest-agent',
    })

    expect(rotation.record.parentJti).toBe(record.jti)
    expect(rotation.record.sessionId).toBe('sess-1')
    expect(rotation.newToken).not.toBe(token)

    const family = await store.getFamily(record.familyId)
    expect(family).toHaveLength(2)

    await expect(rotator.rotate(token, 120_000)).rejects.toThrow(/reuse detected/i)

    await rotator.revokeFamily(record.familyId)
    await expect(rotator.rotate(rotation.newToken, 120_000)).rejects.toThrow(/family revoked/i)

    for (const recordEntry of await store.getFamily(record.familyId)) {
      recordEntry.expiresAt = new Date(Date.now() - 1000)
      ;(store as any).byHash.set(recordEntry.tokenHash, recordEntry)
    }
    expect(await rotator.cleanup(new Date())).toBeGreaterThan(0)

    vi.useRealTimers()
  })

  it('produces hashed refresh tokens deterministically', async () => {
    const token = 'opaque-token'
    const secret = 'hash-secret'
    const hash = await hashRefreshToken(token, secret)
    const again = await hashRefreshToken(token, secret)
    expect(hash).toBe(again)
    expect(hash).not.toBe(token)
  })
})

describe('opaque token helpers', () => {
  it('parses opaque refresh tokens and validates format', () => {
    const familyId = crypto.randomUUID()
    const jti = crypto.randomUUID()
    const token = createOpaqueRefreshToken(familyId, jti)
    const parsed = parseOpaqueRefreshToken(token)
    expect(parsed).toMatchObject({ familyId, jti })
    expect(isValidOpaqueTokenFormat(token)).toBe(true)
    expect(parseOpaqueRefreshToken('only-two.parts')).toBeNull()
    expect(isValidOpaqueTokenFormat('..')).toBe(false)
  })
})

describe('jwt verification edge cases', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('rejects tokens without three segments', async () => {
    await expect(verifyJwt('a.b', [])).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_MALFORMED,
    })
  })

  it('rejects tokens with empty parts', async () => {
    await expect(verifyJwt('..', [])).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_MALFORMED,
    })
  })

  it('rejects tokens with invalid header', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ iss: 'i', sub: 's', iat: 1, exp: 2 })).toString(
      'base64url',
    )
    const token = `${header}.${payload}.sig`
    await expect(verifyJwt(token, [])).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_MALFORMED,
    })
  })

  it('rejects tokens with invalid claims structure', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', kid: 'k', typ: 'JWT' })).toString(
      'base64url',
    )
    const payload = Buffer.from(JSON.stringify({ iss: 1 })).toString('base64url')
    const token = `${header}.${payload}.sig`
    await expect(
      verifyJwt(token, [
        {
          kid: 'k',
          alg: 'EdDSA',
          use: 'sig',
          kty: 'OKP',
          crv: 'Ed25519',
          x: 'AA',
        },
      ]),
    ).rejects.toMatchObject({ code: JWT_ERRORS.JWT_MALFORMED })
  })

  it('rejects when key id is unknown', async () => {
    const { kid, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const token = await signJwtWithKey(
      { iss: 'i', sub: 's', iat: 1, exp: 10 },
      privateKey,
      kid,
      'EdDSA',
    )
    await expect(verifyJwt(token, [{ ...publicJwk, kid: 'other' }])).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_UNKNOWN_KID,
    })
  })

  it('rejects when public key import fails', async () => {
    const { kid, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const token = await signJwtWithKey(
      { iss: 'i', sub: 's', iat: 1, exp: 10 },
      privateKey,
      kid,
      'EdDSA',
    )
    const importer = vi.spyOn(crypto.subtle, 'importKey').mockImplementationOnce(() => {
      return Promise.reject(new Error('bad key')) as any
    })
    await expect(verifyJwt(token, [publicJwk])).rejects.toMatchObject({
      code: JWT_ERRORS.KEYSTORE_INVALID_KEY,
    })
    importer.mockRestore()
  })

  it('rejects when signature is invalid', async () => {
    const { kid, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const token = await signJwtWithKey(
      { iss: 'i', sub: 's', iat: 1, exp: 10 },
      privateKey,
      kid,
      'EdDSA',
    )
    const other = await generateKeyPairWithKeys('EdDSA')
    const mismatched = { ...other.publicJwk, kid }
    await expect(verifyJwt(token, [mismatched])).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_INVALID_SIGNATURE,
    })
  })

  it('rejects for not-before claims outside skew', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const now = Math.floor(Date.now() / 1000)
    const { kid, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const token = await signJwtWithKey(
      { iss: 'i', sub: 's', iat: now, exp: now + 600, nbf: now + 600 },
      privateKey,
      kid,
      'EdDSA',
    )
    await expect(verifyJwtWithTiming(token, [publicJwk], 30)).rejects.toMatchObject({
      code: JWT_ERRORS.JWT_NOT_BEFORE,
    })
  })

  it('rejects on issuer and audience mismatch', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const now = Math.floor(Date.now() / 1000)
    const { kid, privateKey, publicJwk } = await generateKeyPairWithKeys('EdDSA')
    const token = await signJwtWithKey(
      { iss: 'issuer', sub: 's', aud: 'web', iat: now, exp: now + 600 },
      privateKey,
      kid,
      'EdDSA',
    )
    await expect(verifyFull(token, [publicJwk], { expectedIssuer: 'other' })).rejects.toMatchObject(
      { code: JWT_ERRORS.JWT_INVALID_ISSUER },
    )
    await expect(
      verifyFull(token, [publicJwk], { expectedAudience: 'mobile' }),
    ).rejects.toMatchObject({ code: JWT_ERRORS.JWT_INVALID_AUDIENCE })
  })

  it('extractJwtClaims throws for malformed tokens and payloads', () => {
    expect(() => extractJwtClaims('bad.token')).toThrow('Invalid JWT format')
    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', kid: 'k', typ: 'JWT' })).toString(
      'base64url',
    )
    const payload = Buffer.from(JSON.stringify({ iss: 1 })).toString('base64url')
    expect(() => extractJwtClaims(`${header}.${payload}.sig`)).toThrow(
      'Invalid JWT claims structure',
    )
  })
})

describe('jwt signer helpers', () => {
  it('exposes metadata and allows exporting keys', async () => {
    const keyPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
    const kid = crypto.randomUUID()
    const signer = createSigner(keyPair.privateKey, keyPair.publicKey, kid, 'ES256')
    const token = await signer.sign({
      iss: 'issuer',
      sub: 'subject',
      iat: 1,
      exp: 10,
    })
    expect(typeof token).toBe('string')
    expect(signer.getKid()).toBe(kid)
    expect(signer.getAlgorithm()).toBe('ES256')

    const exportedPublic = await signer.exportPublicJwk()
    expect(exportedPublic.kid).toBe(kid)
    expect(exportedPublic.alg).toBe('ES256')

    const exportedPrivate = await signer.exportPrivateJwk()
    expect(exportedPrivate.kid).toBe(kid)
    expect(exportedPrivate.d).toBeDefined()
  })

  it('signJwtWithKey produces tokens for provided algorithm', async () => {
    const keyPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
    const kid = crypto.randomUUID()
    const claims = { iss: 'issuer', sub: 'user', iat: 1, exp: 2 }
    const token = await signJwtWithKey(claims, keyPair.privateKey, kid, 'ES256')
    expect(token.split('.')).toHaveLength(3)
  })

  it('validates jwk structure by algorithm', () => {
    expect(validateJwk({} as any, 'EdDSA')).toBe(false)
    expect(validateJwk({ kid: '1', kty: 'OKP', crv: 'Ed25519', x: 'AA' } as any, 'EdDSA')).toBe(
      true,
    )
    expect(validateJwk({ kid: '1', kty: 'EC', crv: 'P-256', x: 'x', y: 'y' } as any, 'ES256')).toBe(
      true,
    )
    expect(validateJwk({ kid: '1', kty: 'EC', crv: 'P-256', x: 'x' } as any, 'ES256')).toBe(false)
  })
})
