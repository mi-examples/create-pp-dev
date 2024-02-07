# React + TypeScript + PP Dev

This template provides a minimal setup to get React working in PP Dev with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh

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

You can start editing the page by modifying `src/app.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [TypeScript Docs](https://www.typescriptlang.org/) - learn about TypeScript features and API.
- [React.js Docs](https://react.dev) - learn about React features and API.
- [PP Dev Documentation](https://www.npmjs.com/package/@metricinsights/pp-dev) - learn about PP Dev features and API.
- [Metric Insights Docs](https://help.metricinsights.com/) - learn about Metric Insights features and API.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

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
