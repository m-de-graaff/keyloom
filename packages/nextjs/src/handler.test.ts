import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNextHandler } from './handler'

const mocks = vi.hoisted(() => ({
  startOAuth: vi.fn().mockResolvedValue({
    authorizeUrl: 'https://provider.example/authorize?foo=bar',
    stateCookie: '__keyloom_oauth=STATE123; Path=/; SameSite=Lax; HttpOnly; Secure',
  }),
  completeOAuth: vi.fn().mockResolvedValue({
    session: { id: 'sess_123' },
    redirectTo: '/dashboard',
  }),
  getCurrentSession: vi.fn(),
  doRegister: vi.fn().mockResolvedValue({ user: { id: 'user_1' }, requiresVerification: false }),
  doLogin: vi.fn().mockResolvedValue({ session: { id: 'sess_login' } }),
  doLogout: vi.fn().mockResolvedValue(undefined),
  issueCsrfToken: vi.fn().mockReturnValue('csrf-token'),
  validateDoubleSubmit: vi.fn().mockReturnValue(true),
}))

vi.mock('@keyloom/core', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    startOAuth: mocks.startOAuth,
    completeOAuth: mocks.completeOAuth,
  }
})
vi.mock('@keyloom/core/runtime/current-session', () => ({
  getCurrentSession: mocks.getCurrentSession,
}))
vi.mock('@keyloom/core/runtime/register', () => ({ register: mocks.doRegister }))
vi.mock('@keyloom/core/runtime/login', () => ({ login: mocks.doLogin }))
vi.mock('@keyloom/core/runtime/logout', () => ({ logout: mocks.doLogout }))
vi.mock('@keyloom/core/guard/csrf', () => ({
  issueCsrfToken: mocks.issueCsrfToken,
  validateDoubleSubmit: mocks.validateDoubleSubmit,
}))

const config: any = {
  baseUrl: 'https://app.test',
  secrets: { authSecret: 'test-secret' },
  session: { strategy: 'database' as const, ttlMinutes: 45 },
  adapter: { __dummy: true },
  providers: [{ id: 'dev' }],
  cookie: { sameSite: 'strict' as const },
}

describe('nextjs handler', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.validateDoubleSubmit.mockReturnValue(true)
  })

  it('serves current session JSON', async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({ session: { id: 'sess' } })
    const { GET } = createNextHandler(config)
    const res = await GET({
      url: 'https://app.test/api/auth/session',
      headers: new Headers({ cookie: '__keyloom_session=sess' }),
    } as any)
    expect(await res.json()).toEqual({ session: { id: 'sess' } })
    expect(mocks.getCurrentSession).toHaveBeenCalledWith('sess', config.adapter)
  })

  it('creates csrf token and sets cookie', async () => {
    const { GET } = createNextHandler(config)
    const res = await GET({
      url: 'https://app.test/api/auth/csrf',
      headers: new Headers(),
    } as any)
    expect(await res.json()).toEqual({ csrfToken: 'csrf-token' })
    const cookies = res.headers.get('set-cookie') ?? ''
    expect(cookies).toContain('__keyloom_csrf=csrf-token')
  })

  it('GET oauth start and callback flows', async () => {
    const { GET } = createNextHandler(config)
    const startReq = {
      url: 'https://app.test/api/auth/oauth/dev/start?callbackUrl=/dashboard',
      headers: new Headers(),
    } as any
    const startRes = await GET(startReq)
    expect(startRes.status).toBe(307)
    expect(mocks.startOAuth).toHaveBeenCalled()

    const callbackReq = {
      url: 'https://app.test/api/auth/oauth/dev/callback?code=abc&state=STATE123',
      headers: new Headers({ cookie: '__keyloom_oauth=STATE123' }),
    } as any
    const callbackRes = await GET(callbackReq)
    expect(callbackRes.status).toBe(307)
    const cookies = callbackRes.headers.get('set-cookie') ?? ''
    expect(cookies).toContain('__keyloom_session=')
    expect(mocks.completeOAuth).toHaveBeenCalled()
  })

  it('POST oauth callback via form data', async () => {
    const { POST } = createNextHandler(config)
    const form = new Map([
      ['code', 'abc'],
      ['state', 'STATE123'],
    ])
    const req = {
      url: 'https://app.test/api/auth/oauth/dev/callback',
      headers: new Headers({ cookie: '__keyloom_oauth=STATE123' }),
      formData: async () => ({
        get: (key: string) => form.get(key),
      }),
    } as any
    const res = await POST(req)
    expect(res.status).toBe(307)
    expect(mocks.completeOAuth).toHaveBeenCalled()
  })

  it('rejects POST without CSRF tokens', async () => {
    mocks.validateDoubleSubmit.mockReturnValueOnce(false)
    const { POST } = createNextHandler(config)
    const req = {
      url: 'https://app.test/api/auth/register',
      headers: new Headers(),
      json: async () => ({ email: 'user@example.com', password: 'pw' }),
    } as any
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('handles register/login/logout POST flows', async () => {
    const { POST } = createNextHandler(config)
    const headers = new Headers({
      cookie: '__keyloom_csrf=csrf-token; __keyloom_session=session123',
      'x-keyloom-csrf': 'csrf-token',
    })

    const registerReq = {
      url: 'https://app.test/api/auth/register',
      headers,
      json: async () => ({ email: 'user@example.com', password: 'pw' }),
    } as any
    const registerRes = await POST(registerReq)
    expect(await registerRes.json()).toEqual({ userId: 'user_1', requiresVerification: false })
    expect(mocks.doRegister).toHaveBeenCalledWith(
      { email: 'user@example.com', password: 'pw', requireEmailVerify: false },
      { adapter: config.adapter, hasher: expect.any(Object) },
    )

    const loginReq = {
      url: 'https://app.test/api/auth/login',
      headers,
      json: async () => ({ email: 'user@example.com', password: 'pw' }),
    } as any
    const loginRes = await POST(loginReq)
    expect(await loginRes.json()).toEqual({ sessionId: 'sess_login' })
    const loginCall = mocks.doLogin.mock.calls.at(0)
    if (!loginCall) {
      throw new Error('login handler was not invoked')
    }
    expect(loginCall[0]).toMatchObject({
      email: 'user@example.com',
      password: 'pw',
      ttlMinutes: 45,
    })

    const logoutReq = {
      url: 'https://app.test/api/auth/logout',
      headers,
      json: async () => ({}),
    } as any
    const logoutRes = await POST(logoutReq)
    expect(await logoutRes.json()).toEqual({ ok: true })
    expect(mocks.doLogout).toHaveBeenCalledWith('session123', config.adapter)
  })
})
