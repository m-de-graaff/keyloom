import type { OAuthProvider } from '@keyloom/core'

export default function microsoft(opts: {
  clientId: string
  clientSecret: string
  tenant?: string
  scope?: string
}) {
  const tenant = opts.tenant ?? 'common'
  const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`
  return {
    id: 'microsoft',
    discovery: { issuer },
    authorization: {
      url: `${issuer}/oauth2/v2.0/authorize`,
      params: { scope: opts.scope ?? 'openid profile email offline_access' },
    },
    token: { url: `${issuer}/oauth2/v2.0/token`, style: 'form' },
    // Let discovery provide userinfo URL; fallback to id_token:
    profileFromIdToken: (c) => ({
      id: c.sub,
      email: c.email ?? c.preferred_username ?? null,
      name: c.name ?? null,
      image: null,
      emailVerified: c.email_verified ?? undefined,
    }),
    scopes: (opts.scope ?? '').split(' ').filter(Boolean),
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  } satisfies OAuthProvider & { clientId: string; clientSecret: string }
}
