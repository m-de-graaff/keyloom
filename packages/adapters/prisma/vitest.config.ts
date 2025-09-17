import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@keyloom/adapters-contracts": fileURLToPath(
        new URL("../_contracts/index.ts", import.meta.url)
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      enabled: true,
      all: false,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
    },
    environment: "node",
    globals: true,
  },
});
