import type { ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies'
import { cookies } from 'next/headers'

// JWT Cookie names
export const ACCESS_COOKIE = '__keyloom_access'
export const REFRESH_COOKIE = '__keyloom_refresh'

/**
 * Cookie options for JWT tokens
 */
export interface JwtCookieOptions {
  domain?: string
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
  maxAge?: number
}

/**
 * Set JWT access token cookie
 */
export function setAccessTokenCookie(
  cookieStore: ResponseCookies,
  accessToken: string,
  options: JwtCookieOptions = {},
): void {
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: options.secure ?? true,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
    maxAge: options.maxAge ?? 600, // 10 minutes default
  })
}

/**
 * Set JWT refresh token cookie
 */
export function setRefreshTokenCookie(
  cookieStore: ResponseCookies,
  refreshToken: string,
  options: JwtCookieOptions = {},
): void {
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: options.secure ?? true,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
    maxAge: options.maxAge ?? 2592000, // 30 days default
  })
}

/**
 * Set both JWT cookies
 */
export function setJwtCookies(
  cookieStore: ResponseCookies,
  tokens: { accessToken: string; refreshToken: string },
  ttl: { accessTTLSec: number; refreshTTLSec: number },
  options: JwtCookieOptions = {},
): void {
  setAccessTokenCookie(cookieStore, tokens.accessToken, {
    ...options,
    maxAge: ttl.accessTTLSec,
  })

  setRefreshTokenCookie(cookieStore, tokens.refreshToken, {
    ...options,
    maxAge: ttl.refreshTTLSec,
  })
}

/**
 * Clear JWT cookies
 */
export function clearJwtCookies(
  cookieStore: ResponseCookies,
  options: Pick<JwtCookieOptions, 'domain' | 'sameSite'> = {},
): void {
  cookieStore.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
    maxAge: 0,
  })

  cookieStore.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: options.sameSite ?? 'lax',
    path: '/',
    domain: options.domain,
    maxAge: 0,
  })
}

/**
 * Get JWT access token from cookies
 */
export function getAccessTokenFromCookies(): string | null {
  try {
    const cookieStore = cookies()
    return cookieStore.get(ACCESS_COOKIE)?.value || null
  } catch {
    return null
  }
}

/**
 * Get JWT refresh token from cookies
 */
export function getRefreshTokenFromCookies(): string | null {
  try {
    const cookieStore = cookies()
    return cookieStore.get(REFRESH_COOKIE)?.value || null
  } catch {
    return null
  }
}

/**
 * Get both JWT tokens from cookies
 */
export function getJwtTokensFromCookies(): {
  accessToken: string | null
  refreshToken: string | null
} {
  return {
    accessToken: getAccessTokenFromCookies(),
    refreshToken: getRefreshTokenFromCookies(),
  }
}

/**
 * Check if JWT cookies exist
 */
export function hasJwtCookies(): boolean {
  const tokens = getJwtTokensFromCookies()
  return !!(tokens.accessToken || tokens.refreshToken)
}

/**
 * Parse JWT cookie values from cookie header string
 */
export function parseJwtCookiesFromHeader(cookieHeader: string): {
  accessToken?: string
  refreshToken?: string
} {
  const cookies = cookieHeader.split('; ').reduce(
    (acc, cookie) => {
      const [name, value] = cookie.split('=')
      if (name && value) {
        acc[name] = value
      }
      return acc
    },
    {} as Record<string, string>,
  )

  return {
    accessToken: cookies[ACCESS_COOKIE],
    refreshToken: cookies[REFRESH_COOKIE],
  }
}

/**
 * Create cookie string for JWT tokens (for manual cookie setting)
 */
export function createJwtCookieString(
  tokens: { accessToken: string; refreshToken: string },
  ttl: { accessTTLSec: number; refreshTTLSec: number },
  options: JwtCookieOptions = {},
): string[] {
  const baseOptions = [
    'HttpOnly',
    'Secure',
    `SameSite=${options.sameSite ?? 'lax'}`,
    'Path=/',
    options.domain ? `Domain=${options.domain}` : null,
  ].filter(Boolean)

  const accessCookie = [
    `${ACCESS_COOKIE}=${tokens.accessToken}`,
    `Max-Age=${ttl.accessTTLSec}`,
    ...baseOptions,
  ].join('; ')

  const refreshCookie = [
    `${REFRESH_COOKIE}=${tokens.refreshToken}`,
    `Max-Age=${ttl.refreshTTLSec}`,
    ...baseOptions,
  ].join('; ')

  return [accessCookie, refreshCookie]
}

/**
 * Create cookie string for clearing JWT tokens
 */
export function createClearJwtCookieString(
  options: Pick<JwtCookieOptions, 'domain' | 'sameSite'> = {},
): string[] {
  const baseOptions = [
    'HttpOnly',
    'Secure',
    `SameSite=${options.sameSite ?? 'lax'}`,
    'Path=/',
    'Max-Age=0',
    options.domain ? `Domain=${options.domain}` : null,
  ].filter(Boolean)

  const clearAccess = [`${ACCESS_COOKIE}=`, ...baseOptions].join('; ')
  const clearRefresh = [`${REFRESH_COOKIE}=`, ...baseOptions].join('; ')

  return [clearAccess, clearRefresh]
}
