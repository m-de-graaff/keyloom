import type { Permission, Role } from './types'
import type { RbacConfig, RbacRolesMapping } from '../types'

export type PermissionMap = Record<Permission, Role[]>

export function hasRole(role: Role, required: Role) {
  return role === required
}
export function hasAnyRole(role: Role, required: Role[]) {
  return required.includes(role)
}

export function can(role: Role, perm: Permission, map: PermissionMap) {
  const allowed = map[perm] ?? []
  return allowed.includes(role)
}

export function isRbacMappingConfigured(rbac?: RbacConfig | null): boolean {
  if (!rbac) return false
  const roles = (rbac as RbacConfig).roles as unknown
  return !!roles && typeof roles === 'object' && !Array.isArray(roles)
}

export function toPermissionMap(rbac?: RbacConfig | null): PermissionMap {
  const out: PermissionMap = Object.create(null)
  if (!rbac) return out
  const roles = rbac.roles as unknown
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) return out
  const mapping = roles as RbacRolesMapping
  for (const [role, obj] of Object.entries(mapping)) {
    const perms = obj?.permissions || []
    for (const p of perms) {
      const key = p as Permission
      if (!out[key]) out[key] = []
      const arr = out[key]!
      if (!arr.includes(role as Role)) arr.push(role as Role)
    }
  }
  return out
}
