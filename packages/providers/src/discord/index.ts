import type { OAuthProvider } from '@keyloom/core'

export default function discord(opts: { clientId: string; clientSecret: string }):
  OAuthProvider & { clientId: string; clientSecret: string } {
  return {
    id: 'discord',
    authorization: {
      url: 'https://discord.com/api/oauth2/authorize',
      params: { scope: 'identify email' },
    },
    token: { url: 'https://discord.com/api/oauth2/token', style: 'form' },
    userinfo: {
      url: 'https://discord.com/api/users/@me',
      map: (raw) => ({
        id: raw.id,
        email: raw.email ?? null,
        name: raw.global_name ?? raw.username ?? null,
        image: raw.avatar
          ? `https://cdn.discordapp.com/avatars/${raw.id}/${raw.avatar}.png`
          : null,
      }),
    },
    scopes: ['identify', 'email'],
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  }
}

