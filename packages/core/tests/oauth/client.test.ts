import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exchangeToken, fetchUserInfo } from '../../src/oauth/client'
import type { OAuthProvider } from '../../src/oauth/types'

const baseProvider: OAuthProvider & { clientId: string; clientSecret: string } = {
  id: 'dev',
  authorization: { url: 'http://auth' },
  token: { url: 'http://token', style: 'json' },
  userinfo: { url: 'http://userinfo', map: (raw) => ({ id: raw.id }) },
  scopes: [],
  clientId: 'id',
  clientSecret: 'secret',
}

const ogFetch = global.fetch

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('oauth/client', () => {
  it('exchangeToken sends JSON when style=json', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'A' }) })
    // @ts-expect-error
    global.fetch = mock

    const out = await exchangeToken(baseProvider, 'CODE', 'http://cb', 'ver')
    expect(out.access_token).toBe('A')

    const [url, init] = mock.mock.calls[0]
    expect(url).toBe('http://token')
    expect((init as RequestInit).headers).toMatchObject({ 'content-type': 'application/json' })
    expect((init as RequestInit).method).toBe('POST')
  })

  it('exchangeToken sends form when style=form', async () => {
    const provider = { ...baseProvider, token: { url: 'http://token', style: 'form' as const } }
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'A' }) })
    // @ts-expect-error
    global.fetch = mock

    await exchangeToken(provider, 'CODE', 'http://cb', 'ver')
    const [, init] = mock.mock.calls[0]
    expect((init as RequestInit).headers).toMatchObject({ 'content-type': 'application/x-www-form-urlencoded' })
    expect(typeof (init as any).body.append === 'function' || typeof (init as any).body === 'string').toBe(true)
  })

  it('fetchUserInfo sends bearer token', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'u1' }) })
    // @ts-expect-error
    global.fetch = mock

    const profile = await fetchUserInfo(baseProvider, { access_token: 'tok' })
    expect(profile).toEqual({ id: 'u1' })
    const [, init] = mock.mock.calls[0]
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' })
  })
})

