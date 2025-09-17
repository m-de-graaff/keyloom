import { afterEach, describe, expect, it, vi } from 'vitest'
import { memoryAdapter } from '../../src/adapters/memory'
import { completeOAuth, startOAuth } from '../../src/oauth/flow'
import type { OAuthProvider } from '../../src/oauth/types'

const provider: OAuthProvider & { clientId: string; clientSecret: string } = {
  id: 'dev',
  authorization: { url: 'https://example.com/authorize' },
  token: { url: 'https://example.com/token', style: 'json' },
  userinfo: {
    url: 'https://example.com/userinfo',
    map: (raw) => ({ id: raw.id, email: raw.email ?? null }),
  },
  scopes: [],
  clientId: 'id',
  clientSecret: 'secret',
}

const baseUrl = 'https://app.test'
const callbackPath = `/api/auth/oauth/${provider.id}/callback`
const secrets = { authSecret: '0123456789abcdef0123456789abcdef' }

afterEach(() => {
  vi.resetModules()
  vi.unmock('../../src/oauth/client')
  vi.useRealTimers()
})

describe('oauth/flow', () => {
  it('startOAuth builds authorize URL and state cookie', async () => {
    const { authorizeUrl, stateCookie } = await startOAuth({
      provider,
      baseUrl,
      callbackPath,
      secrets,
    })
    const u = new URL(authorizeUrl)
    expect(u.origin + u.pathname).toBe('https://example.com/authorize')
    expect(u.searchParams.get('client_id')).toBe('id')
    expect(u.searchParams.get('redirect_uri')).toBe(`${baseUrl}${callbackPath}`)
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('state')).toBeTruthy()
    expect(stateCookie.startsWith('__keyloom_oauth=')).toBe(true)
  })

  it('completeOAuth creates a session and returns redirect', async () => {
    vi.mock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({ access_token: 'A', token_type: 'Bearer' }),
      fetchUserInfo: vi.fn().mockResolvedValue({ id: 'user-1', email: 'u@test.dev' }),
    }))

    const adapter = memoryAdapter()
    const { stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    const { session, redirectTo } = await completeOAuth({
      provider,
      adapter,
      baseUrl,
      callbackPath,
      stateCookie: state,
      stateParam: state,
      code: 'CODE',
      secrets,
    })

    expect(session.id).toBeTruthy()
    expect(redirectTo).toBe('/')
  })

  it('completeOAuth links accounts for signed-in users', async () => {
    vi.doMock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({ access_token: 'A', expires_in: 10 }),
      fetchUserInfo: vi.fn().mockResolvedValue({ id: 'acct-1', email: 'link@test.dev' }),
    }))

    const adapter = {
      getAccountByProvider: vi.fn().mockResolvedValue(null),
      getUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
      linkAccount: vi.fn().mockResolvedValue(undefined),
      createSession: vi.fn().mockResolvedValue({ id: 'sess-1' }),
    } as unknown as ReturnType<typeof memoryAdapter>

    const { stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    const result = await completeOAuth({
      provider,
      adapter: adapter as any,
      baseUrl,
      callbackPath,
      stateCookie: state,
      stateParam: state,
      code: 'CODE',
      secrets,
      linkToUserId: 'user-123',
    })

    expect(result.session.id).toBe('sess-1')
    expect(adapter.linkAccount).toHaveBeenCalled()
  })

  it('rejects linking when target user not found', async () => {
    vi.doMock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({ access_token: 'A' }),
      fetchUserInfo: vi.fn().mockResolvedValue({ id: 'acct-1' }),
    }))

    const adapter = {
      getAccountByProvider: vi.fn().mockResolvedValue(null),
      getUser: vi.fn().mockResolvedValue(null),
      linkAccount: vi.fn(),
      createSession: vi.fn(),
    } as unknown as ReturnType<typeof memoryAdapter>

    const { stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    await expect(
      completeOAuth({
        provider,
        adapter: adapter as any,
        baseUrl,
        callbackPath,
        stateCookie: state,
        stateParam: state,
        code: 'CODE',
        secrets,
        linkToUserId: 'missing-user',
      }),
    ).rejects.toThrow('link_target_not_found')
  })

  it('rejects when account already linked to different user', async () => {
    vi.doMock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({ access_token: 'A' }),
      fetchUserInfo: vi.fn().mockResolvedValue({ id: 'acct-1' }),
    }))

    const adapter = {
      getAccountByProvider: vi.fn().mockResolvedValue({ userId: 'other-user' }),
      getUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
      linkAccount: vi.fn(),
      createSession: vi.fn(),
    } as unknown as ReturnType<typeof memoryAdapter>

    const { stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]

    await expect(
      completeOAuth({
        provider,
        adapter: adapter as any,
        baseUrl,
        callbackPath,
        stateCookie: state,
        stateParam: state,
        code: 'CODE',
        secrets,
        linkToUserId: 'user-123',
      }),
    ).rejects.toThrow('account_already_linked')
  })

  it('rejects when state tokens mismatch or are malformed', async () => {
    await expect(
      completeOAuth({
        provider,
        adapter: memoryAdapter(),
        baseUrl,
        callbackPath,
        stateCookie: null,
        stateParam: 'anything',
        code: 'CODE',
        secrets,
      }),
    ).rejects.toThrow('state_mismatch')

    await expect(
      completeOAuth({
        provider,
        adapter: memoryAdapter(),
        baseUrl,
        callbackPath,
        stateCookie: 'same',
        stateParam: 'same',
        code: 'CODE',
        secrets,
      }),
    ).rejects.toThrow('state_bad_format')
  })

  it('rejects for wrong provider or expired state', async () => {
    const { stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]
    const [nonce, ct] = state.split('.') as [string, string]

    await expect(
      completeOAuth({
        provider: { ...provider, id: 'other' },
        adapter: memoryAdapter(),
        baseUrl,
        callbackPath,
        stateCookie: state,
        stateParam: state,
        code: 'CODE',
        secrets,
      }),
    ).rejects.toThrow('state_wrong_provider')

    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.now() + 11 * 60_000))
    await expect(
      completeOAuth({
        provider,
        adapter: memoryAdapter(),
        baseUrl,
        callbackPath,
        stateCookie: state,
        stateParam: `${nonce}.${ct}`,
        code: 'CODE',
        secrets,
      }),
    ).rejects.toThrow('state_expired')
  })
})
