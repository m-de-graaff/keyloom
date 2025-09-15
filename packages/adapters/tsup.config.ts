import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/shared/types.ts',
    'prisma/index': 'src/prisma/index.ts',
    'drizzle-postgres/index': 'src/drizzle-postgres/index.ts',
    'drizzle-mysql/index': 'src/drizzle-mysql/index.ts',
    'mongo/index': 'src/mongo/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
