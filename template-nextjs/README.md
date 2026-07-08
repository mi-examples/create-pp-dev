# Next.js + PP Dev

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`@metricinsights/create-pp-dev`](https://github.com/mi-examples/pp-dev-js/tree/main/packages/create-pp-dev).

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

You can start editing the page by modifying `src/pages/index.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [PP Dev Documentation](https://www.npmjs.com/package/@metricinsights/pp-dev) - learn about PP Dev features and API.
- [Metric Insights Docs](https://help.metricinsights.com/) - learn about Metric Insights features and API.

## PP Dev Helper configuration

Before using the PP Dev Helper, you need to configure it. You need to change the `pp-dev.config.ts` file in the root directory of your project.

```typescript
// pp-dev.config.ts
import { defineConfig } from '@metricinsights/pp-dev';

export default defineConfig({
  mi: {
    /**
     * Metric Insights instance URL
     */
    url: 'https://example.metricinsights.com',
    mode: 'standalone',
    include: 'top-bar',
    apiVersion: 7,
  },
  app: {
    /**
     * Portal page / app ID
     */
    id: 1,
    type: 'template',
  },
});
```
