import { describe, expect, it } from 'vitest'
import { parseCookieValue, setSessionCookieHeader } from './cookies'

describe('parseCookieValue', () => {
  it('should parse cookie value correctly', () => {
    const cookieHeader = '__keyloom_session=abc123; other=value'
    expect(parseCookieValue(cookieHeader)).toBe('abc123')
  })

  it('should handle custom cookie name', () => {
    const cookieHeader = 'custom_cookie=xyz789; other=value'
    expect(parseCookieValue(cookieHeader, 'custom_cookie')).toBe('xyz789')
  })

  it('should return null for missing cookie', () => {
    const cookieHeader = 'other=value; another=test'
    expect(parseCookieValue(cookieHeader)).toBeNull()
  })

  it('should return null for null/empty header', () => {
    expect(parseCookieValue(null)).toBeNull()
    expect(parseCookieValue('')).toBeNull()
  })

  it('should handle URL encoded values', () => {
    const cookieHeader = '__keyloom_session=abc%20123; other=value'
    expect(parseCookieValue(cookieHeader)).toBe('abc 123')
  })

  it('should handle cookie at different positions', () => {
    expect(parseCookieValue('__keyloom_session=first')).toBe('first')
    expect(parseCookieValue('other=value; __keyloom_session=middle')).toBe('middle')
    expect(parseCookieValue('other=value; __keyloom_session=last; final=test')).toBe('last')
  })
})

describe('setSessionCookieHeader', () => {
  it('should create basic session cookie', () => {
    const result = setSessionCookieHeader('session123')
    expect(result).toContain('__keyloom_session=session123')
    expect(result).toContain('Path=/')
    expect(result).toContain('SameSite=Lax')
    expect(result).toContain('HttpOnly')
    expect(result).toContain('Secure')
  })

  it('should handle custom sameSite', () => {
    const result = setSessionCookieHeader('session123', { sameSite: 'strict' })
    expect(result).toContain('SameSite=Strict')
  })

  it('should handle custom domain', () => {
    const result = setSessionCookieHeader('session123', { domain: 'example.com' })
    expect(result).toContain('Domain=example.com')
  })

  it('should handle maxAge', () => {
    const result = setSessionCookieHeader('session123', { maxAgeSec: 3600 })
    expect(result).toContain('Max-Age=3600')
  })

  it('should handle all options together', () => {
    const result = setSessionCookieHeader('session123', {
      sameSite: 'none',
      domain: 'test.com',
      maxAgeSec: 7200,
    })
    expect(result).toContain('SameSite=None')
    expect(result).toContain('Domain=test.com')
    expect(result).toContain('Max-Age=7200')
  })
})
