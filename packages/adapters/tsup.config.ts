import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    prisma: 'src/prisma/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  target: 'node18',
  external: ['@keyloom/core', '@prisma/client'],
})
