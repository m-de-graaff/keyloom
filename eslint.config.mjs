import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'

export default [
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
    ],
  },
  {
    files: [
      '**/{src,tests}/**/*.{ts,tsx,js,cjs,mjs}',
      'packages/*/{src,tests}/**/*.{ts,tsx,js,cjs,mjs}',
      'examples/**/*.{ts,tsx,js,cjs,mjs}',
      'scripts/**/*.{js,cjs,mjs}',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
    },
    settings: {
      'import/internal-regex': '^(@keyloom|@/|~/)',
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.cjs', '.mjs'] },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      // Keep zero-warnings: enforce order; keep no-cycle off for now
      'import/order': 'off',
      'import/no-cycle': ['error', { ignoreExternal: true, maxDepth: 10 }],
    },
  },
]
