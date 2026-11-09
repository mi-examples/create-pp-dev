# Contributing to create-pp-dev

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. The commit messages decide the version of the next release and become its changelog.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

- imperative mood ("add", not "added"), lower-case start, no period at the end;
- the body says what and why, not how;
- a breaking change gets a `!` after the type/scope or a `BREAKING CHANGE:` footer.

### Types

- `feat`: a new feature (a new template, a new CLI flag)
- `fix`: a bug fix; also a dependency bump in a template or in the CLI's runtime dependencies, since that ships to every new project
- `docs`: documentation only
- `style`: formatting, no change in meaning
- `refactor`: a code change that neither fixes a bug nor adds a feature
- `perf`: a performance improvement
- `test`: adding or correcting tests
- `chore`: tooling, development dependencies, repository upkeep
- `ci`: the GitHub workflows and Dependabot configuration

### Scopes

- `cli` — `src/index.ts`
- `templates` — a change across templates; `react`, `nextjs`, `vanilla`, `vanilla-ts` for one of them
- `deps` — dependency updates
- `rules` — `mi-cursor-rules/`
- `test`, `docs`, `release`

### Examples

```
fix(cli): report a failed npm install and exit 1
fix(deps): bump @metricinsights/pp-dev to ^1.5.0 in the templates
feat(templates): add a Vue template
docs(readme): document the non-interactive flags
test: cover the CLI error paths
```

## Release Process

Releases use the shared workflows from [mi-examples-workflows](https://github.com/mi-examples/mi-examples-workflows) ([release flow](https://github.com/mi-examples/mi-examples-workflows/blob/main/docs/workflows.md#release-workflows)). The caller is [`.github/workflows/release.yml`](.github/workflows/release.yml).

- **Betas.** Every push to `develop` with releasable commits publishes `X.Y.Z-beta.N` to npm under the `beta` dist-tag, with a GitHub prerelease. Try one with `npm create @metricinsights/pp-dev@beta`.
- **Production releases.**
  1. Run **Actions → Release → Run workflow**. It opens a release pull request `release/vX.Y.Z → main` with the version bump and the new `CHANGELOG.md` entry.
  2. Review and edit the entry in the pull request, then merge it (merge commit, not squash).
  3. Merging publishes to npm under `latest` and creates the tag and the GitHub release. It also opens the back-merge pull request into `develop`.
- **Versions** come from the commit messages (see above):
  - `feat` → minor;
  - `fix`, `perf` and `revert` → patch;
  - `!` or a `BREAKING CHANGE:` footer → major;
  - other types don't release.
- **Tags and `CHANGELOG.md`** are written by the workflow. Don't create tags by hand and don't edit the changelog outside a release pull request.
- **Publishing** uses npm Trusted Publishing (OIDC) from `release.yml` in the `npm-publish` environment. No npm token is needed or stored. Don't rename `release.yml`: the trusted publisher is registered for that filename.
- **`main` ahead of `develop`.** After a production release the back-merge pull request `main → develop` opens automatically. Until it is merged, the "Main ahead check" fails pull requests into `develop` and re-runs them once `develop` contains `main` again.
- **CI and release callers** are generated from `.github/mi-examples-workflows.json`. To change a CI setting, edit that file and run `npx github:mi-examples/mi-examples-workflows`; don't edit the callers by hand.

## Pull Requests

- Branch from `develop`; pull requests go into `develop`. Only release pull requests go into `main`.
- The PR description follows `.cursor/rules/pr-message-format.mdc` (summary, key changes, testing, included commits).
- Copilot review is requested automatically by the organisation's ruleset.
- Dependency updates to the templates ship in every new project: a template bump is a `fix(deps)` and should be released soon after it is merged.
