import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/middleware.ts', 'src/edge.ts', 'src/route-types.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node18',
  platform: 'node',
  minify: false,
  splitting: false,
  shims: false,
  env: { NODE_ENV: process.env.NODE_ENV ?? 'development' },
  external: ['@keyloom/core', '@node-rs/argon2', 'bcryptjs', 'next', 'react'],
})
