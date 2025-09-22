import { ORG_COOKIE_NAME } from '@keyloom/core/constants'
import type { Session, User } from '@keyloom/core'

import { getCurrentSession } from '@keyloom/core/runtime/current-session'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseCookieValue } from './cookies'
import { createJwtConfig, getJwtSession } from './jwt-server'
import type { NextKeyloomConfig } from './types'

// Public-returned shapes for JWT strategy
export type JwtSessionShape = { id: string; userId: string; expiresAt: Date }
export type JwtUserShape = { id: string; email?: string }

export type GetSessionResult = {
  session: Session | JwtSessionShape | null
  user: User | JwtUserShape | null
}

// Module-local cache of adapter/config to avoid re-instantiations
let _config: NextKeyloomConfig | undefined
let _adapter: any

function ensure(config?: NextKeyloomConfig) {
  if (config) _config = config
  if (!_config) throw new Error('Keyloom config not provided')
  if (!_adapter) _adapter = _config.adapter
  return { config: _config, adapter: _adapter }
}

function resolveJwtEnv(cfg: NextKeyloomConfig): Record<string, string> | undefined {
  if (cfg.sessionStrategy !== 'jwt') return undefined
  // If provided env-like keys, pass through
  if (cfg.jwt && (cfg.jwt as any).KEYLOOM_JWT_JWKS_URL) return cfg.jwt as any
  // Otherwise, try to infer from baseUrl and core jwt config
  const jwksUrl = cfg.baseUrl
    ? `${cfg.baseUrl.replace(/\/$/, '')}/.well-known/jwks.json`
    : undefined
  const issuer = (cfg as any).jwt?.issuer || cfg.baseUrl
  if (!jwksUrl || !issuer) return undefined as any
  const out: any = {
    KEYLOOM_JWT_JWKS_URL: jwksUrl,
    KEYLOOM_JWT_ISSUER: issuer,
  }
  return out
}

export async function getSession(config?: NextKeyloomConfig): Promise<GetSessionResult> {
  const { config: cfg, adapter } = ensure(config)

  // Check if JWT strategy is enabled
  if (cfg.sessionStrategy === 'jwt') {
    const envLike = resolveJwtEnv(cfg)
    if (envLike) {
      const jwtConfig = createJwtConfig(envLike)
      const result = await getJwtSession(jwtConfig)
      return { session: result.session, user: result.user }
    }
  }

  // Fallback to database session strategy
  const cookieHeader = (await headers()).get('cookie') ?? cookies().toString()
  const sid = parseCookieValue(cookieHeader)
  const { session, user } = await getCurrentSession(sid, adapter)
  return { session, user }
}

export async function getUser(config?: NextKeyloomConfig): Promise<User | JwtUserShape | null> {
  const out = await getSession(config)
  return out.user
}

// Server-side guard for App Router
export async function guard(
  rule?: {
    visibility?: 'public' | '!public' | '!authed' | 'private' | `role:${string}`
    roles?: string[]
    permission?: string
    org?: boolean | 'required'
    redirectTo?: string
  },
  config?: NextKeyloomConfig,
) {
  const { config: cfg, adapter } = ensure(config)

  const effVis = rule?.visibility === '!public' ? 'private' : rule?.visibility
  const isPublic = effVis === 'public'
  if (isPublic) return

  let session: any = null
  let user: any = null

  // Check if JWT strategy is enabled
  if (cfg.sessionStrategy === 'jwt') {
    const envLike = resolveJwtEnv(cfg)
    if (envLike) {
      const jwtConfig = createJwtConfig(envLike)
      const result = await getJwtSession(jwtConfig)
      session = result.session
      user = result.user
    }
  }

  if (!session || !user) {
    // Fallback to database session strategy
    const cookieHeader = (await headers()).get('cookie') ?? cookies().toString()
    const sid = parseCookieValue(cookieHeader)
    const sessionResult = await getCurrentSession(sid, adapter)
    session = sessionResult.session
    user = sessionResult.user
  }

  // New simplified visibility: routes only for unauthenticated users
  if (effVis === '!authed') {
    if (session && user) return redirect(rule?.redirectTo ?? '/')
    return { session, user }
  }

  // Private and role-protected routes require authentication
  if (!session || !user) return redirect(rule?.redirectTo ?? '/sign-in')

  const needsRole = (rule?.roles && rule.roles.length > 0) || effVis?.startsWith('role:')
  const needsPermission = !!rule?.permission
  if (needsRole || needsPermission) {
    const need = effVis?.startsWith('role:')
      ? [effVis.slice(5)]
      : (rule?.roles as string[] | undefined)

    // If role/permission is checked, require an active org unless explicitly disabled
    const orgRequired = rule?.org === 'required' || rule?.org === true || true

    if (cfg?.rbac?.enabled === false) {
      // Skip org/role/permission checks if RBAC is disabled
      return { session, user }
    }

    const cookieHeader = (await headers()).get('cookie') ?? cookies().toString()
    const orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME)
    if (orgRequired && !orgId) return redirect('/select-org')

    const m = await adapter.getMembership(user.id, orgId)
    if (!m) return redirect('/403')

    if (need && need.length > 0 && !need.includes(m.role)) return redirect('/403')

    if (needsPermission && rule?.permission) {
      // Derive permission map from structured RBAC config if available
      const rolesDecl = (cfg as any)?.rbac?.roles as any
      const permMap: Record<string, string[]> = {}
      if (rolesDecl && typeof rolesDecl === 'object' && !Array.isArray(rolesDecl)) {
        for (const [r, obj] of Object.entries(rolesDecl)) {
          const perms = (obj as any)?.permissions || []
          for (const p of perms) {
            if (!permMap[p]) permMap[p] = []
            if (!permMap[p].includes(r)) permMap[p].push(r)
          }
        }
      }
      if (Object.keys(permMap).length > 0) {
        const allowed = (permMap[rule.permission] ?? []).includes(m.role)
        if (!allowed) return redirect('/403')
      }
    }

    return { session, user, role: m.role as string, orgId }
  }

  if (rule?.org === 'required' && cfg?.rbac?.enabled !== false) {
    const cookieHeader = (await headers()).get('cookie') ?? cookies().toString()
    const orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME)
    if (!orgId) return redirect('/select-org')
    return { session, user, orgId }
  }

  return { session, user }
}
