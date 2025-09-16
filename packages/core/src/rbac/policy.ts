import type { Role, Permission } from './types'

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

