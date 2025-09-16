import type { OAuthProvider } from '@keyloom/core'

type GitHubProviderOptions = { clientId: string; clientSecret: string }

export function github(opts: GitHubProviderOptions): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'github',
    authorization: {
      url: 'https://github.com/login/oauth/authorize',
      params: { scope: 'read:user user:email' },
    },
    token: {
      url: 'https://github.com/login/oauth/access_token',
      headers: { Accept: 'application/json' },
      style: 'form',
    },
    userinfo: {
      url: 'https://api.github.com/user',
      map: (raw) => ({
        id: String(raw.id),
        name: raw.name ?? raw.login ?? null,
        image: raw.avatar_url ?? null,
        email: raw.email ?? null,
      }),
    },
    scopes: ['read:user', 'user:email'],
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

export default github
