import type { OAuthProvider } from './types'
import { createPkce } from './pkce'
import { sealState, openState } from './state'
import { newSession } from '../session/model'
import type { Adapter } from '../adapter'

export async function startOAuth(opts: {
  provider: OAuthProvider & { clientId: string; clientSecret: string }
  baseUrl: string
  callbackPath: string
  callbackUrl?: string
  secrets: { authSecret: string }
}) {
  const { provider, baseUrl, callbackPath, callbackUrl, secrets } = opts
  const { verifier, challenge } = await createPkce()
  const statePayload = { p: provider.id, v: verifier, r: callbackUrl, t: Date.now() }
  const sealed = await sealState(new TextEncoder().encode(secrets.authSecret), statePayload)

  const authUrl = new URL(provider.authorization.url)
  const params = {
    client_id: (provider as any).clientId,
    response_type: 'code',
    redirect_uri: `${baseUrl}${callbackPath}`,
    scope: provider.scopes?.join(' ') ?? '',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: `${sealed.nonce}.${sealed.ct}`,
  }
  const extra = provider.authorization.params ?? {}
  Object.entries({ ...params, ...extra }).forEach(([k, v]) => authUrl.searchParams.set(k, String(v)))

  return {
    authorizeUrl: authUrl.toString(),
    stateCookie: `__keyloom_oauth=${params.state}; Path=/; SameSite=Lax; HttpOnly; Secure; Max-Age=600`,
  }
}

export async function completeOAuth(opts: {
  provider: OAuthProvider & { clientId: string; clientSecret: string }
  adapter: Adapter
  baseUrl: string
  callbackPath: string
  stateCookie: string | null
  stateParam: string | null
  code: string
  secrets: { authSecret: string }
  linkToUserId?: string
}) {
  const { provider, adapter, baseUrl, callbackPath, stateCookie, stateParam, code, secrets, linkToUserId } = opts
  if (!stateCookie || !stateParam || stateCookie !== stateParam) throw new Error('state_mismatch')

  const [nonce, ct] = (stateParam as string).split('.')
  const st = await openState(new TextEncoder().encode(secrets.authSecret), nonce, ct)
  if (st.p !== provider.id) throw new Error('state_wrong_provider')
  if (Date.now() - st.t > 10 * 60_000) throw new Error('state_expired')

  const { exchangeToken, fetchUserInfo } = await import('./client')
  const tokens = await exchangeToken(provider, code, `${baseUrl}${callbackPath}`, st.v)
  const profile = await fetchUserInfo(provider, tokens)

  const existingAcc = profile?.id
    ? await adapter.getAccountByProvider(provider.id, profile.id)
    : null

  // If linking to an existing signed-in user
  if (linkToUserId) {
    if (existingAcc && existingAcc.userId !== linkToUserId) {
      throw new Error('account_already_linked')
    }
    // Ensure user exists
    let user = await adapter.getUser(linkToUserId)
    if (!user) throw new Error('link_target_not_found')
    // Link account if not yet linked
    if (!existingAcc) {
      await adapter.linkAccount({
        id: undefined as any,
        userId: user.id,
        provider: provider.id,
        providerAccountId: profile?.id ?? 'no-id',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenType: tokens.token_type ?? null,
        expiresAt: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
        scope: tokens.scope ?? null,
      } as any)
    }
    const session = await adapter.createSession(newSession(linkToUserId))
    return { session, redirectTo: st.r ?? '/' }
  }

  let user = existingAcc ? await adapter.getUser(existingAcc.userId) : null

  if (!user) {
    user = profile?.email ? await adapter.getUserByEmail(profile.email) : null
    if (!user) {
      user = await adapter.createUser({
        email: profile?.email ?? null,
        emailVerified: profile?.emailVerified ? new Date() : null,
        name: profile?.name ?? null,
        image: profile?.image ?? null,
      })
    }
    await adapter.linkAccount({
      id: undefined as any,
      userId: user!.id,
      provider: provider.id,
      providerAccountId: profile?.id ?? 'no-id',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenType: tokens.token_type ?? null,
      expiresAt: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
      scope: tokens.scope ?? null,
    } as any)
  }

  const session = await adapter.createSession(newSession(user!.id))

  return { session, redirectTo: st.r ?? '/' }
}

