# @metricinsights/create-pp-dev

<a href="https://npmjs.com/package/@metricinsights/create-pp-dev"><img src="https://img.shields.io/npm/v/@metricinsights/create-pp-dev" alt="npm package"></a>

## Overview

`@metricinsights/create-pp-dev` is a CLI tool for scaffolding new Metric Insights Portal Page projects. It copies one of the templates below into a new directory, names the project and, on request, adds the MI Cursor rules and the [@metricinsights/pp-components](https://www.npmjs.com/package/@metricinsights/pp-components) library and installs the packages. Every template runs on [@metricinsights/pp-dev](https://www.npmjs.com/package/@metricinsights/pp-dev), the local development framework and build tool for Portal Pages.

## Requirements

- [Node.js](https://nodejs.org/en/) 24 or newer (the templates require it too)
- npm 10 or newer, yarn, or pnpm

## Usage

### Interactive

```bash
# Using npm
npm create @metricinsights/pp-dev@latest

# Using yarn
yarn create @metricinsights/pp-dev

# Using pnpm
pnpm create @metricinsights/pp-dev
```

The CLI asks for the project name, the package name, the framework and its variant, and then whether to add the Cursor rules, add `@metricinsights/pp-components` and install the packages.

### With arguments

Every question has a flag. A flag that is passed is not asked; `--yes` answers the rest with the defaults.

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

| Flag                                     | Answers                                                                            | Default with `--yes`             |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `[project-name]`                         | the directory to create (`.` for the current one)                                  | `pp-project`                     |
| `-t, --template <name>`                  | the template (see below)                                                           | none: `--yes` needs `--template` |
| `--package-name <name>`                  | `name` in the project's `package.json`                                             | derived from the directory name  |
| `--install` / `--no-install`             | run the package manager's install after scaffolding                                | install                          |
| `--cursor-rules` / `--no-cursor-rules`   | copy the MI Cursor rules into `.cursor/rules`                                      | no                               |
| `--pp-components` / `--no-pp-components` | add `@metricinsights/pp-components` as a dependency                                | no                               |
| `-y, --yes`                              | ask nothing: take the defaults above; a non-empty target directory is accepted only when the template would overwrite none of its files | — |
| `-h, --help`                             | print the usage                                                                    |                                  |
| `-v, --version`                          | print the version                                                                  |                                  |

The package manager is the one that runs the CLI (`npm create` → npm, `yarn create` → yarn, `pnpm create` → pnpm).

#### Non-interactive use (CI, scripts)

Without a terminal the CLI never prompts: a question that no flag answers ends the run with exit code 1 and the flag to pass. Pass every flag, or `--yes` plus `--template`:

```bash
npm create @metricinsights/pp-dev@latest my-pp -- --template nextjs --yes --no-install
```

An unknown flag, an unknown template or an invalid package name also exit with 1, before anything is written. A failed install exits with 1 and leaves the scaffolded files in place.

## Available Templates

| Template     | Description                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| `vanilla`    | Portal Page with vanilla JavaScript on Vite                                                                   |
| `vanilla-ts` | Portal Page with TypeScript on Vite                                                                           |
| `react`      | Portal Page with React and TypeScript on Vite                                                                 |
| `nextjs`     | Portal Page with Next.js (pages router, static export) in a CommonJS project: `next.config.js` uses `require` |
| `nextjs-esm` | The same Next.js project with `"type": "module"`: `next.config.js` uses `import`/`export`                     |

Pick `nextjs-esm` for a new project unless something in your toolchain still needs CommonJS; the two templates are otherwise identical. The Vite templates ship `mi.mode: 'embedding'` (the page is rendered inside the MI navigation), the React and Next.js templates `mi.mode: 'standalone'` with the MI top bar bundled in; both can be changed in `pp-dev.config.*`.

## Interactive Features

During project setup, the CLI offers optional features:

- **Cursor Rules** - Add AI-assisted development rules for [Cursor IDE](https://cursor.sh/). These rules help the AI understand Metric Insights Portal Page conventions and the MI REST API.

- **@metricinsights/pp-components** - Optionally include the [@metricinsights/pp-components](https://www.npmjs.com/package/@metricinsights/pp-components) library with pre-built UI components for Portal Pages. The version comes from the npm registry the package manager is configured with; if the registry cannot be reached, `^1.0.0` is written and a warning printed.

- **Auto-install packages** - Choose to automatically run package installation after scaffolding.

## Next Steps

After creating your project:

```bash
cd my-pp
npm install
npm run dev
```

Before the first `npm run dev`, set `mi.url` and `app.id` in `pp-dev.config.*` and put your personal access token into `.env` as `MI_ACCESS_TOKEN` (the generated `.gitignore` keeps `.env` out of git). Follow the instructions in the generated project's README for more details.

For more information about developing Portal Pages, see the [@metricinsights/pp-dev documentation](https://www.npmjs.com/package/@metricinsights/pp-dev).

## Development

```bash
npm run build          # build dist/index.mjs and pack the tarball
npm run lint
npm run typecheck
npm run format:check
npm test               # builds, then scaffolds and installs every template (minutes)
npx playwright test --grep @offline   # the quick subset without network
```

Commit conventions and the release process are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Releases

Releases use the shared workflows from [mi-examples-workflows](https://github.com/mi-examples/mi-examples-workflows) ([release flow](https://github.com/mi-examples/mi-examples-workflows/blob/main/docs/workflows.md#release-workflows)):

- every push to `develop` with releasable commits publishes `X.Y.Z-beta.N` under the `beta` dist-tag (`npm create @metricinsights/pp-dev@beta`);
- **Actions → Release → Run workflow** opens a release pull request into `main`; merging it publishes `latest` and opens the back-merge into `develop`;
- versions come from [Conventional Commits](https://www.conventionalcommits.org/) (`feat` → minor; `fix`, `perf`, `revert` → patch; `!` or `BREAKING CHANGE:` → major);
- `CHANGELOG.md` and the tags are written by the release workflow (from 1.1.8 on; older entries were written by semantic-release or by hand);
- publishing uses npm Trusted Publishing (OIDC) from `.github/workflows/release.yml`, so don't rename that file.

## License

MIT
