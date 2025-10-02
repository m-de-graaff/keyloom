import type { OAuthProvider, Profile } from '@keyloom/core'

type SpotifyProviderOptions = { 
  clientId: string
  clientSecret: string
  profileOverrides?: (profile: Profile) => Record<string, any>
}

export function spotify(
  opts: SpotifyProviderOptions,
): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'spotify',
    authorization: {
      url: 'https://accounts.spotify.com/authorize',
      params: { scope: 'user-read-email user-read-private' },
    },
    token: {
      url: 'https://accounts.spotify.com/api/token',
      style: 'form',
      headers: { 
        'Authorization': `Basic ${Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64')}`,
      },
    },
    userinfo: {
      url: 'https://api.spotify.com/v1/me',
      map: (raw) => ({
        id: String(raw.id),
        name: raw.display_name ?? null,
        email: raw.email ?? null,
        image: raw.images?.[0]?.url ?? null,
      }),
    },
    scopes: ['user-read-email', 'user-read-private'],
    ...(opts.profileOverrides ? { profileOverrides: opts.profileOverrides } : {}),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default spotify
