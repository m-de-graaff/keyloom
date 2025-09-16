import { describe, expect, it } from 'vitest'
import { createPkce } from '../../src/oauth/pkce'

const b64url = /^[A-Za-z0-9_-]+$/

describe('oauth/pkce', () => {
  it('creates verifier and S256 challenge', async () => {
    const { verifier, challenge, method } = await createPkce()
    expect(method).toBe('S256')
    expect(verifier.length).toBeGreaterThan(20)
    expect(challenge.length).toBeGreaterThan(20)
    expect(b64url.test(verifier)).toBe(true)
    expect(b64url.test(challenge)).toBe(true)

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    const recomputed = Buffer.from(new Uint8Array(digest)).toString('base64url')
    expect(challenge).toBe(recomputed)
  })
})
