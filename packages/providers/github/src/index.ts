type GitHubProviderOptions = { clientId: string; clientSecret: string }

export default function github(opts: GitHubProviderOptions) {
  return { id: 'github', type: 'oauth', ...opts } as const
}
