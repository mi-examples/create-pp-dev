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
