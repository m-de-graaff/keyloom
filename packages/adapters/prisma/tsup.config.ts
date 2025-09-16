import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node18',
  platform: 'node',
  external: ['@keyloom/core', '@prisma/client'],
})
