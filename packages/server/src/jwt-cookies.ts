import type { FastifyReply } from 'fastify'

// JWT Cookie names
export const ACCESS_COOKIE = '__keyloom_access'
export const REFRESH_COOKIE = '__keyloom_refresh'

/**
 * Set JWT access token cookie
 */
export function setAccessTokenCookie(
  reply: FastifyReply,
  accessToken: string,
  maxAgeSec: number,
  opts: { domain?: string; sameSite?: 'lax' | 'strict' | 'none' }
): void {
  const cookieOptions: Record<string, unknown> = {
    secure: true,
    httpOnly: true,
    path: '/',
    maxAge: maxAgeSec,
    sameSite: opts.sameSite || 'lax'
  }

  if (opts.domain) {
    cookieOptions.domain = opts.domain
  }

  const cookieValue = `${ACCESS_COOKIE}=${accessToken}; ${Object.entries(cookieOptions)
    .map(([key, value]) => {
      if (key === 'maxAge') return `Max-Age=${value}`
      if (key === 'sameSite') return `SameSite=${value}`
      if (typeof value === 'boolean') return value ? key : ''
      return `${key}=${value}`
    })
    .filter(Boolean)
    .join('; ')}`

  reply.header('Set-Cookie', cookieValue)
}

/**
 * Set JWT refresh token cookie
 */
export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  maxAgeSec: number,
  opts: { domain?: string; sameSite?: 'lax' | 'strict' | 'none' }
): void {
  const cookieOptions: Record<string, unknown> = {
    secure: true,
    httpOnly: true,
    path: '/',
    maxAge: maxAgeSec,
    sameSite: opts.sameSite || 'lax'
  }

  if (opts.domain) {
    cookieOptions.domain = opts.domain
  }

  const cookieValue = `${REFRESH_COOKIE}=${refreshToken}; ${Object.entries(cookieOptions)
    .map(([key, value]) => {
      if (key === 'maxAge') return `Max-Age=${value}`
      if (key === 'sameSite') return `SameSite=${value}`
      if (typeof value === 'boolean') return value ? key : ''
      return `${key}=${value}`
    })
    .filter(Boolean)
    .join('; ')}`

  reply.header('Set-Cookie', cookieValue)
}

/**
 * Set both access and refresh token cookies
 */
export function setJwtCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
  ttl: { accessTTLSec: number; refreshTTLSec: number },
  opts: { domain?: string; sameSite?: 'lax' | 'strict' | 'none' }
): void {
  setAccessTokenCookie(reply, tokens.accessToken, ttl.accessTTLSec, opts)
  setRefreshTokenCookie(reply, tokens.refreshToken, ttl.refreshTTLSec, opts)
}

/**
 * Clear JWT cookies
 */
export function clearJwtCookies(
  reply: FastifyReply,
  opts: { domain?: string; sameSite?: 'lax' | 'strict' | 'none' }
): void {
  const cookieOptions = [
    'Path=/',
    'HttpOnly',
    'Secure',
    `SameSite=${opts.sameSite || 'lax'}`,
    'Max-Age=0',
    opts.domain ? `Domain=${opts.domain}` : null
  ].filter(Boolean).join('; ')

  reply.header('Set-Cookie', `${ACCESS_COOKIE}=; ${cookieOptions}`)
  reply.header('Set-Cookie', `${REFRESH_COOKIE}=; ${cookieOptions}`)
}

/**
 * Parse JWT tokens from cookie header
 */
export function parseJwtCookies(cookieHeader?: string): {
  accessToken?: string
  refreshToken?: string
} {
  if (!cookieHeader) {
    return {}
  }

  const cookies = cookieHeader
    .split('; ')
    .reduce((acc, cookie) => {
      const [name, value] = cookie.split('=')
      if (name && value) {
        acc[name] = value
      }
      return acc
    }, {} as Record<string, string>)

  return {
    accessToken: cookies[ACCESS_COOKIE],
    refreshToken: cookies[REFRESH_COOKIE]
  }
}

/**
 * Extract refresh token from cookie or request body
 */
export function extractRefreshToken(
  cookieHeader?: string,
  body?: { refreshToken?: string }
): string | null {
  // First try to get from cookies
  const { refreshToken: cookieToken } = parseJwtCookies(cookieHeader)
  if (cookieToken) {
    return cookieToken
  }

  // Fallback to request body
  return body?.refreshToken || null
}

/**
 * Extract access token from Authorization header or cookies
 */
export function extractAccessToken(
  authHeader?: string,
  cookieHeader?: string
): string | null {
  // First try Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Fallback to cookies
  const { accessToken } = parseJwtCookies(cookieHeader)
  return accessToken || null
}
