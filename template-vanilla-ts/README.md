# TypeScript + PP Dev

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

You can start editing the page by modifying `src/main.ts` and `index.html`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [TypeScript Docs](https://www.typescriptlang.org/) - learn about TypeScript features and API.
- [PP Dev Documentation](https://www.npmjs.com/package/@metricinsights/pp-dev) - learn about PP Dev features and API.
- [Metric Insights Docs](https://help.metricinsights.com/) - learn about Metric Insights features and API.

## PP Dev Helper configuration

Before using the PP Dev Helper, you need to configure it. You need to change the `pp-dev.config.ts` file in the root directory of your project.

```typescript
// pp-dev.config.ts
import { PPDevConfig } from '@metricinsights/pp-dev';

const config: PPDevConfig = {
  /**
   * Backend base URL
   */
  backendBaseURL: 'https://example.metricinsights.com',
  /**
   * Portal page ID
   */
  portalPageId: 1,
  /**
   * Disable MI top bar
   */
  miHudLess: true,
};

export default config;
```
