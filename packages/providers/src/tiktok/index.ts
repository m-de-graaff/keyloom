import type { OAuthProvider, Profile } from '@keyloom/core'

type TikTokProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function tiktok(
  opts: TikTokProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'tiktok',
    authorization: {
      url: 'https://www.tiktok.com/auth/authorize/',
      params: { scope: 'user.info.basic' },
    },
    token: {
      url: 'https://open-api.tiktok.com/oauth/access_token/',
      style: 'form',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
    userinfo: {
      url: 'https://open-api.tiktok.com/user/info/',
      map: (raw) => ({
        id: String(raw.data?.user?.open_id ?? raw.data?.open_id),
        name: raw.data?.user?.display_name ?? null,
        email: null, // TikTok doesn't provide email through basic user info
        image: raw.data?.user?.avatar_url ?? null,
      }),
    },
    scopes: ['user.info.basic'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default tiktok
