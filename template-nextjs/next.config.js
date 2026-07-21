const { withPPDev } = require('@metricinsights/pp-dev');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  cleanDistDir: true,
  reactStrictMode: true,
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

module.exports = withPPDev(nextConfig);
