/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static optimization for app router
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
