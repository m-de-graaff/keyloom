import type { User } from '@keyloom/core';

export type GitHubProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
};

export default function github(cfg: GitHubProviderConfig) {
  return {
    id: 'github',
    authorization: {
      url: 'https://github.com/login/oauth/authorize',
      params: { scope: 'read:user user:email' },
    },
    token: { url: 'https://github.com/login/oauth/access_token' },
    userinfo: {
      url: 'https://api.github.com/user',
      map: (raw: any): Partial<User> => ({
        id: String(raw.id),
        name: raw.name,
        image: raw.avatar_url,
        email: raw.email,
      }),
    },
  } as const;
}
