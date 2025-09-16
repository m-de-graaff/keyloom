export type RouteMatch =
  | { kind: 'session' }
  | { kind: 'csrf' }
  | { kind: 'register' }
  | { kind: 'login' }
  | { kind: 'logout' }
  | { kind: 'oauth_start'; provider: string }
  | { kind: 'oauth_callback'; provider: string }

export function matchApiPath(pathname: string): RouteMatch | null {
  const parts = pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]

  // Keep existing simple matching by last segment
  switch (last) {
    case 'session':
      return { kind: 'session' }
    case 'csrf':
      return { kind: 'csrf' }
    case 'register':
      return { kind: 'register' }
    case 'login':
      return { kind: 'login' }
    case 'logout':
      return { kind: 'logout' }
  }

  // OAuth routes: .../oauth/:provider/start or .../oauth/:provider/callback
  const i = parts.findIndex((p) => p === 'oauth')
  if (i >= 0 && (last === 'start' || last === 'callback') && parts[i + 1]) {
    const provider = parts[i + 1]
    if (last === 'start') return { kind: 'oauth_start', provider }
    if (last === 'callback') return { kind: 'oauth_callback', provider }
  }

  return null
}
