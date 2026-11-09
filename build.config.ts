import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  rollup: {
    esbuild: {
      target: 'node24',
      minify: true,
    },
  },
});
