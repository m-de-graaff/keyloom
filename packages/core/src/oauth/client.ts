import { resolveEndpoints } from './discovery'
import { parseIdToken } from './idtoken'
import type { OAuthProvider, Profile, Tokens } from './types'

export async function exchangeToken(
  provider: OAuthProvider & { clientId: string; clientSecret: string },
  code: string,
  redirectUri: string,
  codeVerifier: string,
) {
  const endpoints = await resolveEndpoints(provider)
  const tokenUrl = endpoints.tokenUrl ?? provider.token.url

  const isForm = provider.token.style === 'form'
  let body: URLSearchParams | Record<string, unknown>
  if (isForm) {
    body = new URLSearchParams({
      client_id: (provider as any).clientId,
      client_secret: (provider as any).clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    })
  } else {
    body = {
      client_id: (provider as any).clientId,
      client_secret: (provider as any).clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }
  }

  if (typeof provider.token.customizeBody === 'function') {
    body = await Promise.resolve(provider.token.customizeBody(body))
  }

  const r = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      ...(isForm
        ? { 'content-type': 'application/x-www-form-urlencoded' }
        : { 'content-type': 'application/json' }),
      ...(provider.token.headers ?? {}),
    },
    body: (isForm ? (body as URLSearchParams) : JSON.stringify(body)) as any,
  })
  if (!r.ok) throw new Error('token_exchange_failed')
  return (await r.json()) as Tokens
}

export async function fetchUserInfo(
  provider: OAuthProvider,
  tokens: Tokens,
): Promise<Profile | null> {
  const endpoints = await resolveEndpoints(provider)
  const userinfoUrl = provider.userinfo?.url ?? endpoints.userinfoUrl

  // If no userinfo endpoint but id_token is available and a mapper is provided, use it
  if (!userinfoUrl && tokens.id_token && provider.profileFromIdToken) {
    const claims = parseIdToken(tokens.id_token)
    return provider.profileFromIdToken(claims)
  }

  if (!userinfoUrl) return null

  const r = await fetch(userinfoUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!r.ok) throw new Error('userinfo_failed')
  const raw = await r.json()
  if (provider.userinfo?.map) return provider.userinfo.map(raw, tokens)
  // Fallback OIDC-ish mapping
  return {
    id: raw.sub ?? String(raw.id ?? ''),
    email: raw.email ?? null,
    name: raw.name ?? null,
    image: raw.picture ?? null,
    emailVerified: raw.email_verified ?? undefined,
  }
}
