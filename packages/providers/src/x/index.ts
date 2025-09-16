import type { OAuthProvider } from '@keyloom/core'

export default function x(opts: {
  clientId: string
  clientSecret?: string
  scope?: string
  baseUrl?: string
}) {
  const authBase = opts.baseUrl ?? 'https://twitter.com'
  const apiBase = 'https://api.twitter.com'
  return {
    id: 'x',
    authorization: {
      url: `${authBase}/i/oauth2/authorize`,
      params: {
        scope: opts.scope ?? 'tweet.read users.read offline.access',
        response_type: 'code',
      },
    },
    token: {
      url: `${apiBase}/2/oauth2/token`,
      style: 'form',
      headers: { Accept: 'application/json' },
    },
    userinfo: {
      url: `${apiBase}/2/users/me?user.fields=profile_image_url,name,username`,
      map: (raw) => {
        const u = raw.data ?? raw
        return {
          id: u.id,
          name: u.name ?? u.username ?? null,
          image: u.profile_image_url ?? null,
          email: null,
        }
      },
    },
    scopes: (opts.scope ?? '').split(' ').filter(Boolean),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret ?? '',
  } satisfies OAuthProvider & { clientId: string; clientSecret: string }
}
