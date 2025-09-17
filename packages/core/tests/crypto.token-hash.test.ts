import { describe, expect, it } from 'vitest'
import { tokenHash } from '../src/crypto/token-hash'

describe('tokenHash', () => {
  it('creates deterministic base64url hash', async () => {
    const hash1 = await tokenHash('token', 'secret')
    const hash2 = await tokenHash('token', 'secret')
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})
