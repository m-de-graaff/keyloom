import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/runtime/register.ts',
    'src/runtime/login.ts',
    'src/runtime/logout.ts',
    'src/runtime/current-session.ts',
    'src/guard/csrf.ts'
  ],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: false,
  treeshake: true,
  target: 'node18',
  platform: 'node',
  minify: false,
  splitting: false,
  shims: false,
  env: { NODE_ENV: process.env.NODE_ENV ?? 'development' },
  external: ['@node-rs/argon2', 'bcryptjs'],
})
