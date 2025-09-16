/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
  transpilePackages: [
    '@keyloom/core',
    '@keyloom/nextjs',
    '@keyloom/providers/github',
    '@keyloom/adapters/prisma',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle native modules on server side
      config.externals.push('@node-rs/argon2', '@node-rs/argon2-wasm32-wasi')
    } else {
      // Handle Node.js modules in browser context
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'node:crypto': false,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      }
      // Exclude server-only files from client bundle
      config.externals = config.externals || []
      config.externals.push('./keyloom.config.ts')
    }
    return config
  },
}
module.exports = nextConfig
