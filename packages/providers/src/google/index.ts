import type { User } from '@keyloom/core';

export type GoogleProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
};

export default function google(cfg: GoogleProviderConfig) {
  return {
    id: 'google',
    authorization: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: { scope: 'openid email profile' },
    },
    token: { url: 'https://oauth2.googleapis.com/token' },
    userinfo: {
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      map: (raw: any): Partial<User> => ({
        id: String(raw.sub),
        name: raw.name,
        image: raw.picture,
        email: raw.email,
      }),
    },
  } as const;
}
