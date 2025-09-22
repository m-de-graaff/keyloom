import { ORG_COOKIE_NAME } from '@keyloom/core/constants'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { parseCookieValue } from './cookies-edge'
import type { KeyloomRouteRule, KeyloomRoutesManifest } from './route-types'
import type { NextKeyloomConfig } from './types'

type Options = {
  publicRoutes?: (string | RegExp)[]
  routes?: KeyloomRoutesManifest
  // Optional edge verification (perfs lower): fetch /api/auth/session
  verifyAtEdge?: boolean
  afterAuth?: (ctx: {
    authed: boolean
    req: NextRequest
    next: () => NextResponse
    redirect: (to: string) => NextResponse
  }) => NextResponse
  /**
   * Optional custom checks at the edge. Limited runtime: no direct DB drivers.
   * Return a NextResponse to short-circuit, otherwise return undefined to continue.
   */
  customValidate?: (ctx: {
    req: NextRequest
    url: URL
    authed: boolean
    userId?: string | null
  }) => Promise<NextResponse | undefined> | NextResponse | undefined
}

function isPublic(urlPath: string, rules: (string | RegExp)[] = []) {
  return rules.some((r) =>
    typeof r === 'string' ? urlPath === r || urlPath.startsWith(r) : r.test(urlPath),
  )
}

function compilePattern(pat: string): RegExp {
  const segs = pat.split('/').filter((s) => s.length > 0)
  const reSegs = segs.map((s) => {
    if (s === '*') return '.*'
    if (s.startsWith(':')) return '[^/]+'
    // escape regex chars
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })
  const body = reSegs.join('/')
  return new RegExp(`^/${body}/?$`)
}

export function createAuthMiddleware(config: NextKeyloomConfig, opts: Options = {}) {
  const compiled = (opts.routes?.entries ?? [])
    .slice()
    .sort((a, b) => b.specificity - a.specificity)
    .map((e) => ({ re: compilePattern(e.pattern), entry: e }))

  function handleUnauthorized(rule: KeyloomRouteRule, url: URL, isApi: boolean) {
    // Default API behavior: 401 JSON for unauthorized
    if (isApi && (rule.mode === '401' || !rule.mode)) {
      return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    const to = rule.redirectTo ?? '/sign-in'
    return NextResponse.redirect(new URL(to, url))
  }

  return async (req: NextRequest, _ev: NextFetchEvent) => {
    const url = req.nextUrl
    const isStatic =
      url.pathname.startsWith('/_next') ||
      url.pathname.match(/\.(?:ico|png|jpg|svg|css|js|txt|map)$/)
    if (isStatic) return NextResponse.next()

    const cookieHeader = req.headers.get('cookie')

    // If manifest provided, use it; otherwise fallback to legacy publicRoutes behavior
    if (compiled.length > 0) {
      const hit = compiled.find((c) => c.re.test(url.pathname))
      if (!hit) return NextResponse.next()
      const rule = hit.entry.rule
      const isApi = url.pathname.startsWith('/api')

      if (rule.visibility === 'public') return NextResponse.next()

      const sid = parseCookieValue(cookieHeader)
      let authed = !!sid

      const needsRole =
        (rule.roles && rule.roles.length > 0) ||
        (typeof rule.visibility === 'string' && rule.visibility.startsWith('role:'))

      // We need session JSON to resolve userId when role checks are needed
      const verify = needsRole ? 'session' : (rule.verify ?? 'cookie')
      let userId: string | null = null
      if (authed && verify !== 'cookie') {
        try {
          const r = await fetch(new URL('/api/auth/session', url).toString(), {
            headers: { cookie: cookieHeader ?? '' },
          })
          const j = await r.json()
          authed = !!j?.session
          userId = j?.user?.id ?? null
        } catch {
          authed = false
        }
      }

      if (!authed) return handleUnauthorized(rule, url, isApi)

      // Optional custom edge validation
      if (opts.customValidate) {
        try {
          const override = await opts.customValidate({
            req,
            url,
            authed,
            userId,
          })
          if (override) return override
        } catch {
          // fail-open to avoid accidental lockouts at the edge
        }
      }

      // Organization requirement
      let orgId: string | null = null
      const orgRequired = rule.org === 'required' || rule.org === true
      if (orgRequired && config?.rbac?.enabled !== false) {
        orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME)
        if (!orgId) return NextResponse.redirect(new URL('/select-org', url))
      }

      // Role-based routes: try best-effort membership check
      if (needsRole && config?.rbac?.enabled !== false) {
        // Collect required roles
        const required: string[] = []
        if (typeof rule.visibility === 'string' && rule.visibility.startsWith('role:')) {
          required.push(rule.visibility.slice(5))
        }
        if (Array.isArray(rule.roles)) required.push(...rule.roles)

        try {
          if (!userId) {
            // Attempt to retrieve session if not already fetched
            const r = await fetch(new URL('/api/auth/session', url).toString(), {
              headers: { cookie: cookieHeader ?? '' },
            })
            const j = await r.json()
            userId = j?.user?.id ?? null
            if (!j?.session) return handleUnauthorized(rule, url, isApi)
          }
          if (!orgId) orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME)
          if (!orgId) return NextResponse.redirect(new URL('/select-org', url))

          const m = await (config as any).adapter?.getMembership?.(userId, orgId)
          if (!m || !required.includes(m.role)) {
            // Role denied: API => 401, Pages => redirect to /403
            if (isApi)
              return new NextResponse(JSON.stringify({ error: 'forbidden' }), {
                status: 401,
                headers: { 'content-type': 'application/json' },
              })
            return NextResponse.redirect(new URL('/403', url))
          }
        } catch {
          // If check fails (edge/db), allow and rely on server guard for final enforcement
          return NextResponse.next()
        }
      }

      return NextResponse.next()
    }

    // Legacy behavior
    const publicHit = isPublic(url.pathname, opts.publicRoutes)
    const sid = parseCookieValue(cookieHeader)
    let authed = !!sid

    if (!publicHit && opts.verifyAtEdge && sid) {
      try {
        const r = await fetch(new URL('/api/auth/session', url).toString(), {
          headers: { cookie: cookieHeader ?? '' },
        })
        const j = await r.json()
        authed = !!j?.session
      } catch {
        authed = false
      }
    }

    const next = () => NextResponse.next()
    const redirect = (to: string) => NextResponse.redirect(new URL(to, url))

    // Optional custom edge validation for legacy mode as well
    if (opts.customValidate) {
      try {
        const override = await opts.customValidate({ req, url, authed })
        if (override) return override
      } catch {
        // fail-open
      }
    }

    if (opts.afterAuth) return opts.afterAuth({ authed, req, next, redirect })

    if (!publicHit && !authed) return redirect('/sign-in')
    return next()
  }
}
