import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  dts: true,
  format: ['esm', 'cjs'],
  clean: true,
  target: 'es2022',
  treeshake: true,
  minify: false,
});
