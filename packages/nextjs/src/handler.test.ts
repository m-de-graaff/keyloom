import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNextHandler } from './handler'

vi.mock('@keyloom/core', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    startOAuth: vi.fn().mockResolvedValue({
      authorizeUrl: 'https://provider.example/authorize?foo=bar',
      stateCookie: '__keyloom_oauth=STATE123; Path=/; SameSite=Lax; HttpOnly; Secure',
    }),
    completeOAuth: vi.fn().mockResolvedValue({
      session: { id: 'sess_123' },
      redirectTo: '/dashboard',
    }),
  }
})

const config: any = {
  baseUrl: 'https://app.test',
  secrets: { authSecret: 'test-secret' },
  session: { strategy: 'database' as const },
  adapter: { __dummy: true },
  providers: [{ id: 'dev' }],
}

describe('nextjs/handler oauth', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('GET oauth start -> 302 and sets state cookie', async () => {
    const { GET } = createNextHandler(config)
    const req = {
      url: 'https://app.test/api/auth/oauth/dev/start?callbackUrl=/dashboard',
      headers: new Headers(),
    } as any
    const res = await GET(req)
    expect(res.status).toBe(307)

    const setCookies = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie') ?? ''
    const cookiesStr = Array.isArray(setCookies) ? setCookies.join(';') : setCookies
    expect(cookiesStr).toContain('__keyloom_oauth=')
  })

  it('GET oauth callback -> 302, sets session cookie and clears state', async () => {
    const { GET } = createNextHandler(config)
    const req = {
      url: 'https://app.test/api/auth/oauth/dev/callback?code=abc&state=STATE123',
      headers: new Headers({ cookie: '__keyloom_oauth=STATE123' }),
    } as any

    const res = await GET(req)
    expect(res.status).toBe(307)

    const setCookies = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie') ?? ''
    const cookies = Array.isArray(setCookies) ? setCookies : [setCookies]
    const all = cookies.join(';')
    expect(all).toMatch(/__keyloom_session=.*SameSite=Lax/i)
    expect(all).toContain('__keyloom_oauth=;')
    expect(all.toLowerCase()).toContain('max-age=0')
  })
})
