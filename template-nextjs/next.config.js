const { withPPDev } = require('@metricinsights/pp-dev');
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const packageJson = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  cleanDistDir: true,
  reactStrictMode: true,
  distDir: 'dist',
  assetPrefix: `/pt/${packageJson.name}`,
  basePath: `/p/${packageJson.name}`,
};

const developmentNextConfig = Object.assign(
  {},
  nextConfig,
  /** @type {import('next').NextConfig} */ {
    basePath: `/pt/${packageJson.name}`,
  },
);

module.exports = withPPDev((phase, { defaultConfig }) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return developmentNextConfig;
  }

  return nextConfig;
});
