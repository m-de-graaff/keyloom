import { describe, expect, it, vi } from 'vitest'
import { startOAuth, completeOAuth } from '../../src/oauth/flow'
import type { OAuthProvider } from '../../src/oauth/types'
import { memoryAdapter } from '../../src/adapters/memory'

const provider: OAuthProvider & { clientId: string; clientSecret: string } = {
  id: 'dev',
  authorization: { url: 'https://example.com/authorize' },
  token: { url: 'https://example.com/token', style: 'json' },
  userinfo: { url: 'https://example.com/userinfo', map: (raw) => ({ id: raw.id, email: raw.email ?? null }) },
  scopes: [],
  clientId: 'id',
  clientSecret: 'secret',
}

const baseUrl = 'https://app.test'
const callbackPath = `/api/auth/oauth/${provider.id}/callback`
const secrets = { authSecret: '0123456789abcdef0123456789abcdef' }

describe('oauth/flow', () => {
  it('startOAuth builds authorize URL and state cookie', async () => {
    const { authorizeUrl, stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const u = new URL(authorizeUrl)
    expect(u.origin + u.pathname).toBe('https://example.com/authorize')
    expect(u.searchParams.get('client_id')).toBe('id')
    expect(u.searchParams.get('redirect_uri')).toBe(`${baseUrl}${callbackPath}`)
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('state')).toBeTruthy()
    expect(stateCookie.startsWith('__keyloom_oauth=')).toBe(true)
  })

  it('completeOAuth creates a session and returns redirect', async () => {
    // Mock the client module used by flow
    vi.mock('../../src/oauth/client', () => ({
      exchangeToken: vi.fn().mockResolvedValue({ access_token: 'A', token_type: 'Bearer' }),
      fetchUserInfo: vi.fn().mockResolvedValue({ id: 'user-1', email: 'u@test.dev' }),
    }))

    const adapter = memoryAdapter()
    const { authorizeUrl, stateCookie } = await startOAuth({ provider, baseUrl, callbackPath, secrets })
    const state = (stateCookie.split('=')[1] ?? '').split(';')[0]
    const code = 'CODE'

    const { session, redirectTo } = await completeOAuth({
      provider,
      adapter,
      baseUrl,
      callbackPath,
      stateCookie: state,
      stateParam: state,
      code,
      secrets,
    })

    expect(session.id).toBeTruthy()
    expect(redirectTo).toBe('/')
  })
})

