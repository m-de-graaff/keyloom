import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    payments: 'src/payments.ts',
    customers: 'src/customers.ts',
    subscriptions: 'src/subscriptions.ts',
    'payment-methods': 'src/payment-methods.ts',
    webhooks: 'src/webhooks.ts',
  },
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node18',
  platform: 'node',
  minify: false,
  splitting: false,
  shims: false,
  env: { NODE_ENV: process.env.NODE_ENV ?? 'development' },
  external: ['stripe', '@keyloom/core'],
})
