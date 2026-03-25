import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

/**
 * When tests run via `npm test`, npm sets `npm_execpath` to npm-cli.js. IDE / `npx playwright`
 * does not — fall back to `npm` on PATH (needs shell on Windows for npm.cmd).
 */
function runNpmSync(args, options) {
  const npmExec = process.env.npm_execpath;

  if (npmExec) {
    return spawnSync(process.execPath, [npmExec, ...args], options);
  }

  return spawnSync('npm', args, { shell: process.platform === 'win32', ...options });
}

function runNpm(args, options) {
  const npmExec = process.env.npm_execpath;

  if (npmExec) {
    return spawn(process.execPath, [npmExec, ...args], options);
  }

  return spawn('npm', args, { shell: process.platform === 'win32', ...options });
}

const templates = [
  { name: 'vanilla', checkFile: 'src/main.js' },
  { name: 'vanilla-ts', checkFile: 'src/main.ts' },
  { name: 'react', checkFile: 'src/main.tsx' },
  { name: 'nextjs', checkFile: 'src/pages/index.tsx' },
];

function scaffoldProject({ targetDir, template, packageName, install, cursorRules, ppComponents }) {
  const args = ['dist/index.mjs', targetDir, '--template', template, '--package-name', packageName];

  args.push(install ? '--install' : '--no-install');
  args.push(cursorRules ? '--cursor-rules' : '--no-cursor-rules');
  args.push(ppComponents ? '--pp-components' : '--no-pp-components');

  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

/**
 * Same CLI entry as `npm create @metricinsights/pp-dev` (npm wires create-* to this package).
 * Uses `npm exec --package=file:…` because `npm create …@file:` is not supported for scoped
 * initializers on some npm versions.
 */
function runNpmCreateFromLocalPackage({ targetDir, template, packageName, install, cursorRules, ppComponents }) {
  const pkgUrl = pathToFileURL(repoRoot).href;
  const args = [
    'exec',
    '--yes',
    `--package=${pkgUrl}`,
    '--',
    'create-pp-dev',
    targetDir,
    '--template',
    template,
    '--package-name',
    packageName,
    install ? '--install' : '--no-install',
    cursorRules ? '--cursor-rules' : '--no-cursor-rules',
    ppComponents ? '--pp-components' : '--no-pp-components',
  ];

  return runNpmSync(args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function waitForDevServerReady(child, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const done = (error) => {
      clearTimeout(timer);
      child.stdout?.off('data', onStdout);
      child.stderr?.off('data', onStderr);
      child.off('exit', onExit);

      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    };

    const onStdout = (chunk) => {
      stdout += chunk.toString();

      if (/local:|localhost|http:\/\/|https:\/\//i.test(stdout)) {
        done();
      }
    };

    const onStderr = (chunk) => {
      stderr += chunk.toString();
    };

    const onExit = (code) => {
      done(new Error(`dev server exited early with code ${code}\nstdout:${stdout}\nstderr:${stderr}`));
    };

    child.stdout?.on('data', onStdout);
    child.stderr?.on('data', onStderr);
    child.on('exit', onExit);

    const timer = setTimeout(() => {
      done(new Error(`timed out waiting for dev server\nstdout:${stdout}\nstderr:${stderr}`));
    }, timeoutMs);
  });
}

function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' });

    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // no-op
  }
}

for (const template of templates) {
  test(`scaffolds ${template.name} project in non-interactive mode`, async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-pp-dev-e2e-'));
    const packageName = `sample-${template.name}`;
    const targetDir = path.join(tmpRoot, packageName);

    const run = scaffoldProject({
      targetDir,
      template: template.name,
      packageName,
      install: false,
      cursorRules: false,
      ppComponents: false,
    });

    try {
      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

      const packageJsonPath = path.join(targetDir, 'package.json');
      const templateSpecificFile = path.join(targetDir, template.checkFile);

      expect(fs.existsSync(packageJsonPath)).toBeTruthy();
      expect(fs.existsSync(templateSpecificFile)).toBeTruthy();
      expect(fs.existsSync(path.join(targetDir, '.cursor'))).toBeFalsy();

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.name).toBe(packageName);
      expect(packageJson.dependencies?.['@metricinsights/pp-components']).toBeUndefined();
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
}

for (const template of templates) {
  test(`npm create (npm exec) + npm install for ${template.name} template`, async () => {
    test.setTimeout(300_000);

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-pp-dev-npm-flow-'));
    const packageName = `npm-flow-${template.name}`;
    const targetDir = path.join(tmpRoot, packageName);

    const run = runNpmCreateFromLocalPackage({
      targetDir,
      template: template.name,
      packageName,
      install: false,
      cursorRules: false,
      ppComponents: false,
    });

    try {
      expect(run.status, `create stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

      const templateSpecificFile = path.join(targetDir, template.checkFile);

      expect(fs.existsSync(templateSpecificFile)).toBeTruthy();

      const installRun = runNpmSync(['install', '--no-audit', '--fund=false'], {
        cwd: targetDir,
        encoding: 'utf8',
      });

      expect(installRun.status, `npm install stderr: ${installRun.stderr}\nstdout: ${installRun.stdout}`).toBe(0);
      expect(fs.existsSync(path.join(targetDir, 'node_modules'))).toBeTruthy();
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
}

const optionCombinations = [true, false].flatMap((install) =>
  [true, false].flatMap((cursorRules) => [true, false].map((ppComponents) => ({ install, cursorRules, ppComponents }))),
);

for (const options of optionCombinations) {
  const testTitle = [
    'scaffolds vanilla with options',
    `install=${options.install},`,
    `cursorRules=${options.cursorRules},`,
    `ppComponents=${options.ppComponents}`,
  ].join(' ');

  test(testTitle, async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-pp-dev-options-'));
    const packageName =
      `sample-options-${options.install ? 'i1' : 'i0'}-` +
      `${options.cursorRules ? 'c1' : 'c0'}-` +
      `${options.ppComponents ? 'p1' : 'p0'}`;
    const targetDir = path.join(tmpRoot, packageName);

    const run = scaffoldProject({
      targetDir,
      template: 'vanilla',
      packageName,
      ...options,
    });

    try {
      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

      const packageJsonPath = path.join(targetDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.name).toBe(packageName);
      expect(fs.existsSync(path.join(targetDir, '.cursor'))).toBe(options.cursorRules);
      expect(Boolean(packageJson.dependencies?.['@metricinsights/pp-components'])).toBe(options.ppComponents);
      expect(fs.existsSync(path.join(targetDir, 'node_modules'))).toBe(options.install);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
}

test('runs dev server for scaffolded vanilla project', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-pp-dev-devserver-'));
  const packageName = 'sample-vanilla-server';
  const targetDir = path.join(tmpRoot, packageName);

  const scaffold = scaffoldProject({
    targetDir,
    template: 'vanilla',
    packageName,
    install: false,
    cursorRules: false,
    ppComponents: false,
  });

  expect(scaffold.status, `stderr: ${scaffold.stderr}\nstdout: ${scaffold.stdout}`).toBe(0);

  const install = runNpmSync(['install', '--no-audit', '--fund=false'], {
    cwd: targetDir,
    encoding: 'utf8',
  });

  expect(install.error, `install spawn error: ${install.error?.message ?? 'none'}`).toBeUndefined();
  expect(install.status, `stderr: ${install.stderr}\nstdout: ${install.stdout}`).toBe(0);

  const devServer = runNpm(['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: targetDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForDevServerReady(devServer);
  } finally {
    stopProcessTree(devServer.pid);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
