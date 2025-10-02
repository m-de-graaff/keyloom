import type { OAuthProvider, Profile } from '@keyloom/core'

type AuthentikProviderOptions = { 
  clientId: string
  clientSecret: string
  issuer: string // The base URL of the Authentik instance (e.g., https://auth.example.com)
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function authentik(
  opts: AuthentikProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  const baseUrl = opts.issuer.replace(/\/$/, '') // Remove trailing slash
  
  return {
    id: 'authentik',
    discovery: { issuer: opts.issuer },
    authorization: {
      url: `${baseUrl}/application/o/authorize/`,
      params: { scope: 'openid email profile' },
    },
    token: {
      url: `${baseUrl}/application/o/token/`,
      style: 'form',
    },
    userinfo: {
      url: `${baseUrl}/application/o/userinfo/`,
      map: (raw) => ({
        id: String(raw.sub ?? raw.preferred_username),
        name: raw.name ?? raw.preferred_username ?? null,
        email: raw.email ?? null,
        image: raw.picture ?? null,
        emailVerified: raw.email_verified ?? undefined,
      }),
    },
    scopes: ['openid', 'email', 'profile'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default authentik
