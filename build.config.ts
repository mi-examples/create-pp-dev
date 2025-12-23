import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      target: 'node22',
      minify: true,
    },
  },
  alias: {
    // we can always use non-transpiled code since we support node 22+
    prompts: 'prompts/lib/index.js',
  },
  hooks: {},
});
