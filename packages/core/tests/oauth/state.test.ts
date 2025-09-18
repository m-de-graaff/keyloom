import { describe, expect, it } from 'vitest'
import { openState, sealState } from '../../src/oauth/state'

describe('oauth/state', () => {
  const key = new Uint8Array(32).fill(7)
  const payload = { p: 'dev', v: 'verifier', t: Date.now(), r: '/dash' as string | undefined }

  it('seal/open roundtrip', async () => {
    const sealed = await sealState(key, payload)
    const opened = await openState(key, sealed.nonce, sealed.ct)
    expect(opened.p).toBe(payload.p)
    expect(opened.v).toBe(payload.v)
    expect(opened.r).toBe(payload.r)
  })

  it('rejects tampered ciphertext', async () => {
    const sealed = await sealState(key, payload)
    const tamperedBytes = Buffer.from(sealed.ct, 'base64url')
    if (tamperedBytes.length === 0) throw new Error('seal produced empty ciphertext')
    tamperedBytes[0] ^= 0x01
    const tamperedCt = Buffer.from(tamperedBytes).toString('base64url')
    await expect(openState(key, sealed.nonce, tamperedCt)).rejects.toThrow()
  })
})