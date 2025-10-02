import { ORG_COOKIE_NAME, toPermissionMap } from '@keyloom/core'
import { headers } from 'next/headers'
import { parseCookieValue } from './cookies'
import type { NextKeyloomConfig } from './types'

export function getActiveOrgId() {
  return parseCookieValue((headers() as any).get('cookie'), ORG_COOKIE_NAME)
}

export function setActiveOrgCookie(orgId: string) {
  return `${ORG_COOKIE_NAME}=${encodeURIComponent(
    orgId,
  )}; Path=/; SameSite=Lax; HttpOnly; Secure; Max-Age=15552000`
}

export async function getRoleForUser(userId: string, orgId: string, adapter: any) {
  const m = await adapter.getMembership(userId, orgId)
  return m?.role ?? null
}

export async function getGlobalRoleForUser(userId: string, adapter: any) {
  const gr = await adapter.getUserGlobalRole?.(userId)
  return gr?.role ?? null
}

export async function withRole(
  action: () => Promise<Response>,
  opts: {
    requiredRoles?: string[]
    requiredPermission?: string
    permMap?: Record<string, string[]>
    getUser: () => Promise<{ id: string } | null>
    adapter: any
    orgId?: string | null
    onDenied?: () => Response
    rbacEnabled?: boolean
    /** Optional config to auto-derive permMap from rbac roles mapping when provided */
    config?: NextKeyloomConfig
  },
) {
  // If RBAC is disabled, skip role/org checks
  if (opts.rbacEnabled === false) {
    return action()
  }

  const user = await opts.getUser()
  if (!user) return opts.onDenied ? opts.onDenied() : new Response('unauthorized', { status: 401 })
  const orgId = opts.orgId ?? getActiveOrgId()
  if (!orgId) return opts.onDenied ? opts.onDenied() : new Response('select_org', { status: 400 })
  const role = await getRoleForUser(user.id, orgId, opts.adapter)
  if (!role) return opts.onDenied ? opts.onDenied() : new Response('forbidden', { status: 403 })
  if (opts.requiredRoles?.length && !opts.requiredRoles.includes(role))
    return new Response('forbidden', { status: 403 })

  // Determine effective permission map (explicit > derived-from-config)
  const derivedMap = opts.config ? toPermissionMap(opts.config.rbac) : {}
  const effectivePermMap = opts.permMap ?? derivedMap

  if (opts.requiredPermission && effectivePermMap && Object.keys(effectivePermMap).length) {
    const allowed = (effectivePermMap[opts.requiredPermission] ?? []).includes(role)
    if (!allowed) return new Response('forbidden', { status: 403 })
  }
  return action()
}

export async function withGlobalRole(
  action: () => Promise<Response>,
  opts: {
    requiredRoles?: string[]
    requiredPermission?: string
    permMap?: Record<string, string[]>
    getUser: () => Promise<{ id: string } | null>
    adapter: any
    onDenied?: () => Response
    rbacEnabled?: boolean
    /** Optional config to auto-derive permMap from rbac roles mapping when provided */
    config?: NextKeyloomConfig
  },
) {
  // If RBAC is disabled, skip role checks
  if (opts.rbacEnabled === false) {
    return action()
  }

  const user = await opts.getUser()
  if (!user) return opts.onDenied ? opts.onDenied() : new Response('unauthorized', { status: 401 })

  const globalRole = await getGlobalRoleForUser(user.id, opts.adapter)
  if (!globalRole)
    return opts.onDenied ? opts.onDenied() : new Response('forbidden', { status: 403 })

  if (opts.requiredRoles?.length && !opts.requiredRoles.includes(globalRole))
    return new Response('forbidden', { status: 403 })

  // Determine effective permission map (explicit > derived-from-config)
  const derivedMap = opts.config ? toPermissionMap(opts.config.rbac) : {}
  const effectivePermMap = opts.permMap ?? derivedMap

  if (opts.requiredPermission && effectivePermMap && Object.keys(effectivePermMap).length) {
    const allowed = (effectivePermMap[opts.requiredPermission] ?? []).includes(globalRole)
    if (!allowed) return new Response('forbidden', { status: 403 })
  }

  return action()
}

export async function withAnyRole(
  action: () => Promise<Response>,
  opts: {
    requiredRoles?: string[]
    requiredGlobalRoles?: string[]
    requiredPermission?: string
    permMap?: Record<string, string[]>
    getUser: () => Promise<{ id: string } | null>
    adapter: any
    orgId?: string | null
    onDenied?: () => Response
    rbacEnabled?: boolean
    /** Optional config to auto-derive permMap from rbac roles mapping when provided */
    config?: NextKeyloomConfig
  },
) {
  // If RBAC is disabled, skip role checks
  if (opts.rbacEnabled === false) {
    return action()
  }

  const user = await opts.getUser()
  if (!user) return opts.onDenied ? opts.onDenied() : new Response('unauthorized', { status: 401 })

  let hasAccess = false
  let userRole: string | null = null

  // Check global role first
  if (opts.requiredGlobalRoles?.length) {
    const globalRole = await getGlobalRoleForUser(user.id, opts.adapter)
    if (globalRole && opts.requiredGlobalRoles.includes(globalRole)) {
      hasAccess = true
      userRole = globalRole
    }
  }

  // If no global access, check organization role
  if (!hasAccess && opts.requiredRoles?.length) {
    const orgId = opts.orgId ?? getActiveOrgId()
    if (orgId) {
      const orgRole = await getRoleForUser(user.id, orgId, opts.adapter)
      if (orgRole && opts.requiredRoles.includes(orgRole)) {
        hasAccess = true
        userRole = orgRole
      }
    }
  }

  if (!hasAccess)
    return opts.onDenied ? opts.onDenied() : new Response('forbidden', { status: 403 })

  // Determine effective permission map (explicit > derived-from-config)
  const derivedMap = opts.config ? toPermissionMap(opts.config.rbac) : {}
  const effectivePermMap = opts.permMap ?? derivedMap

  if (
    opts.requiredPermission &&
    effectivePermMap &&
    Object.keys(effectivePermMap).length &&
    userRole
  ) {
    const allowed = (effectivePermMap[opts.requiredPermission] ?? []).includes(userRole)
    if (!allowed) return new Response('forbidden', { status: 403 })
  }

  return action()
}
