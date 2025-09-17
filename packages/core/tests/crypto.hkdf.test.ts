import { describe, expect, it } from 'vitest'

import { hkdfSha256 } from '../src/crypto/hkdf'

describe('hkdfSha256', () => {
  it('derives keys with expected length', async () => {
    const ikm = new Uint8Array([1, 2, 3, 4])
    const salt = new Uint8Array([5, 6, 7, 8])
    const info = new Uint8Array([9, 10])

    const derived = await hkdfSha256(ikm, salt, info, 16)
    expect(derived).toBeInstanceOf(Uint8Array)
    expect(derived.length).toBe(16)
    expect(Array.from(derived).some((v) => v !== 0)).toBe(true)
  })
})
