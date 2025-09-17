export type DevProviderOptions = {
  id?: string
  name?: string
}

export function devProvider(options: DevProviderOptions = {}) {
  const id = options.id ?? 'dev'
  const name = options.name ?? 'Dev'
  return {
    id,
    name,
    type: 'oauth' as const,
    // Minimal stub provider useful for local testing
    authorization: { url: 'http://localhost:3000/oauth/authorize', params: { scope: '' } },
    token: 'http://localhost:3000/oauth/token',
    userinfo: 'http://localhost:3000/oauth/userinfo',
    profile: (profile: any) => ({
      id: String(profile.id ?? 'dev-user'),
      name: profile.name ?? 'Dev User',
      email: profile.email ?? null,
      image: profile.image ?? null,
    }),
  }
}

export default devProvider

