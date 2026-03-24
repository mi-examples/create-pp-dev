import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      target: 'node24',
      minify: true,
    },
  },
  alias: {
    // we can always use non-transpiled code since we support node 24+
    prompts: 'prompts/lib/index.js',
  },
  hooks: {},
});
