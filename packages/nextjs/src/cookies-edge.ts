import { COOKIE_NAME } from '@keyloom/core'

// Edge-safe cookie utilities (no Node.js-only dependencies)
export function parseCookieValue(cookieHeader: string | null, name = COOKIE_NAME) {
  const raw = cookieHeader ?? ''
  const found = raw.split(/; */).find((p) => p.startsWith(`${name}=`))
  return found ? decodeURIComponent(found.split('=')[1] ?? '') : null
}
