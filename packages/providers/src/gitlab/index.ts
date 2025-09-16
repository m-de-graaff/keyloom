import type { OAuthProvider } from '@keyloom/core'

export default function gitlab(opts: {
  clientId: string
  clientSecret: string
  baseUrl?: string
  scope?: string
}) {
  const base = opts.baseUrl ?? 'https://gitlab.com'
  return {
    id: 'gitlab',
    authorization: {
      url: `${base}/oauth/authorize`,
      params: { scope: opts.scope ?? 'read_user openid profile email' },
    },
    token: { url: `${base}/oauth/token`, style: 'form' },
    userinfo: {
      url: `${base}/api/v4/user`,
      map: (raw) => ({
        id: String(raw.id),
        email: raw.email ?? null,
        name: raw.name ?? raw.username ?? null,
        image: raw.avatar_url ?? null,
      }),
    },
    scopes: (opts.scope ?? '').split(' ').filter(Boolean),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  } satisfies OAuthProvider & { clientId: string; clientSecret: string }
}
