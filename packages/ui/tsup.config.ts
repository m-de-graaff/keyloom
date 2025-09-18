import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "auth/index": "src/auth/index.ts",
    "components/index": "src/components/index.ts",
    "primitives/index": "src/primitives/index.ts",
    "org/index": "src/org/index.ts",
    "rbac/index": "src/rbac/index.ts",
    "icons/index": "src/icons/index.tsx",
    "theme/tokens": "src/theme/tokens.ts",
  },
  format: ["cjs", "esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "es2020",
  external: [
    "react",
    "react-dom",
    "next",
    "clsx",
    "lucide-react",
    "@radix-ui/*",
  ],
});
