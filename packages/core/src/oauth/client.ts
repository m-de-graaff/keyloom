import type { OAuthProvider, Tokens } from './types'

export async function exchangeToken(
  provider: OAuthProvider & { clientId: string; clientSecret: string },
  code: string,
  redirectUri: string,
  codeVerifier: string,
) {
  const isForm = provider.token.style === 'form'
  const body = isForm
    ? new URLSearchParams({
        client_id: (provider as any).clientId,
        client_secret: (provider as any).clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      })
    : JSON.stringify({
        client_id: (provider as any).clientId,
        client_secret: (provider as any).clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      })

  const r = await fetch(provider.token.url, {
    method: 'POST',
    headers: {
      ...(isForm
        ? { 'content-type': 'application/x-www-form-urlencoded' }
        : { 'content-type': 'application/json' }),
      ...(provider.token.headers ?? {}),
    },
    body: body as any,
  })
  if (!r.ok) throw new Error('token_exchange_failed')
  return (await r.json()) as Tokens
}

export async function fetchUserInfo(provider: OAuthProvider, tokens: Tokens) {
  if (!provider.userinfo) return null
  const r = await fetch(provider.userinfo.url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!r.ok) throw new Error('userinfo_failed')
  const raw = await r.json()
  return provider.userinfo.map(raw, tokens)
}

