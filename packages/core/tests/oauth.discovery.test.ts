import { afterEach, describe, expect, it, vi } from 'vitest'

import { discover, resolveEndpoints } from '../src/oauth/discovery'
import { parseIdToken } from '../src/oauth/idtoken'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('oauth discovery helpers', () => {
  it('discovers metadata and caches results', async () => {
    const meta = {
      authorization_endpoint: 'https://idp.example/auth',
      token_endpoint: 'https://idp.example/token',
      userinfo_endpoint: 'https://idp.example/userinfo',
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => meta })
    vi.stubGlobal('fetch', fetchMock)

    const issuer = 'https://idp.example'
    const first = await discover(issuer)
    const second = await discover(issuer)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first).toEqual(meta)
    expect(second).toEqual(meta)
  })

  it('throws when discovery fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(discover('https://broken.example')).rejects.toThrow('oidc_discovery_failed:500')
  })

  it('resolves endpoints with and without discovery metadata', async () => {
    const meta = {
      authorization_endpoint: 'https://issuer/auth',
      token_endpoint: 'https://issuer/token',
      userinfo_endpoint: 'https://issuer/user',
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => meta })
    vi.stubGlobal('fetch', fetchMock)

    const discovered = await resolveEndpoints({ discovery: { issuer: 'https://issuer' } })
    expect(discovered).toEqual({
      authorizationUrl: meta.authorization_endpoint,
      tokenUrl: meta.token_endpoint,
      userinfoUrl: meta.userinfo_endpoint,
    })

    const explicit = await resolveEndpoints({
      authorization: { url: 'https://custom/auth' },
      token: { url: 'https://custom/token' },
      userinfo: { url: 'https://custom/user' },
    })
    expect(explicit).toEqual({
      authorizationUrl: 'https://custom/auth',
      tokenUrl: 'https://custom/token',
      userinfoUrl: 'https://custom/user',
    })
  })
})

describe('id token parsing', () => {
  it('parses valid JWT payloads and tolerates bad tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: '123', email: 'user@example.com' })).toString(
      'base64url',
    )
    const token = `${header}.${payload}.signature`

    expect(parseIdToken(token)).toMatchObject({ sub: '123', email: 'user@example.com' })
    expect(parseIdToken('invalid')).toEqual({})
  })

  it('uses fallback decoding when Buffer is unavailable', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: '456', email: 'fallback@example.com' })).toString(
      'base64url',
    )
    const token = `${header}.${payload}.signature`
    vi.stubGlobal('Buffer', undefined)
    expect(parseIdToken(token)).toMatchObject({ sub: '456', email: 'fallback@example.com' })
  })
})
