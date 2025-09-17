import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const originalFetch = global.fetch

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
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
    expect((init as RequestInit).headers).toMatchObject({
      'content-type': 'application/x-www-form-urlencoded',
    })
    expect(
      typeof (init as any).body.append === 'function' || typeof (init as any).body === 'string',
    ).toBe(true)
  })

  it('allows providers to customise the token request body', async () => {
    const provider = {
      ...baseProvider,
      token: {
        ...baseProvider.token,
        customizeBody: (body: Record<string, unknown>) => ({ ...body, extra: 'value' }),
      },
    }
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'A' }) })
    // @ts-expect-error
    global.fetch = mock

    await exchangeToken(provider, 'CODE', 'http://cb', 'ver')
    const [, init] = mock.mock.calls[0]
    const parsed = JSON.parse((init as RequestInit).body as string)
    expect(parsed.extra).toBe('value')
  })

  it('throws when token exchange fails', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false })
    // @ts-expect-error
    global.fetch = mock

    await expect(exchangeToken(baseProvider, 'CODE', 'http://cb', 'ver')).rejects.toThrow(
      'token_exchange_failed',
    )
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

  it('maps profiles from id_token when no userinfo endpoint', async () => {
    const provider = {
      ...baseProvider,
      userinfo: undefined,
      profileFromIdToken: (claims: any) => ({ id: claims.sub, email: claims.email }),
    }
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'ignored' }) })
    // @ts-expect-error
    global.fetch = mock

    const idTokenPayload = Buffer.from(
      JSON.stringify({ sub: '123', email: 'u@test.dev' }),
    ).toString('base64url')
    const token = `aaa.${idTokenPayload}.bbb`
    const profile = await fetchUserInfo(provider, { access_token: 'tok', id_token: token })
    expect(profile).toEqual({ id: '123', email: 'u@test.dev' })
    expect(mock).not.toHaveBeenCalled()
  })

  it('returns null when no userinfo endpoint or id token', async () => {
    const provider = { ...baseProvider, userinfo: undefined }
    const profile = await fetchUserInfo(provider, { access_token: 'tok' })
    expect(profile).toBeNull()
  })

  it('throws when userinfo response is not ok', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: false })
    // @ts-expect-error
    global.fetch = mock

    await expect(fetchUserInfo(baseProvider, { access_token: 'tok' })).rejects.toThrow(
      'userinfo_failed',
    )
  })
})
