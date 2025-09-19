import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs", "esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "es2020",
  external: ["@keyloom/core", "@keyloom/react", "react"],
});

