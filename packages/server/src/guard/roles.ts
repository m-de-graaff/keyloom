import type { FastifyReply, FastifyRequest } from 'fastify'

export function withRole(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
  opts: {
    requiredRoles?: string[]
    requiredPermission?: string
    permMap?: Record<string, string[]>
    getUser: (req: FastifyRequest) => Promise<{ id: string } | null>
    adapter: any
    orgIdFrom?: (req: FastifyRequest) => string | null
    onDenied?: (reply: FastifyReply, code: number, msg: string) => unknown
  },
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await opts.getUser(req)
    if (!user)
      return (opts.onDenied ?? ((r) => r.code(401).send('unauthorized')))(
        reply,
        401,
        'unauthorized',
      )
    const orgId = opts.orgIdFrom?.(req)
    if (!orgId)
      return (opts.onDenied ?? ((r) => r.code(400).send('select_org')))(reply, 400, 'select_org')
    const m = await opts.adapter.getMembership(user.id, orgId)
    const role = m?.role ?? null
    if (!role)
      return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    if (opts.requiredRoles?.length && !opts.requiredRoles.includes(role))
      return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    if (opts.requiredPermission && opts.permMap) {
      const allowed = (opts.permMap[opts.requiredPermission] ?? []).includes(role)
      if (!allowed)
        return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    }
    return handler(req, reply)
  }
}

export function withGlobalRole(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
  opts: {
    requiredRoles?: string[]
    requiredPermission?: string
    permMap?: Record<string, string[]>
    getUser: (req: FastifyRequest) => Promise<{ id: string } | null>
    adapter: any
    onDenied?: (reply: FastifyReply, code: number, msg: string) => unknown
  },
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await opts.getUser(req)
    if (!user)
      return (opts.onDenied ?? ((r) => r.code(401).send('unauthorized')))(
        reply,
        401,
        'unauthorized',
      )

    const gr = await opts.adapter.getUserGlobalRole?.(user.id)
    const globalRole = gr?.role ?? null
    if (!globalRole)
      return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')

    if (opts.requiredRoles?.length && !opts.requiredRoles.includes(globalRole))
      return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')

    if (opts.requiredPermission && opts.permMap) {
      const allowed = (opts.permMap[opts.requiredPermission] ?? []).includes(globalRole)
      if (!allowed)
        return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    }

    return handler(req, reply)
  }
}

export function withAnyRole(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
  opts: {
    requiredRoles?: string[]
    requiredGlobalRoles?: string[]
    requiredPermission?: string
    permMap?: Record<string, string[]>
    getUser: (req: FastifyRequest) => Promise<{ id: string } | null>
    adapter: any
    orgIdFrom?: (req: FastifyRequest) => string | null
    onDenied?: (reply: FastifyReply, code: number, msg: string) => unknown
  },
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await opts.getUser(req)
    if (!user)
      return (opts.onDenied ?? ((r) => r.code(401).send('unauthorized')))(
        reply,
        401,
        'unauthorized',
      )

    let hasAccess = false
    let userRole: string | null = null

    // Check global role first
    if (opts.requiredGlobalRoles?.length) {
      const gr = await opts.adapter.getUserGlobalRole?.(user.id)
      const globalRole = gr?.role ?? null
      if (globalRole && opts.requiredGlobalRoles.includes(globalRole)) {
        hasAccess = true
        userRole = globalRole
      }
    }

    // If no global access, check organization role
    if (!hasAccess && opts.requiredRoles?.length) {
      const orgId = opts.orgIdFrom?.(req)
      if (orgId) {
        const m = await opts.adapter.getMembership(user.id, orgId)
        const orgRole = m?.role ?? null
        if (orgRole && opts.requiredRoles.includes(orgRole)) {
          hasAccess = true
          userRole = orgRole
        }
      }
    }

    if (!hasAccess)
      return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')

    // Check permissions if specified
    if (opts.requiredPermission && opts.permMap && userRole) {
      const allowed = (opts.permMap[opts.requiredPermission] ?? []).includes(userRole)
      if (!allowed)
        return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    }

    return handler(req, reply)
  }
}
