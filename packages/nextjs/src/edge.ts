import { parseCookieValue } from './cookies-edge'

export function hasSessionCookie(cookieHeader: string | null) {
  return !!parseCookieValue(cookieHeader)
}

