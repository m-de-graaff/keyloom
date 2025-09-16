type GitHubProviderOptions = { clientId: string; clientSecret: string }

export function github(opts: GitHubProviderOptions) {
  return { id: 'github', type: 'oauth', ...opts } as const
}

export default github
