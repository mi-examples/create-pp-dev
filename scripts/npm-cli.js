// How to start npm from a script, so the build scripts do not spawn `npm` through a shell.
//
// Under an npm script, npm_execpath points at npm-cli.js; run that with the current node so the
// same npm is used. Under yarn or pnpm it points at their CLI, whose commands take other options
// and print another shape, so then (and outside any package manager) use the npm that ships with
// the running node, or npm from PATH as the last resort (which needs a shell on Windows, npm.cmd).
import { existsSync } from 'fs';
import { dirname, join } from 'path';

function findNpmCli() {
  const fromEnv = process.env.npm_execpath;

  if (fromEnv && /npm-cli\.js$/.test(fromEnv)) {
    return fromEnv;
  }

  const nodeDir = dirname(process.execPath);
  const candidates = [
    join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Windows installs, nvm-windows
    join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Linux, macOS, nvm
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * The command, leading arguments and `shell` option that start npm; `args` are appended.
 * Usage: `const { command, args, shell } = npmCommand(['pack', '--json']);`
 */
export function npmCommand(args) {
  const npmCli = findNpmCli();

  if (npmCli) {
    return { command: process.execPath, args: [npmCli, ...args], shell: false };
  }

  return { command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args, shell: process.platform === 'win32' };
}
