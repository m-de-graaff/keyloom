import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/shared/types.ts',
    'github/index': 'src/github/index.ts',
    'google/index': 'src/google/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
