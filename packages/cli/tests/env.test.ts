import { describe, expect, it } from 'vitest'
import { genJWKS, genSecret } from '../src/lib/env'

describe('env helpers', () => {
  it('generates base64url secrets', () => {
    const secret = genSecret()
    expect(secret).toHaveLength(43)
    expect(/^[A-Za-z0-9_-]+$/.test(secret)).toBe(true)
  })

  it('creates placeholder JWKS pair', () => {
    const { privateJwks, publicJwks } = genJWKS()
    expect(privateJwks.keys).toHaveLength(1)
    expect(publicJwks.keys[0].kid).toBe(privateJwks.keys[0].kid)
  })
})
