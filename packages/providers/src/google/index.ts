import type { OAuthProvider } from '@keyloom/core'

export default function google(opts: { clientId: string; clientSecret: string }):
  OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'google',
    discovery: { issuer: 'https://accounts.google.com' },
    authorization: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: { scope: 'openid email profile', access_type: 'offline', prompt: 'consent' },
    },
    token: { url: 'https://oauth2.googleapis.com/token', style: 'json' },
    userinfo: {
      url: 'https://openidconnect.googleapis.com/v1/userinfo',
      map: (raw: any) => ({
        id: raw.sub,
        email: raw.email ?? null,
        name: raw.name ?? null,
        image: raw.picture ?? null,
        emailVerified: !!raw.email_verified,
      }),
    },
    scopes: ['openid', 'email', 'profile'],
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

