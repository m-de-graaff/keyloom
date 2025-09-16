import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    github: 'src/github/index.ts',
    google: 'src/google/index.ts',
    discord: 'src/discord/index.ts',
    x: 'src/x/index.ts',
    gitlab: 'src/gitlab/index.ts',
    microsoft: 'src/microsoft/index.ts',
    apple: 'src/apple/index.ts',
    auth0: 'src/auth0/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@keyloom/core'],
  target: 'node18',
})
