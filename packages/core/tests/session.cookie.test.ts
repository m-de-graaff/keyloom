import { describe, expect, it } from 'vitest'
import { COOKIE_NAME } from '../src/constants'
import { serializeSessionCookie } from '../src/session/cookie'

describe('session cookie', () => {
  it('serializes with defaults', () => {
    const cookie = serializeSessionCookie('abc')
    expect(cookie).toContain(`${COOKIE_NAME}=abc`)
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
  })

  it('applies custom options', () => {
    const cookie = serializeSessionCookie('xyz', {
      domain: 'example.com',
      path: '/auth',
      sameSite: 'none',
      secure: false,
      httpOnly: false,
      maxAge: 60,
    })
    expect(cookie).toContain('Domain=example.com')
    expect(cookie).toContain('Path=/auth')
    expect(cookie).toContain('SameSite=None')
    expect(cookie).not.toContain('Secure')
    expect(cookie).not.toContain('HttpOnly')
    expect(cookie).toContain('Max-Age=60')
  })
})
