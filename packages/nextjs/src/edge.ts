import { parseCookieValue } from './cookies';

export function hasSessionCookie(cookieHeader: string | null) {
  return !!parseCookieValue(cookieHeader);
}

