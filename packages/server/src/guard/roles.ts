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
    if (!user) return (opts.onDenied ?? ((r) => r.code(401).send('unauthorized')))(reply, 401, 'unauthorized')
    const orgId = opts.orgIdFrom?.(req)
    if (!orgId) return (opts.onDenied ?? ((r) => r.code(400).send('select_org')))(reply, 400, 'select_org')
    const m = await opts.adapter.getMembership(user.id, orgId)
    const role = m?.role ?? null
    if (!role) return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    if (opts.requiredRoles?.length && !opts.requiredRoles.includes(role))
      return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    if (opts.requiredPermission && opts.permMap) {
      const allowed = (opts.permMap[opts.requiredPermission] ?? []).includes(role)
      if (!allowed) return (opts.onDenied ?? ((r) => r.code(403).send('forbidden')))(reply, 403, 'forbidden')
    }
    return handler(req, reply)
  }
}

