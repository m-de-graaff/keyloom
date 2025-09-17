import { COOKIE_NAME, serializeSessionCookie } from '@keyloom/core'
import { parseCookieValue as parseEdgeCookieValue } from './cookies-edge'

export const parseCookieValue = parseEdgeCookieValue

export function setSessionCookieHeader(
  sessionId: string,
  opts?: { domain?: string; sameSite?: 'lax' | 'strict' | 'none'; maxAgeSec?: number },
) {
  const cookieOptions: Record<string, unknown> = {
    sameSite: opts?.sameSite ?? 'lax',
    secure: true,
    httpOnly: true,
    path: '/',
  }

  if (opts?.domain !== undefined) {
    cookieOptions.domain = opts.domain
  }

  if (opts?.maxAgeSec !== undefined) {
    cookieOptions.maxAge = opts.maxAgeSec
  }

  return serializeSessionCookie(sessionId, cookieOptions)
}

