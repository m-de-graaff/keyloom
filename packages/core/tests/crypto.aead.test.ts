import { describe, expect, it } from 'vitest'

import { aesGcmOpen, aesGcmSeal } from '../src/crypto/aead'

const encoder = new TextEncoder()

describe('aes-gcm helpers', () => {
  it('seals and opens payloads with optional AAD', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32))
    const payload = encoder.encode('super-secret')
    const aad = encoder.encode('aad')

    const sealed = await aesGcmSeal(key, payload, aad)
    expect(sealed.nonce).toBeTruthy()
    expect(sealed.ct).toBeTruthy()

    const opened = await aesGcmOpen(key, sealed.nonce, sealed.ct, aad)
    expect(new TextDecoder().decode(opened)).toBe('super-secret')

    const sealedNoAad = await aesGcmSeal(key, payload)
    const openedNoAad = await aesGcmOpen(key, sealedNoAad.nonce, sealedNoAad.ct)
    expect(new TextDecoder().decode(openedNoAad)).toBe('super-secret')
  })

  it('fails to open with incorrect nonce', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32))
    const payload = encoder.encode('payload')
    const { nonce, ct } = await aesGcmSeal(key, payload)
    const badNonce = nonce.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))
    await expect(aesGcmOpen(key, badNonce, ct)).rejects.toThrow()
  })
})
