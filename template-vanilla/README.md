# JavaScript + PP Dev

This template provides a minimal setup to get Portal Page working in PP Dev with HMR and some ESLint rules.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/main.js` and `index.html`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [PP Dev Documentation](https://www.npmjs.com/package/@metricinsights/pp-dev) - learn about PP Dev features and API.
- [Metric Insights Docs](https://help.metricinsights.com/) - learn about Metric Insights features and API.

## PP Dev Helper configuration

Before using the PP Dev Helper, you need to configure it. You need to change the `pp-dev.config.js` file in the root directory of your project.

```javascript
// pp-dev.config.js
/**
 * @type {import('@metricinsights/pp-dev').PPDevConfig}
 */
export default {
  /**
   * Backend base URL
   */
  backendBaseURL: 'https://640.metricinsights.com',
  /**
   * Portal page ID
   */
  portalPageId: 1,
  /**
   * Disable MI top bar
   */
  miHudLess: false,
};
```
