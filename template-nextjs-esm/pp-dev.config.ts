import { defineConfig } from '@metricinsights/pp-dev';

export default defineConfig({
  mi: {
    /**
     * Metric Insights instance URL
     */
    // url: 'https://example.metricinsights.com',
    mode: 'standalone',
    include: 'top-bar',
    apiVersion: 7,
  },
  app: {
    /**
     * Portal page / app ID
     */
    // id: 1,
    type: 'template',
  },
});
