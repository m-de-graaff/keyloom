import type { OAuthProvider, Profile } from '@keyloom/core'

type InstagramProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function instagram(
  opts: InstagramProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'instagram',
    authorization: {
      url: 'https://api.instagram.com/oauth/authorize',
      params: { scope: 'user_profile,user_media' },
    },
    token: {
      url: 'https://api.instagram.com/oauth/access_token',
      style: 'form',
    },
    userinfo: {
      url: 'https://graph.instagram.com/me?fields=id,username,account_type',
      map: (raw) => ({
        id: String(raw.id),
        name: raw.username ?? null,
        email: null, // Instagram doesn't provide email through basic API
        image: null, // Would need additional API call for profile picture
      }),
    },
    scopes: ['user_profile', 'user_media'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default instagram
