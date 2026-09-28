# Changelog

## [1.1.5](https://github.com/mi-examples/create-pp-dev/compare/v1.1.4...v1.1.5) (2026-09-23)

### Bug Fixes

* **templates:** make fresh projects lint, type-check and build ([8d14c7a](https://github.com/mi-examples/create-pp-dev/commit/8d14c7aa4ff8a4d0cdf30494e46eee80f0b0f841))
* **cli:** show install/rules/components prompts again ([0c34a73](https://github.com/mi-examples/create-pp-dev/commit/0c34a7325357971b691b8d9a001bfd83c8eaebba))
* **deps:** drop stale overrides and postinstall patch ([d93f73e](https://github.com/mi-examples/create-pp-dev/commit/d93f73ee0895aabc2a877c50f11a94dd348679ba))

## [1.1.4](https://github.com/mi-examples/create-pp-dev/compare/v1.1.3...v1.1.4) (2026-09-11)

### Bug Fixes

* **deps:** resolve Dependabot vulnerability alerts ([cf74af3](https://github.com/mi-examples/create-pp-dev/commit/cf74af364da3805cb1dbcfb88c5f00011dba0df0))

### Changes

* Add MIT license ([a305203](https://github.com/mi-examples/create-pp-dev/commit/a3052035ccfe0ee97a225113fb53093939c396f6))

## [1.1.3](https://github.com/mi-examples/create-pp-dev/compare/v1.1.2...v1.1.3) (2026-08-12)

### Bug Fixes

* **deps:** sync @metricinsights/pp-dev version across all templates ([f1a67f5](https://github.com/mi-examples/create-pp-dev/commit/f1a67f5c16ff80ea1b56ddb82e9da22b1ce69eb1))
* **deps:** resolve nanoid/postcss audit findings and apply pending Dependabot bumps ([619c01c](https://github.com/mi-examples/create-pp-dev/commit/619c01cd64c1d92ac9a1d3f053892600b8e880a6))

## [1.1.2](https://github.com/mi-examples/create-pp-dev/compare/v1.1.1...v1.1.2) (2026-08-03)

### Dependencies

* bump next 16.2.12 and refresh lockfile to latest in-range versions ([94a44c2](https://github.com/mi-examples/create-pp-dev/commit/94a44c2c5f84fe0f124067a80b0bade0ccd0be38))

## [1.1.1](https://github.com/mi-examples/create-pp-dev/compare/v1.1.0...v1.1.1) (2026-08-03)

### Bug Fixes

* **deps:** patch npm audit findings and fix pp-dev bump workflow auth ([82330cf](https://github.com/mi-examples/create-pp-dev/commit/82330cff1b0e3a4ac067403874c3a6f96be9151c))

## [1.1.0](https://github.com/mi-examples/create-pp-dev/compare/v1.0.0...v1.1.0) (2026-07-21)

### Bug Fixes

* **deps:** upgrade to pp-dev 1.1.0 and patch axios/body-parser/brace-expansion advisories ([825fe68](https://github.com/mi-examples/create-pp-dev/commit/825fe68502db6b959c461ddab1334fa703aec47e))

## [1.0.0](https://github.com/mi-examples/create-pp-dev/compare/v0.7.7...v1.0.0) (2026-07-13)

### ⚠ BREAKING CHANGES

* **templates:** Templates now target @metricinsights/pp-dev >=1.0.0-beta.2 and its grouped pp-dev.config schema (defineConfig({ mi, app,... })), replacing the old flat backendBaseURL/portalPageId/miHudLess/v7Features options. engines.node is raised to >=24.0.0 across the CLI and all templates. Projects scaffolded from older create-pp-dev versions must migrate their pp-dev.config before upgrading pp-dev past 1.0.

### Features

* **templates:** require pp-dev 1.0 config schema and Node 24+ ([fd71ec6](https://github.com/mi-examples/create-pp-dev/commit/fd71ec6503ccc4904fe3f1488092ef8b207ba06d))
* **nextjs:** add ESM template variant ([ddee870](https://github.com/mi-examples/create-pp-dev/commit/ddee870411e91fcaa464894c8aabf8ae69ab0b03))
* **templates:** migrate pp-dev config to grouped schema, pin to 1.0.0-beta.2 ([675833c](https://github.com/mi-examples/create-pp-dev/commit/675833ca6f586ace2f495416e181a8e02dab6efd))

### Bug Fixes

* **deps:** upgrade to pp-dev 1.0.0 stable and patch undici advisories ([3058024](https://github.com/mi-examples/create-pp-dev/commit/3058024b660f3f9a1d7a6685a4d437ed0b926435))

## [0.7.7](https://github.com/mi-examples/create-pp-dev/compare/v0.7.6...v0.7.7) (2026-06-08)

### Dependencies

* update @metricinsights/pp-dev to ^0.18.3 ([8417c7c](https://github.com/mi-examples/create-pp-dev/commit/8417c7c4fca6670ab81e64868c2cb9ec0fd54862))
* fix audit vulnerabilities and consolidate dependency bumps ([92d7759](https://github.com/mi-examples/create-pp-dev/commit/92d7759dcf452e4016c26432a9341b6ead0b9142))

## [0.7.6](https://github.com/mi-examples/create-pp-dev/compare/v0.7.5...v0.7.6) (2026-05-07)

### Bug Fixes

* **deps:** refresh lockfile bundled audit patches ([0593425](https://github.com/mi-examples/create-pp-dev/commit/05934252f82f943d3e2c47566b9e90a0ee9f8e82))
* **deps:** patch audit issues in root tooling ([44f0cdd](https://github.com/mi-examples/create-pp-dev/commit/44f0cdd1dea4d6e6d579184c376d780118a9ff71))

## [0.7.5](https://github.com/mi-examples/create-pp-dev/compare/v0.7.4...v0.7.5) (2026-04-22)

### Bug Fixes

* **deps:** patch audited transitive vulnerabilities ([7a433c6](https://github.com/mi-examples/create-pp-dev/commit/7a433c68d63d19409751fabcfaf5d6e5e8067eea))

## [0.7.4](https://github.com/mi-examples/create-pp-dev/compare/v0.7.3...v0.7.4) (2026-04-10)

### Bug Fixes

* **deps:** resolve npm audit vulnerabilities ([3253fba](https://github.com/mi-examples/create-pp-dev/commit/3253fba789c1dba27d8decbbf99d81d10766a723))

## [0.7.3](https://github.com/mi-examples/create-pp-dev/compare/v0.7.2...v0.7.3) (2026-04-06)

No notable changes.

## [0.7.2](https://github.com/mi-examples/create-pp-dev/compare/v0.7.1...v0.7.2) (2026-03-26)

### Bug Fixes

* align ESLint 9 in templates and harden Playwright npm helpers ([8e7c577](https://github.com/mi-examples/create-pp-dev/commit/8e7c57766e64ae4d35263c802cf22847fd359537))

## [0.7.1](https://github.com/mi-examples/create-pp-dev/compare/v0.7.0...v0.7.1) (2026-03-25)

### Bug Fixes

* remove postinstall for reliable npm create ([3899699](https://github.com/mi-examples/create-pp-dev/commit/389969959823e56b33c8cd7df94ea0c6a75ce0a9))

## [0.7.0](https://github.com/mi-examples/create-pp-dev/compare/v0.6.1...v0.7.0) (2026-03-24)

### Features

* support non-interactive CLI options and fix path handling ([d542fb6](https://github.com/mi-examples/create-pp-dev/commit/d542fb6e9b43c7084f783673224300d1bc08585b))

## [0.6.1](https://github.com/mi-examples/create-pp-dev/compare/v0.6.0...v0.6.1) (2026-03-12)

No notable changes.

## [0.6.0](https://github.com/mi-examples/create-pp-dev/compare/v0.5.7...v0.6.0) (2026-02-23)

### Features

* **cursor:** add Create PR and Create release rules ([029973e](https://github.com/mi-examples/create-pp-dev/commit/029973ecafc48e0793a8cee1eeef64f0bf8785f0))

### Bug Fixes

* resolve TypeScript errors and runtime bugs in create-pp-dev ([b994e40](https://github.com/mi-examples/create-pp-dev/commit/b994e405f9b893fa26f196c23bf8510808b8e4b6))
* **deps:** add minimatch override and upgrade packages for security ([ee27478](https://github.com/mi-examples/create-pp-dev/commit/ee27478e75f2a260eaed93a46cdcb98ed67d56d4))

## [0.5.7](https://github.com/mi-examples/create-pp-dev/compare/v0.5.6...v0.5.7) (2026-02-12)

### Dependencies

* update @metricinsights/pp-dev to 0.13.1 ([51a2253](https://github.com/mi-examples/create-pp-dev/commit/51a225383da654ddef3439217b5abe84ccf0d85a))

## [0.5.6](https://github.com/mi-examples/create-pp-dev/compare/v0.5.5...v0.5.6) (2026-02-11)

### Dependencies

* update @metricinsights/pp-dev to 0.13.0 ([7e37299](https://github.com/mi-examples/create-pp-dev/commit/7e372991d875390355751c14de87ceccc691b013))

## [0.5.5](https://github.com/mi-examples/create-pp-dev/compare/v0.5.4...v0.5.5) (2025-12-23)

### Bug Fixes

* **cli:** hide install command in next steps when packages already installed ([2e6d56b](https://github.com/mi-examples/create-pp-dev/commit/2e6d56b7444a2f8480f2ea8f06864c9c2ec6a1b2))
* **config:** remove BOM from.releaserc.json ([8eb8898](https://github.com/mi-examples/create-pp-dev/commit/8eb8898706a30e93e1eb90f176e2611dedc3702b))
* **config:** update tagFormat to v\ and enable npm publish ([290454b](https://github.com/mi-examples/create-pp-dev/commit/290454be82b14fa2ada65112c07aed1cd5512708))

## [0.5.4](https://github.com/mi-examples/create-pp-dev/compare/v0.5.3...v0.5.4) (2025-12-19)

No notable changes.

## [0.5.3](https://github.com/mi-examples/create-pp-dev/compare/v0.4.2...v0.5.3) (2025-09-10)

### Features

* **pp-dev:** add dependency version synchronization for create-pp-dev releases ([b722d1a](https://github.com/mi-examples/create-pp-dev/commit/b722d1abaa27ff2c747ddd6bbd9163471ea1e0d4))
* **create-pp-dev:** add semantic release configuration ([2d8b894](https://github.com/mi-examples/create-pp-dev/commit/2d8b8947ca47e7bf6f0498d9abdfae4999f24cf0))

### Bug Fixes

* **create-pp-dev:** resolve security vulnerabilities in dependencies ([be8258c](https://github.com/mi-examples/create-pp-dev/commit/be8258cfc6a291b747e4fbd0e57d7be29de0dab0))
* remove issue number references from semantic-release configs ([898b98c](https://github.com/mi-examples/create-pp-dev/commit/898b98cb9892a0ed752d66d2c05953306ca237b6))

### Changes

* Update dependencies and improve package configurations ([5feea06](https://github.com/mi-examples/create-pp-dev/commit/5feea0679d8db303540d800fc8c2eca336afa271))
* Update build configuration and dependencies for create-pp-dev ([aa99e84](https://github.com/mi-examples/create-pp-dev/commit/aa99e84a12bd548caeca4c90c2716c628613b9b1))

## [0.4.2](https://github.com/mi-examples/create-pp-dev/compare/v0.4.1...v0.4.2) (2024-02-12)

### Changes

* Fixed styles and updated templates README.md files ([be31726](https://github.com/mi-examples/create-pp-dev/commit/be317269c3af670da29df2600a4a8d1a719fea01))

## [0.4.1](https://github.com/mi-examples/create-pp-dev/compare/v0.4.0...v0.4.1) (2024-02-06)

### Changes

* Fixed typo in README.md and make changes for npm pack ([a8d89f6](https://github.com/mi-examples/create-pp-dev/commit/a8d89f66c3912b8b32fcd86b5ce6cf8e68b4bea9))

## 0.4.0 (2024-01-30)

### Changes

* Updated page templates code ([69c4ad7](https://github.com/mi-examples/create-pp-dev/commit/69c4ad77bf3fa2834b0e8da49fbfeed52ecf4685))
* Added base templates for JS, TS, and Next.js ([819e6d5](https://github.com/mi-examples/create-pp-dev/commit/819e6d552700d0ef70cd882f0ea5b14597a997e7))
* Created template for React.js ([62abf1b](https://github.com/mi-examples/create-pp-dev/commit/62abf1be1111f3ebc901bc9fa85c4a5f001d4cc3))
