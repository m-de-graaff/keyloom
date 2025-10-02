import type { OAuthProvider, Profile, Tokens } from '@keyloom/core'

export type StandardProviderConfig = {
  id: string
  authorizationUrl: string
  tokenUrl: string
  userinfoUrl?: string // optional if you map from id_token
  scopes?: string[]
  tokenStyle?: 'json' | 'form'
  tokenHeaders?: Record<string, string>
  customizeTokenBody?: (
    body: URLSearchParams | Record<string, unknown>,
  ) =>
    | URLSearchParams
    | Record<string, unknown>
    | Promise<URLSearchParams | Record<string, unknown>>
  mapProfile?: (raw: any, tokens: Tokens) => Profile
  profileFromIdToken?: (claims: Record<string, any>) => Profile
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export type WithClient<T> = T & { clientId: string; clientSecret: string }

/**
 * Factory helper to build a simple OAuth provider with minimal boilerplate.
 * Handles common defaults and allows customizing token requests and profile mapping.
 */
export function createOAuthProvider(cfg: StandardProviderConfig) {
  return function provider(opts: { clientId: string; clientSecret: string }): OAuthProvider & {
    clientId: string
    clientSecret: string
  } {
    return {
      id: cfg.id,
      authorization: {
        url: cfg.authorizationUrl,
        ...(cfg.scopes && cfg.scopes.length ? { params: { scope: cfg.scopes.join(' ') } } : {}),
      },
      token: {
        url: cfg.tokenUrl,
        style: cfg.tokenStyle ?? 'json',
        ...(cfg.tokenHeaders ? { headers: cfg.tokenHeaders } : {}),
        ...(cfg.customizeTokenBody ? { customizeBody: cfg.customizeTokenBody } : {}),
      },
      ...(cfg.userinfoUrl
        ? {
            userinfo: {
              url: cfg.userinfoUrl,
              ...(cfg.mapProfile ? { map: cfg.mapProfile } : {}),
            },
          }
        : {}),
      ...(cfg.profileFromIdToken ? { profileFromIdToken: cfg.profileFromIdToken } : {}),
      ...(cfg.profileOverrides ? { profileOverrides: cfg.profileOverrides } : {}),
      ...(cfg.scopes ? { scopes: cfg.scopes } : {}),
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
    }
  }
}

/**
 * Tiny lint that validates a provider has the minimum required shape
 * (meant for DX feedback when creating custom providers).
 */
export function lintProviderShape(p: Partial<OAuthProvider> & Record<string, any>) {
  const errors: string[] = []
  if (!p.id) errors.push('missing id')
  if (!p.authorization?.url) errors.push('missing authorization.url')
  if (!p.token?.url) errors.push('missing token.url')
  const style = p.token?.style
  if (style && style !== 'json' && style !== 'form')
    errors.push("token.style must be 'json' or 'form'")
  if (!p.userinfo?.url && !p.profileFromIdToken) {
    errors.push('either userinfo.url or profileFromIdToken must be provided')
  }
  return { ok: errors.length === 0, errors }
}
