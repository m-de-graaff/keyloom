export type Visibility =
  | 'public'
  | '!public'
  | '!authed'
  | 'private'
  | `role:${string}`
  | `global:${string}`

export type KeyloomRouteRule = {
  visibility: Visibility
  roles?: string[]
  globalRoles?: string[]
  org?: boolean | 'required'
  redirectTo?: string
  mode?: 'redirect' | '401'
  verify?: 'cookie' | 'session' | 'membership'
}

export type KeyloomRouteEntry = {
  pattern: string
  rule: KeyloomRouteRule
  file?: string
  specificity: number
}

export type KeyloomRoutesManifest = {
  generatedAt: string
  entries: KeyloomRouteEntry[]
}

// Runtime no-op to keep bundlers from pruning this module as an empty chunk.
export const __routeTypesModule = true
