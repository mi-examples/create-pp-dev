/**
 * @semantic-release/npm depends on the `npm` package, which vendors older
 * brace-expansion / picomatch than npm audit allows. Overrides cannot replace
 * bundleDependencies; copy patched versions from hoisted node_modules after install.
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npmRoot = join(root, 'node_modules/npm');

if (!existsSync(npmRoot)) {
  process.exit(0);
}

const patches = [
  {
    src: join(root, 'node_modules/brace-expansion'),
    dest: join(npmRoot, 'node_modules/brace-expansion'),
  },
  {
    src: join(root, 'node_modules/picomatch'),
    dest: join(npmRoot, 'node_modules/tinyglobby/node_modules/picomatch'),
  },
];

for (const { src, dest } of patches) {
  if (!existsSync(src) || !existsSync(dest)) {
    continue;
  }

  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
}
