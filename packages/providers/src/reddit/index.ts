import type { OAuthProvider, Profile } from '@keyloom/core'

type RedditProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function reddit(
  opts: RedditProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'reddit',
    authorization: {
      url: 'https://www.reddit.com/api/v1/authorize',
      params: { 
        scope: 'identity',
        duration: 'permanent',
        response_type: 'code',
      },
    },
    token: {
      url: 'https://www.reddit.com/api/v1/access_token',
      style: 'form',
      headers: { 
        'User-Agent': 'Keyloom OAuth Client',
        'Authorization': `Basic ${Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64')}`,
      },
    },
    userinfo: {
      url: 'https://oauth.reddit.com/api/v1/me',
      map: (raw) => ({
        id: String(raw.id),
        name: raw.name ?? null,
        email: null, // Reddit doesn't provide email through OAuth
        image: raw.icon_img?.replace(/\?.*$/, '') ?? null, // Remove query params from icon URL
      }),
    },
    scopes: ['identity'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default reddit
