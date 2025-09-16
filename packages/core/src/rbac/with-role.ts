import type { PermissionMap } from './policy'
import { can as canPerm, hasAnyRole } from './policy'

export function withRole<Req, Res>(
  handler: (ctx: { req: Req }) => Promise<Res>,
  opts: {
    requiredRoles?: string[]
    requiredPermission?: string
    getRole: () => Promise<{ role: string | null }>
    permMap?: PermissionMap
    onDenied?: () => Promise<Res>
  },
) {
  return async (ctx: { req: Req }) => {
    const { role } = await opts.getRole()
    if (!role) return opts.onDenied ? opts.onDenied() : Promise.reject(new Error('unauthorized'))
    if (opts.requiredRoles?.length && !hasAnyRole(role, opts.requiredRoles)) {
      return opts.onDenied ? opts.onDenied() : Promise.reject(new Error('forbidden'))
    }
    if (opts.requiredPermission && opts.permMap && !canPerm(role, opts.requiredPermission, opts.permMap)) {
      return opts.onDenied ? opts.onDenied() : Promise.reject(new Error('forbidden'))
    }
    return handler(ctx)
  }
}

