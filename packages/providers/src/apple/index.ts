import type { OAuthProvider } from '@keyloom/core'
import { makeAppleClientSecret } from '@keyloom/core'

type AppleOpts = {
  clientId: string // Service ID (e.g., com.example.app.web)
  teamId: string
  keyId: string
  privateKey: string // contents of AuthKey_<keyId>.p8
  scope?: 'name email' | string
}

export default function apple(opts: AppleOpts) {
  const authUrl = 'https://appleid.apple.com/auth/authorize'
  const tokenUrl = 'https://appleid.apple.com/auth/token'

  return {
    id: 'apple',
    authorization: {
      url: authUrl,
      params: { scope: opts.scope ?? 'name email', response_mode: 'form_post' },
    },
    token: {
      url: tokenUrl,
      style: 'form',
      customizeBody: async (body) => {
        const params = body as URLSearchParams
        params.set(
          'client_secret',
          await makeAppleClientSecret({
            clientId: opts.clientId,
            teamId: opts.teamId,
            keyId: opts.keyId,
            privateKey: opts.privateKey,
          }),
        )
        return params
      },
    },
    // No userinfo; map from id_token:
    profileFromIdToken: (claims) => ({
      id: claims.sub,
      email: claims.email ?? null,
      name: claims.name ?? claims.email ?? null,
      image: null,
      emailVerified: claims.email_verified === 'true' || claims.email_verified === true,
    }),
    scopes: ['name', 'email'],
    clientId: opts.clientId,
    clientSecret: '', // computed dynamically; not stored statically
  } as const satisfies OAuthProvider & {
    clientId: string
    clientSecret: string
  }
}
