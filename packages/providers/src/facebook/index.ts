import type { OAuthProvider, Profile } from '@keyloom/core'

type FacebookProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function facebook(
  opts: FacebookProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'facebook',
    authorization: {
      url: 'https://www.facebook.com/v18.0/dialog/oauth',
      params: { scope: 'email public_profile' },
    },
    token: {
      url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      style: 'form',
    },
    userinfo: {
      url: 'https://graph.facebook.com/v18.0/me?fields=id,name,email,picture',
      map: (raw) => ({
        id: String(raw.id),
        name: raw.name ?? null,
        email: raw.email ?? null,
        image: raw.picture?.data?.url ?? null,
      }),
    },
    scopes: ['email', 'public_profile'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default facebook
