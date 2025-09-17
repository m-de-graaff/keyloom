import path from "node:path";
import url from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        // Only replace bare specifier 'drizzle-orm', leave subpaths like 'drizzle-orm/pg-core' intact
        find: /^drizzle-orm$/,
        replacement: path.resolve(__dirname, "./tests/drizzle-mock.ts"),
      },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/adapter.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      enabled: true,
      all: true,
      include: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    },
  },
});
