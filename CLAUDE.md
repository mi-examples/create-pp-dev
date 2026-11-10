# create-pp-dev — Claude Code Instructions

## What this project is

`@metricinsights/create-pp-dev` is the scaffolder behind `npm create @metricinsights/pp-dev`: a small CLI that copies one of five templates into a new directory, rewrites its `package.json` name and optionally copies the MI Cursor rules, adds `@metricinsights/pp-components` and runs the install. Every template depends on `@metricinsights/pp-dev`, the local development framework for Metric Insights Portal Pages.

## Essential commands

```bash
npm run build          # unbuild src/index.ts -> dist/index.mjs, then pack to <name>-latest.tgz
npm run lint           # eslint (the templates are linted by their own configs, not here)
npm run typecheck      # tsc --noEmit
npm run format:check   # prettier --check (templates, CHANGELOG and docs are ignored)
npm test               # builds, then the Playwright suite: scaffolds and installs the templates (minutes)
npx playwright test --grep @offline   # the quick subset: no network, under half a minute
```

The templates have no lockfiles in the repository (`.gitignore`, `scripts/clean-templates.js`), so a plain `npm audit` covers the package itself only. `npm run audit:all` audits the root and every template (each template is resolved in a temporary directory with `npm install --package-lock-only`); the shared CI runs it on pull requests and weekly. A high or critical advisory without a fix goes into the shared `audit-allowlist.json` in mi-examples-workflows with a reason and an `until` date, never into this repository.

`overrides` in the root and in every template `package.json` pin transitive packages whose fixed version no dependency asks for yet: `minimatch` (GHSA-g3hv-75wg-m249, fixed in 11.0.1; eslint, typescript-eslint and glob still ask for 10.x) and, in the templates, `glob` (GHSA-3g3m-2fjr-6pw4, fixed in 14.0.2; svgicons2svgfont and cacache behind pp-dev ask for 10–13). A scaffolded project carries them. In the templates every pin is written twice, with the same value: `overrides` is what npm reads, `resolutions` is what yarn and pnpm read (each ignores the other field; checked with pnpm 10 and yarn 1.22, which resolve glob 10/11 and minimatch 10 without `resolutions`). Change both together; a test compares them. Dependabot maintains neither, so when a template dependency moves on, remove the entry from both and check that `npm run audit:all` stays clean.

## Layout

```
index.js                 — bin: imports dist/index.mjs
src/index.ts             — the whole CLI: parseArgs, prompts (@clack/prompts), copy, install
scripts/clean-templates.js — prepack: removes template-*/node_modules and lockfiles (see the comment there)
scripts/postbuild.js     — packs the tarball and keeps <name>-latest.tgz
template-nextjs/         — Next.js (CommonJS next.config.js), pp-dev next
template-nextjs-esm/     — Next.js ("type": "module")
template-react/          — React + Vite
template-vanilla/        — Vite, JavaScript
template-vanilla-ts/     — Vite, TypeScript
mi-cursor-rules/         — copied into a new project's .cursor/rules on request
test/scaffold.spec.mjs   — Playwright as a test runner (no browser): runs dist/index.mjs and npm
.github/                 — generated shared-workflow callers; settings in mi-examples-workflows.json
```

Template conventions: `_gitignore` is renamed to `.gitignore` on copy (npm would drop a `.gitignore` from the package); `package.json#name` is replaced with the project name; the pp-dev config ships with `mi.url` and `app.id` commented out.

## Key conventions

- **Every template ships to users.** A change to a template's dependencies or config is a `fix` and should be released soon after merging; keep the five templates on the same `@metricinsights/pp-dev` range and the same ESLint/Prettier rules.
- **The CLI must work without a terminal.** Every prompt has a flag; with stdin not a TTY and no flag, exit 1 with a hint. `--yes` takes the defaults. Validate the flags before touching the disk.
- **Tests run the built CLI.** `pretest` runs unbuild; tests that need the registry are not tagged `@offline`, failures of the registry are simulated with `npm_config_registry=http://127.0.0.1:9`.
- **Line endings.** The checkout uses `core.autocrlf=true` on Windows: files are CRLF in the working tree and LF in git. Scripts that edit files must not assume LF.
- Change only the code the task needs; check what else uses the code you change.

## Commits, PRs, releases

- Commit messages follow Conventional Commits, `<type>(<scope>): <subject>` — types, scopes and the release process are in `CONTRIBUTING.md`. `fix`, `perf` and `revert` release a patch, `feat` a minor.
- PR descriptions follow `.cursor/rules/pr-message-format.mdc` (🚀 features, 🔧 fixes, 🔐 security, 🧪 tests, 🧹 chore). Copilot review is requested automatically.
- Releases use the shared release flow (betas from `develop`, production through `release/vX.Y.Z → main`); tags and `CHANGELOG.md` are written by the workflow. Never create a tag by hand.
