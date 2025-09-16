// Edge-safe cookie utilities (no Node.js imports)
const COOKIE_NAME = 'keyloom-session'

// generic parse for both edge/web/node
export function parseCookieValue(cookieHeader: string | null, name = COOKIE_NAME) {
  const raw = cookieHeader ?? ''
  const found = raw.split(/; */).find((p) => p.startsWith(`${name}=`))
  return found ? decodeURIComponent(found.split('=')[1] ?? '') : null
}
