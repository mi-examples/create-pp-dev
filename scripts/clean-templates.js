// Runs as `prepack`, before every `npm pack` / `npm publish`. It is the only thing keeping a
// template's node_modules and package-lock.json out of the published package: `files` in
// package.json whitelists `template-*/**`, and a root .npmignore cannot exclude anything below a
// whitelisted directory. Both appear whenever a template was installed in place for a manual test.
import { readdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const templates = readdirSync(rootDir).filter((f) => f.startsWith('template-'));

for (const template of templates) {
  const nodeModules = join(rootDir, template, 'node_modules');
  const lockFile = join(rootDir, template, 'package-lock.json');

  if (existsSync(nodeModules)) {
    rmSync(nodeModules, { recursive: true });
    console.log(`Removed ${template}/node_modules`);
  }

  if (existsSync(lockFile)) {
    rmSync(lockFile);
    console.log(`Removed ${template}/package-lock.json`);
  }
}
