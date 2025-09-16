export type OAuthProvider = {
  id: string;
  discovery?: { issuer: string };
  authorization: { url: string; params?: Record<string, string> };
  token: { url: string; headers?: Record<string, string>; style?: 'json' | 'form' };
  userinfo?: {
    url: string;
    map: (raw: any, tokens: Tokens) => {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      emailVerified?: boolean;
    };
  };
  scopes?: string[];
};

export type Tokens = {
  access_token: string;
  token_type?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
};

