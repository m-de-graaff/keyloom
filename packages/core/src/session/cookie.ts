import { COOKIE_NAME } from '../constants'

export type CookieOptions = {
  domain?: string
  path?: string
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
  httpOnly?: boolean
  maxAge?: number // seconds
}

export function serializeSessionCookie(value: string, opts: CookieOptions = {}) {
  const { domain, path = '/', sameSite = 'lax', secure = true, httpOnly = true, maxAge } = opts

  const parts = [`${COOKIE_NAME}=${value}`]
  if (domain) parts.push(`Domain=${domain}`)
  if (path) parts.push(`Path=${path}`)
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`)
  if (secure) parts.push('Secure')
  if (httpOnly) parts.push('HttpOnly')
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.floor(maxAge)}`)
  return parts.join('; ')
}
