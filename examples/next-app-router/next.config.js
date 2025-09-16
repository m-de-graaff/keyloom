/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@keyloom/core',
    '@keyloom/nextjs',
    '@keyloom/providers/github',
    '@keyloom/adapters/prisma',
  ],
}
module.exports = nextConfig
