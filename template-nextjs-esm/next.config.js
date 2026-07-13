import { withPPDev } from '@metricinsights/pp-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  cleanDistDir: true,
  reactStrictMode: true,
  distDir: 'dist',
};

export default withPPDev(nextConfig);
