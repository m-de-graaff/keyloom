import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    apple: 'src/apple/index.ts',
    auth0: 'src/auth0/index.ts',
    authentik: 'src/authentik/index.ts',
    dev: 'src/dev/index.ts',
    discord: 'src/discord/index.ts',
    facebook: 'src/facebook/index.ts',
    github: 'src/github/index.ts',
    gitlab: 'src/gitlab/index.ts',
    google: 'src/google/index.ts',
    instagram: 'src/instagram/index.ts',
    linkedin: 'src/linkedin/index.ts',
    microsoft: 'src/microsoft/index.ts',
    reddit: 'src/reddit/index.ts',
    spotify: 'src/spotify/index.ts',
    tiktok: 'src/tiktok/index.ts',
    twitch: 'src/twitch/index.ts',
    x: 'src/x/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  external: ['@keyloom/core'],
  target: 'node18',
})
