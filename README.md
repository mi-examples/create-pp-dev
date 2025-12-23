# @metricinsights/create-pp-dev

<a href="https://npmjs.com/package/@metricinsights/create-pp-dev"><img src="https://img.shields.io/npm/v/@metricinsights/create-pp-dev" alt="npm package"></a>

## Overview

`@metricinsights/create-pp-dev` is a CLI tool for scaffolding new MetricInsights Portal Page projects. It provides various templates to help you start quickly with Portal Page development.

## Requirements

- [Node.js](https://nodejs.org/en/) version 22+
- npm, yarn, or pnpm package manager

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

| Template | Description |
|----------|-------------|
| `vanilla` | Basic Portal Page with vanilla JavaScript |
| `vanilla-ts` | Basic Portal Page with TypeScript |
| `react` | Portal Page with React |
| `nextjs` | Portal Page with Next.js |

## Interactive Features

During project setup, the CLI will prompt you with optional features:

- **Cursor Rules** - Add AI-assisted development rules for [Cursor IDE](https://cursor.sh/). These rules help the AI understand MetricInsights Portal Page conventions.

- **@metricinsights/pp-components** - Optionally include the [@metricinsights/pp-components](https://www.npmjs.com/package/@metricinsights/pp-components) library with pre-built UI components for Portal Pages.

- **Auto-install packages** - Choose to automatically run package installation after scaffolding.

## Next Steps

After creating your project:

```bash
cd my-pp
npm install
npm run dev
```

Follow the instructions in the generated project's README for more details.

For more information about developing Portal Pages, see the [@metricinsights/pp-dev documentation](https://www.npmjs.com/package/@metricinsights/pp-dev).

## License

ISC
