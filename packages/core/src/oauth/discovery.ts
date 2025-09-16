export type OidcDiscovery = {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint?: string
  jwks_uri?: string
}

const cache = new Map<string, Promise<OidcDiscovery>>()

export function discover(issuer: string): Promise<OidcDiscovery> {
  const normalized = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer
  const url = `${normalized}/.well-known/openid-configuration`
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`oidc_discovery_failed:${r.status}`)
        return r.json()
      }),
    )
  }
  return cache.get(url)!
}

export async function resolveEndpoints(provider: {
  discovery?: { issuer: string }
  authorization?: { url?: string }
  token?: { url?: string }
  userinfo?: { url?: string }
}): Promise<{
  authorizationUrl?: string
  tokenUrl?: string
  userinfoUrl?: string
}> {
  if (!provider.discovery?.issuer) {
    const out: {
      authorizationUrl?: string
      tokenUrl?: string
      userinfoUrl?: string
    } = {}
    if (provider.authorization?.url) out.authorizationUrl = provider.authorization.url
    if (provider.token?.url) out.tokenUrl = provider.token.url
    if (provider.userinfo?.url) out.userinfoUrl = provider.userinfo.url
    return out
  }

  const meta = await discover(provider.discovery.issuer)
  const out: {
    authorizationUrl?: string
    tokenUrl?: string
    userinfoUrl?: string
  } = {}
  out.authorizationUrl = provider.authorization?.url ?? meta.authorization_endpoint
  out.tokenUrl = provider.token?.url ?? meta.token_endpoint
  if (provider.userinfo?.url ?? meta.userinfo_endpoint) {
    out.userinfoUrl = (provider.userinfo?.url ?? meta.userinfo_endpoint) as string
  }
  return out
}
