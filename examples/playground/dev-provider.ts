import type { OAuthProvider } from '@keyloom/core'

export default function devProvider(opts: {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userinfoUrl: string
}): OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'dev',
    authorization: { url: opts.authorizationUrl },
    token: { url: opts.tokenUrl, style: 'json' },
    userinfo: {
      url: opts.userinfoUrl,
      map: (raw) => ({
        id: raw.id,
        email: raw.email,
        name: raw.name,
        image: raw.picture ?? null,
        emailVerified: true,
      }),
    },
    scopes: [],
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

