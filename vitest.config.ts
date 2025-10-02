import { defineConfig } from 'vitest/config'

const coverageInclude = ['packages/core/src/**/*.{ts,tsx}', 'packages/cli/src/**/*.{ts,tsx}']
const coverageExclude = [
  '**/dist/**',
  '**/coverage/**',
  '**/*.d.ts',
  '**/*.test.{ts,tsx}',
  '**/types.ts',
]

export default defineConfig({
  test: {
    include: [
      'packages/core/tests/**/*.test.ts',
      'packages/cli/tests/**/*.test.ts',
      'packages/nextjs/src/**/*.test.ts',
      'packages/providers/tests/**/*.test.ts',
      'packages/adapters/tests/**/*.test.ts',
      'packages/adapters/**/tests/**/*.test.ts',
      'packages/ui/src/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    globals: true,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      all: true,
      include: coverageInclude,
      exclude: coverageExclude,
    },
  },
})
