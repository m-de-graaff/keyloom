import type { OAuthProvider, Profile } from '@keyloom/core'

type TwitchProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function twitch(
  opts: TwitchProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'twitch',
    authorization: {
      url: 'https://id.twitch.tv/oauth2/authorize',
      params: { scope: 'user:read:email' },
    },
    token: {
      url: 'https://id.twitch.tv/oauth2/token',
      style: 'form',
    },
    userinfo: {
      url: 'https://api.twitch.tv/helix/users',
      map: (raw) => ({
        id: String(raw.data?.[0]?.id),
        name: raw.data?.[0]?.display_name ?? raw.data?.[0]?.login ?? null,
        email: raw.data?.[0]?.email ?? null,
        image: raw.data?.[0]?.profile_image_url ?? null,
      }),
    },
    scopes: ['user:read:email'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default twitch
