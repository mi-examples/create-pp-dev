# @metricinsights/create-pp-dev <a href="https://npmjs.com/package/@metricinsights/create-pp-dev"><img src="https://img.shields.io/npm/v/@metricinsights/create-pp-dev" alt="npm package"></a>

## Scaffolding Your First Portal Page

> **Compatibility Note:**
> Vite requires [Node.js](https://nodejs.org/en/) version 18+, 20+. However, some templates require a higher Node.js version to work, please upgrade if your package manager warns about it.

ith NPM:

```bash
$ npm create @metricinsights/pp-dev@latest
```

With Yarn:

```bash
$ yarn create @metricinsights/pp-dev
```

With PNPM:

```bash
$ pnpm create @metricinsights/pp-dev
```

Then follow the prompts!

You can also directly specify the project name and the template you want to use via additional command line options. For example, to scaffold a Vite + Vue project, run:

```bash
# npm 7+, extra double-dash is needed:
npm create @metricinsights/pp-dev@latest my-pp -- --template react

# yarn
yarn create @metricinsights/pp-dev my-pp --template react

# pnpm
pnpm create @metricinsights/pp-dev my-pp --template react
```

Currently supported template presets include:

- `vanilla`
- `vanilla-ts`
- `react`
- `nextjs`

You can use `.` for the project name to scaffold in the current directory.
