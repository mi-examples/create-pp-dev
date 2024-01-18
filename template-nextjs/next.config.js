const { withPPDev } = require('@metricinsights/pp-dev');
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const packageJson = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: `/pt/${packageJson.name}`,
  basePath: `/p/${packageJson.name}`,
};

const developmentNextConfig = Object.assign({}, nextConfig, {
  basePath: `/pt/${packageJson.name}`,
});

module.exports = withPPDev((phase, { defaultConfig }) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return developmentNextConfig;
  }

  return nextConfig;
});
