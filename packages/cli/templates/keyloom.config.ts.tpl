import { defineKeyloom } from '@keyloom/core';
import adapter from '@keyloom/adapters/{{adapter}}';
{{#providers.github}}import github from '@keyloom/providers/github';{{/providers.github}}
{{#providers.google}}import google from '@keyloom/providers/google';{{/providers.google}}
{{#providers.discord}}import discord from '@keyloom/providers/discord';{{/providers.discord}}

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
  session: { strategy: '{{sessionStrategy}}', ttlMinutes: 60, rolling: true },
  adapter: adapter({ url: process.env.DATABASE_URL! }),
  providers: [
    {{#providers.github}}github({ clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! }),{{/providers.github}}
    {{#providers.google}}google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),{{/providers.google}}
    {{#providers.discord}}discord({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET! }),{{/providers.discord}}
  ],
  rbac: { enabled: {{rbac}} },
  cookie: { sameSite: '{{cookieSameSite}}' },
  secrets: { authSecret: process.env.AUTH_SECRET! },
});

