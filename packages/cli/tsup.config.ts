import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['bin/keyloom.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  shims: false,
})
