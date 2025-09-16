import type { OAuthProvider } from '@keyloom/core'

export default function auth0(opts: {
  domain: string
  clientId: string
  clientSecret: string
  scope?: string
}) {
  const issuer = `https://${opts.domain}/`
  return {
    id: 'auth0',
    discovery: { issuer },
    authorization: {
      url: `${issuer}authorize`,
      params: { scope: opts.scope ?? 'openid profile email offline_access' },
    },
    token: { url: `${issuer}oauth/token`, style: 'form' },
    profileFromIdToken: (c) => ({
      id: c.sub,
      email: c.email ?? null,
      name: c.name ?? null,
      image: c.picture ?? null,
      emailVerified: c.email_verified ?? undefined,
    }),
    scopes: (opts.scope ?? '').split(' ').filter(Boolean),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  } satisfies OAuthProvider & { clientId: string; clientSecret: string }
}
