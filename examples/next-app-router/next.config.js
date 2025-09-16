/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@keyloom/core',
    '@keyloom/nextjs',
    '@keyloom/providers',
    '@keyloom/adapters',
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
    }
    return config
  },
}
module.exports = nextConfig
