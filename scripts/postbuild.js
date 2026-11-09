// Runs after `npm run build` (unbuild): packs the package and keeps a copy of the tarball as
// <name>-latest.tgz, so a fixed file name can be installed from (npm i ../metricinsights-create-pp-dev-latest.tgz).
// Tarballs of earlier builds are removed first, so the repository root holds the current version only.
import { copyFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { npmCommand } from './npm-cli.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
// @metricinsights/create-pp-dev -> metricinsights-create-pp-dev, as npm pack names the tarball
const packName = pkg.name.replace(/^@/, '').replace(/\//g, '-');

for (const file of readdirSync(rootDir)) {
  if (file.startsWith(`${packName}-`) && file.endsWith('.tgz')) {
    rmSync(join(rootDir, file));
    console.log(`Removed ${file}`);
  }
}

// prepack (clean-templates.js) prints to stdout, where `npm pack --json` prints its result too, so
// run the cleanup here and pack with the scripts off; `npm publish` in CI still runs prepack.
execFileSync(process.execPath, [join(__dirname, 'clean-templates.js')], { cwd: rootDir, stdio: 'inherit' });

const pack = npmCommand(['pack', '--json', '--ignore-scripts']);
const output = execFileSync(pack.command, pack.args, {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  shell: pack.shell,
});

const [packed] = JSON.parse(output);
const latestName = `${packName}-latest.tgz`;

copyFileSync(join(rootDir, packed.filename), join(rootDir, latestName));
console.log(`Packed ${packed.filename} (${packed.entryCount} files, ${packed.size} B) -> ${latestName}`);
