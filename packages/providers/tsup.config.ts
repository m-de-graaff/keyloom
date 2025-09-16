import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    github: 'src/github/index.ts',
    google: 'src/google/index.ts',
    discord: 'src/discord/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@keyloom/core'],
  target: 'node18',
})
