# @metricinsights/create-pp-dev

<a href="https://npmjs.com/package/@metricinsights/create-pp-dev"><img src="https://img.shields.io/npm/v/@metricinsights/create-pp-dev" alt="npm package"></a>

## Overview

`@metricinsights/create-pp-dev` is a CLI tool for scaffolding new MetricInsights Portal Page projects. It provides various templates to help you get started quickly with Portal Page development.

## Requirements

- [Node.js](https://nodejs.org/en/) version 18+, 20+
- npm, yarn, or pnpm package manager

> **Note:** Some templates may require a higher Node.js version. Please upgrade if your package manager warns about compatibility issues.

## Usage

### Basic Usage

```bash
# Using npm
npm create @metricinsights/pp-dev@latest

# Using yarn
yarn create @metricinsights/pp-dev

# Using pnpm
pnpm create @metricinsights/pp-dev
```

### Advanced Usage

You can directly specify the project name and template via command line options:

```bash
# npm 7+, extra double-dash is needed:
npm create @metricinsights/pp-dev@latest my-pp -- --template react

# yarn
yarn create @metricinsights/pp-dev my-pp --template react

# pnpm
pnpm create @metricinsights/pp-dev my-pp --template react
```

To scaffold in the current directory, use `.` as the project name:

```bash
npm create @metricinsights/pp-dev@latest . -- --template react
```

## Available Templates

- `vanilla` - Basic Portal Page with vanilla JavaScript
- `vanilla-ts` - Basic Portal Page with TypeScript
- `react` - Portal Page with React
- `nextjs` - Portal Page with Next.js

## Next Steps

After creating your project:

1. Navigate to the project directory
2. Install dependencies
3. Start the development server
4. Follow the instructions in the generated project's README

For more information about developing Portal Pages, see the [pp-dev documentation](../pp-dev/README.md).
