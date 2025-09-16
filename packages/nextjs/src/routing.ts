export type RouteMatch =
  | { kind: 'session' }
  | { kind: 'csrf' }
  | { kind: 'register' }
  | { kind: 'login' }
  | { kind: 'logout' }

export function matchApiPath(pathname: string): RouteMatch | null {
  // Expect .../api/auth/[...keyloom]
  const parts = pathname.split('/').filter(Boolean)
  // Find the last segment (e.g., /api/auth/session)
  const last = parts[parts.length - 1]
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
    default:
      return null
  }
}
