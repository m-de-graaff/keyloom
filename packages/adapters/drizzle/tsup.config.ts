import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/schema.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  external: ['drizzle-orm'],
})
