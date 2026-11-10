import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const cliEntry = path.join(repoRoot, 'dist', 'index.mjs');
const packageVersion = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;

/**
 * Tests tagged @offline never reach the network: `npx playwright test --grep @offline` is the quick
 * local run. The others install packages from the registry and take minutes.
 */
const offline = { tag: '@offline' };

/**
 * A registry nobody listens on. The CLI's pp-components lookup and `npm install` fail fast against
 * it, without touching the network, so the failure paths can be tested offline.
 */
const unreachableRegistryEnv = {
  npm_config_registry: 'http://127.0.0.1:9',
  npm_config_fetch_retries: '0',
  npm_config_fetch_retry_mintimeout: '0',
  npm_config_fetch_retry_maxtimeout: '0',
};

/**
 * When tests run via `npm test`, npm sets `npm_execpath` to npm-cli.js. Under yarn or pnpm it is
 * their CLI instead, and IDE / `npx playwright` sets nothing — fall back to `npm` on PATH then
 * (needs shell on Windows for npm.cmd).
 */
const npmExecPath = /npm-cli\.js$/.test(process.env.npm_execpath ?? '') ? process.env.npm_execpath : undefined;

function runNpmSync(args, options) {
  const npmExec = npmExecPath;

  if (npmExec) {
    return spawnSync(process.execPath, [npmExec, ...args], options);
  }

  return spawnSync('npm', args, { shell: process.platform === 'win32', ...options });
}

function runNpm(args, options) {
  const npmExec = npmExecPath;

  if (npmExec) {
    return spawn(process.execPath, [npmExec, ...args], options);
  }

  return spawn('npm', args, { shell: process.platform === 'win32', ...options });
}

/** Entries of a .gitignore without comments, blanks, CR and the leading "/" of rooted patterns. */
function readGitignoreEntries(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.replace(/^\//, ''));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Runs `fn` with a fresh temporary directory and removes it afterwards. */
async function withTmpDir(prefix, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `create-pp-dev-${prefix}-`));

  try {
    return await fn(tmpRoot);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

/** Runs the built CLI. stdin is a pipe, as in CI, so every answer has to come from a flag. */
function runCli(args, { cwd = repoRoot, env = {} } = {}) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function optionFlags({ install, cursorRules, ppComponents }) {
  return [
    install ? '--install' : '--no-install',
    cursorRules ? '--cursor-rules' : '--no-cursor-rules',
    ppComponents ? '--pp-components' : '--no-pp-components',
  ];
}

function scaffoldProject({ targetDir, template, packageName, cwd, env, ...options }) {
  const args = [targetDir, '--template', template, '--package-name', packageName, ...optionFlags(options)];

  return runCli(args, { cwd, env });
}

/**
 * Same CLI entry as `npm create @metricinsights/pp-dev` (npm wires create-* to this package).
 * Uses `npm exec --package=file:…` because `npm create …@file:` is not supported for scoped
 * initializers on some npm versions.
 */
function runNpmCreateFromLocalPackage({ targetDir, template, packageName, ...options }) {
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
    ...optionFlags(options),
  ];

  return runNpmSync(args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

/**
 * A TCP port nothing listens on at this moment. The server is then started with --strictPort, so
 * losing the port to another process in between fails the test instead of passing it by accident.
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();

      server.close(() => resolve(port));
    });
  });
}

/**
 * Resolves once a request to `url` gets a response that `isReady` accepts, rejects when the child
 * exits first or the budget runs out. A response from something else listening on the port keeps
 * the polling going. The server's output is kept for the error message.
 */
function waitForHttp(child, url, isReady, timeoutMs) {
  return new Promise((resolve, reject) => {
    let output = '';
    let lastResponse = 'none';
    let exited = false;
    let finished = false;

    const onOutput = (chunk) => {
      output += chunk.toString();
    };

    const finish = (error) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);
      clearInterval(poll);
      child.stdout?.off('data', onOutput);
      child.stderr?.off('data', onOutput);
      child.off('exit', onExit);

      if (error) {
        reject(error);
      } else {
        resolve(output);
      }
    };

    const onExit = (code) => {
      exited = true;
      finish(new Error(`dev server exited early with code ${code}\noutput:\n${output}`));
    };

    child.stdout?.on('data', onOutput);
    child.stderr?.on('data', onOutput);
    child.on('exit', onExit);

    const poll = setInterval(async () => {
      if (exited || finished) {
        return;
      }

      try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2_000) });

        await response.arrayBuffer();
        lastResponse = `HTTP ${response.status}, location: ${response.headers.get('location') ?? 'none'}`;

        if (isReady(response)) {
          finish();
        }
      } catch {
        // not listening yet
      }
    }, 500);

    const timer = setTimeout(() => {
      finish(
        new Error(
          `timed out waiting for the dev server at ${url} (last response: ${lastResponse})\noutput:\n${output}`,
        ),
      );
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

const templates = [
  { name: 'vanilla', checkFile: 'src/main.js' },
  { name: 'vanilla-ts', checkFile: 'src/main.ts' },
  { name: 'react', checkFile: 'src/main.tsx' },
  { name: 'nextjs', checkFile: 'src/pages/index.tsx' },
  { name: 'nextjs-esm', checkFile: 'src/pages/index.tsx' },
];

const templateNames = templates.map((t) => t.name);

test.describe('usage and version', () => {
  test('--help prints the usage with every flag and template and exits 0', offline, async () => {
    const run = runCli(['--help']);

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain('Usage: create-pp-dev');

    for (const flag of [
      '--template',
      '--package-name',
      '--install',
      '--cursor-rules',
      '--pp-components',
      '--yes',
      '--help',
      '--version',
    ]) {
      expect(run.stdout, `usage lacks ${flag}`).toContain(flag);
    }

    for (const name of templateNames) {
      expect(run.stdout, `usage lacks the ${name} template`).toContain(name);
    }
  });

  test('--version prints the package version and exits 0', offline, async () => {
    const run = runCli(['--version']);

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout.trim()).toBe(packageVersion);
  });

  test('the README documents every flag of --help', offline, async () => {
    const usage = runCli(['--help']).stdout;
    const flags = [...new Set(usage.match(/--[a-z][a-z-]*/g))];
    const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

    expect(flags.length).toBeGreaterThan(5);

    for (const flag of flags) {
      expect(readme, `README.md does not mention ${flag}`).toContain(flag);
    }
  });

  test('an unknown flag exits 1 with a hint and creates nothing', offline, async () => {
    await withTmpDir('unknown-flag', async (tmpRoot) => {
      const run = runCli(['proj', '--template', 'vanilla', '--bogus-flag'], { cwd: tmpRoot });

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('--bogus-flag');
      expect(run.stdout + run.stderr).toContain('--help');
      expect(fs.readdirSync(tmpRoot)).toEqual([]);
    });
  });

  test('without a terminal and without arguments it exits 1 instead of prompting', offline, async () => {
    await withTmpDir('no-tty', async (tmpRoot) => {
      const run = runCli([], { cwd: tmpRoot });

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('--yes');
      expect(fs.readdirSync(tmpRoot)).toEqual([]);
    });
  });
});

test.describe('argument validation happens before anything is written', () => {
  const existingFile = 'keep-me.txt';

  function nonEmptyTarget(tmpRoot) {
    const targetDir = path.join(tmpRoot, 'existing');

    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, existingFile), 'do not delete');

    return targetDir;
  }

  test('an unknown template exits 1 and leaves a non-empty directory untouched', offline, async () => {
    await withTmpDir('bad-template', async (tmpRoot) => {
      const targetDir = nonEmptyTarget(tmpRoot);
      const run = runCli([targetDir, '--template', 'bogus', '--package-name', 'existing', '-y']);

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('Unknown template "bogus"');
      expect(fs.readdirSync(targetDir)).toEqual([existingFile]);
    });
  });

  test('an invalid --package-name exits 1 and leaves a non-empty directory untouched', offline, async () => {
    await withTmpDir('bad-name', async (tmpRoot) => {
      const targetDir = nonEmptyTarget(tmpRoot);
      const run = runCli([targetDir, '--template', 'vanilla', '--package-name', 'Bad Name', '-y']);

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('Invalid package.json name');
      expect(fs.readdirSync(targetDir)).toEqual([existingFile]);
    });
  });

  test('--yes without --template exits 1 and names the flag', offline, async () => {
    await withTmpDir('yes-no-template', async (tmpRoot) => {
      const run = runCli(['proj', '-y', '--no-install'], { cwd: tmpRoot });

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('--template');
      expect(fs.readdirSync(tmpRoot)).toEqual([]);
    });
  });

  test('a non-empty directory without a terminal exits 1 and keeps its files', offline, async () => {
    await withTmpDir('non-empty-no-tty', async (tmpRoot) => {
      const targetDir = nonEmptyTarget(tmpRoot);
      const run = runCli([
        targetDir,
        '--template',
        'vanilla',
        '--package-name',
        'existing',
        '--no-install',
        '--no-cursor-rules',
        '--no-pp-components',
      ]);

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain(`"${targetDir}" is not empty`);
      expect(run.stdout + run.stderr).toContain('--yes');
      expect(fs.readdirSync(targetDir)).toEqual([existingFile]);
    });
  });

  test('without a terminal every missing flag is named before anything is written', offline, async () => {
    await withTmpDir('missing-flags', async (tmpRoot) => {
      const run = runCli(['proj', '--template', 'vanilla', '--package-name', 'proj', '--no-install'], { cwd: tmpRoot });

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('--cursor-rules');
      expect(run.stdout + run.stderr).toContain('--pp-components');
      expect(fs.readdirSync(tmpRoot)).toEqual([]);
    });
  });

  test('--yes refuses a directory where the template would overwrite a file', offline, async () => {
    await withTmpDir('yes-collision', async (tmpRoot) => {
      const targetDir = nonEmptyTarget(tmpRoot);

      fs.writeFileSync(path.join(targetDir, 'package.json'), '{}');

      const run = runCli([targetDir, '--template', 'vanilla', '-y', '--no-install']);

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('package.json');
      expect(fs.readdirSync(targetDir).sort()).toEqual([existingFile, 'package.json']);
      expect(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8')).toBe('{}');
    });
  });

  test('--yes --cursor-rules refuses a directory with a Cursor rule it would overwrite', offline, async () => {
    await withTmpDir('yes-rule-collision', async (tmpRoot) => {
      const targetDir = nonEmptyTarget(tmpRoot);
      const ruleFile = path.join(targetDir, '.cursor', 'rules', 'mi-custom-apps-dev.mdc');

      fs.mkdirSync(path.dirname(ruleFile), { recursive: true });
      fs.writeFileSync(ruleFile, 'customized');

      const run = runCli([targetDir, '--template', 'vanilla', '-y', '--cursor-rules', '--no-install']);

      expect(run.status).toBe(1);
      expect(run.stdout + run.stderr).toContain('.cursor/rules/mi-custom-apps-dev.mdc');
      expect(fs.readdirSync(targetDir).sort()).toEqual(['.cursor', existingFile]);
      expect(fs.readFileSync(ruleFile, 'utf8')).toBe('customized');
    });
  });

  test('a filesystem root as target keeps its trailing separator', offline, async () => {
    // "C:\\" stripped to "C:" would be a drive-relative path and resolve to the current directory
    const root = path.parse(os.tmpdir()).root;
    const run = runCli([
      root,
      '--template',
      'vanilla',
      '--package-name',
      'root',
      '--no-install',
      '--no-cursor-rules',
      '--no-pp-components',
    ]);

    expect(run.status).toBe(1);
    expect(run.stdout + run.stderr).toContain(`"${root}" is not empty`);
  });

  test('a trailing path separator on the target is stripped', offline, async () => {
    await withTmpDir('trailing-sep', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'sub');
      const run = scaffoldProject({
        targetDir: targetDir + path.sep,
        template: 'vanilla',
        packageName: 'sub',
        install: false,
        cursorRules: false,
        ppComponents: false,
      });

      expect(
        run.status,
        `stderr: ${run.stderr}
stdout: ${run.stdout}`,
      ).toBe(0);
      expect(readJson(path.join(targetDir, 'package.json')).name).toBe('sub');
      expect(run.stdout).toContain(`cd ${path.relative(repoRoot, targetDir)}`);
    });
  });
});

test.describe('scaffolding', () => {
  for (const template of templates) {
    test(`scaffolds ${template.name} project in non-interactive mode`, offline, async () => {
      await withTmpDir('e2e', async (tmpRoot) => {
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

        expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

        const packageJsonPath = path.join(targetDir, 'package.json');
        const templateSpecificFile = path.join(targetDir, template.checkFile);

        expect(fs.existsSync(packageJsonPath)).toBeTruthy();
        expect(fs.existsSync(templateSpecificFile)).toBeTruthy();
        expect(fs.existsSync(path.join(targetDir, '.cursor'))).toBeFalsy();

        const packageJson = readJson(packageJsonPath);

        expect(packageJson.name).toBe(packageName);
        expect(packageJson.dependencies?.['@metricinsights/pp-components']).toBeUndefined();

        // _gitignore is renamed on copy; the result must keep the pp-dev token file (.env, read by
        // pp-dev through Vite's loadEnv) and pp-dev's build output and MI backups out of git.
        expect(fs.existsSync(path.join(targetDir, '_gitignore'))).toBeFalsy();

        const gitignoreEntries = readGitignoreEntries(path.join(targetDir, '.gitignore'));

        for (const entry of ['.env', '.env.*', 'dist', 'dist-zip', 'backups']) {
          expect(gitignoreEntries, `.gitignore of ${template.name} lacks "${entry}"`).toContain(entry);
        }
      });
    });
  }

  test('scaffolds into the current directory with "." and names it after the directory', offline, async () => {
    await withTmpDir('dot', async (tmpRoot) => {
      const projectDir = path.join(tmpRoot, 'my-portal-page');

      fs.mkdirSync(projectDir);

      const run = runCli(['.', '--template', 'vanilla-ts', '-y', '--no-install'], { cwd: projectDir });

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);
      expect(fs.existsSync(path.join(projectDir, 'src/main.ts'))).toBeTruthy();
      expect(readJson(path.join(projectDir, 'package.json')).name).toBe('my-portal-page');
      // no `cd` into a directory the user is already in
      expect(run.stdout).not.toMatch(/^\s+cd /m);
    });
  });

  test('keeps a scoped --package-name as given', offline, async () => {
    await withTmpDir('scoped', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'scoped');
      const run = scaffoldProject({
        targetDir,
        template: 'vanilla',
        packageName: '@my-org/portal-page',
        install: false,
        cursorRules: false,
        ppComponents: false,
      });

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);
      expect(readJson(path.join(targetDir, 'package.json')).name).toBe('@my-org/portal-page');
    });
  });

  test('--yes keeps the files of a non-empty directory and takes the defaults', offline, async () => {
    await withTmpDir('yes-defaults', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'existing');

      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'notes.md'), 'kept');

      // --no-install: the default of --yes is to install, which needs the registry
      const run = runCli([targetDir, '--template', 'react', '-y', '--no-install']);

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);
      expect(fs.readFileSync(path.join(targetDir, 'notes.md'), 'utf8')).toBe('kept');
      expect(fs.existsSync(path.join(targetDir, 'src/main.tsx'))).toBeTruthy();

      const packageJson = readJson(path.join(targetDir, 'package.json'));

      expect(packageJson.name).toBe('existing');
      expect(packageJson.dependencies?.['@metricinsights/pp-components']).toBeUndefined();
      expect(fs.existsSync(path.join(targetDir, '.cursor'))).toBeFalsy();
      expect(fs.existsSync(path.join(targetDir, 'node_modules'))).toBeFalsy();
    });
  });

  const optionCombinations = [true, false].flatMap((cursorRules) =>
    [true, false].map((ppComponents) => ({ cursorRules, ppComponents })),
  );

  for (const options of optionCombinations) {
    const testTitle =
      `scaffolds vanilla with options cursorRules=${options.cursorRules}, ` + `ppComponents=${options.ppComponents}`;

    test(testTitle, offline, async () => {
      await withTmpDir('options', async (tmpRoot) => {
        const packageName = `sample-options-${options.cursorRules ? 'c1' : 'c0'}-${options.ppComponents ? 'p1' : 'p0'}`;
        const targetDir = path.join(tmpRoot, packageName);

        const run = scaffoldProject({
          targetDir,
          template: 'vanilla',
          packageName,
          install: false,
          ...options,
          // pp-components is resolved from the registry; an unreachable one still yields a project
          env: options.ppComponents ? unreachableRegistryEnv : {},
        });

        expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

        const packageJson = readJson(path.join(targetDir, 'package.json'));

        expect(packageJson.name).toBe(packageName);
        expect(fs.existsSync(path.join(targetDir, '.cursor'))).toBe(options.cursorRules);
        expect(Boolean(packageJson.dependencies?.['@metricinsights/pp-components'])).toBe(options.ppComponents);
        expect(fs.existsSync(path.join(targetDir, 'node_modules'))).toBeFalsy();

        if (options.cursorRules) {
          expect(fs.readdirSync(path.join(targetDir, '.cursor/rules')).length).toBeGreaterThan(0);
        }
      });
    });
  }

  test('--pp-components falls back to ^1.0.0 with a warning when the registry is unreachable', offline, async () => {
    await withTmpDir('registry-down', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'offline-components');
      const run = scaffoldProject({
        targetDir,
        template: 'vanilla',
        packageName: 'offline-components',
        install: false,
        cursorRules: false,
        ppComponents: true,
        env: unreachableRegistryEnv,
      });

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);
      expect(readJson(path.join(targetDir, 'package.json')).dependencies['@metricinsights/pp-components']).toBe(
        '^1.0.0',
      );
      expect(run.stdout + run.stderr).toContain('127.0.0.1:9');
      expect(run.stdout).toContain('Project created successfully');
    });
  });

  test('the registry warning does not repeat credentials from the registry URL', offline, async () => {
    await withTmpDir('registry-creds', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'redacted-registry');
      const run = scaffoldProject({
        targetDir,
        template: 'vanilla',
        packageName: 'redacted-registry',
        install: false,
        cursorRules: false,
        ppComponents: true,
        env: { ...unreachableRegistryEnv, npm_config_registry: 'http://user:s3cret-token@127.0.0.1:9' },
      });
      const output = run.stdout + run.stderr;

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);
      expect(output).toContain('http://127.0.0.1:9/@metricinsights/pp-components');
      expect(output).not.toContain('s3cret-token');
      expect(output).not.toContain('user:');
      expect(readJson(path.join(targetDir, 'package.json')).dependencies['@metricinsights/pp-components']).toBe(
        '^1.0.0',
      );
    });
  });
});

test.describe('package installation', () => {
  test('a failing install exits 1, keeps the files and says how to retry', offline, async () => {
    test.setTimeout(120_000);

    await withTmpDir('install-fails', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'install-fails');
      const run = scaffoldProject({
        targetDir,
        template: 'vanilla',
        packageName: 'install-fails',
        install: true,
        cursorRules: false,
        ppComponents: false,
        env: unreachableRegistryEnv,
      });

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(1);
      expect(run.stdout + run.stderr).toContain('"npm install" failed');
      expect(run.stdout + run.stderr).toContain('to retry');
      expect(run.stdout).not.toContain('Project created successfully');
      expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBeTruthy();
      expect(fs.existsSync(path.join(targetDir, 'src/main.js'))).toBeTruthy();
    });
  });

  test('--install installs the packages of a scaffolded vanilla project', async () => {
    test.setTimeout(300_000);

    await withTmpDir('install', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'installed');
      const run = scaffoldProject({
        targetDir,
        template: 'vanilla',
        packageName: 'installed',
        install: true,
        cursorRules: true,
        ppComponents: true,
      });

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);
      expect(fs.existsSync(path.join(targetDir, 'node_modules/@metricinsights/pp-dev/package.json'))).toBeTruthy();
      expect(
        fs.existsSync(path.join(targetDir, 'node_modules/@metricinsights/pp-components/package.json')),
      ).toBeTruthy();
      expect(readJson(path.join(targetDir, 'package.json')).dependencies['@metricinsights/pp-components']).toMatch(
        /^\^[1-9]\d*\./,
      );
      expect(fs.existsSync(path.join(targetDir, '.cursor/rules'))).toBeTruthy();
    });
  });
});

test.describe('template dependency pins', () => {
  const templates = fs
    .readdirSync(repoRoot)
    .filter((name) => name.startsWith('template-'))
    .sort();

  // npm reads `overrides`; yarn and pnpm ignore it and read `resolutions`. A pin in one field only
  // closes an advisory for some package managers and leaves it open for the others.
  for (const template of templates) {
    test(`${template} pins the same versions for npm and for yarn / pnpm`, offline, () => {
      const pkg = readJson(path.join(repoRoot, template, 'package.json'));

      expect(pkg.resolutions ?? {}, 'resolutions (yarn, pnpm) must mirror overrides (npm)').toEqual(
        pkg.overrides ?? {},
      );
    });
  }

  test('a scaffolded project carries both fields', offline, async () => {
    await withTmpDir('pins', async (tmpRoot) => {
      const targetDir = path.join(tmpRoot, 'pinned');
      const run = scaffoldProject({
        targetDir,
        template: 'vanilla',
        packageName: 'pinned',
        install: false,
        cursorRules: false,
        ppComponents: false,
      });

      expect(run.status, `stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

      const template = readJson(path.join(repoRoot, 'template-vanilla', 'package.json'));
      const scaffolded = readJson(path.join(targetDir, 'package.json'));

      expect(scaffolded.overrides).toEqual(template.overrides);
      expect(scaffolded.resolutions).toEqual(template.resolutions);
    });
  });
});

test.describe('audit allowlist', () => {
  const allowlistModule = pathToFileURL(path.join(repoRoot, 'scripts', 'audit-allowlist.js')).href;
  const entry = (fields) => ({
    id: 'GHSA-aaaa-bbbb-cccc',
    reason: 'cannot be reached',
    until: '2030-01-01',
    ...fields,
  });
  const parse = async (entries, today = '2026-11-09') => {
    const { parseAllowlist } = await import(allowlistModule);

    return parseAllowlist(JSON.stringify({ entries }), today);
  };

  test('an entry with a GHSA id, a reason and a future day applies', offline, async () => {
    const { allowlist, warnings } = await parse([entry({})]);

    expect([...allowlist.keys()]).toEqual(['GHSA-aaaa-bbbb-cccc']);
    expect(allowlist.get('GHSA-aaaa-bbbb-cccc')).toBe('cannot be reached (until 2030-01-01)');
    expect(warnings).toEqual([]);
  });

  test('an entry applies through its until day and expires after it', offline, async () => {
    const onTheDay = await parse([entry({ until: '2026-11-09' })]);
    const dayAfter = await parse([entry({ until: '2026-11-08' })]);

    expect(onTheDay.allowlist.size).toBe(1);
    expect(dayAfter.allowlist.size).toBe(0);
    expect(dayAfter.warnings.join('\n')).toContain('expired on 2026-11-08');
  });

  test('an until that is not a real day is rejected, not kept active', offline, async () => {
    // "2026-99-99" passes a format check and sorts after today; it must not suppress anything
    for (const until of ['2026-99-99', '2026-02-30', '2026-1-1', 'tomorrow', 20261231, undefined]) {
      const { allowlist, warnings } = await parse([entry({ until })]);

      expect(allowlist.size, `until=${String(until)}`).toBe(0);
      expect(warnings.join('\n'), `until=${String(until)}`).toContain('invalid audit allowlist entry');
    }
  });

  test('an entry without a GHSA id or without a reason is ignored', offline, async () => {
    const { allowlist, warnings } = await parse([
      entry({ id: 'CVE-2026-0001' }),
      entry({ reason: '   ' }),
      entry({ reason: undefined }),
      entry({ id: 'GHSA-dddd-eeee-ffff' }),
    ]);

    expect([...allowlist.keys()]).toEqual(['GHSA-dddd-eeee-ffff']);
    expect(warnings).toHaveLength(3);
  });

  test('a list without entries allowlists nothing', offline, async () => {
    const { allowlist, warnings } = await parse(undefined);

    expect(allowlist.size).toBe(0);
    expect(warnings).toEqual([]);
  });
});

test.describe('build scripts', () => {
  test('postbuild packs with npm even when another package manager runs the build', offline, async () => {
    test.setTimeout(120_000);

    // yarn and pnpm also set npm_execpath, to their own CLI; postbuild must not hand npm's arguments to it
    const run = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'postbuild.js')], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, npm_execpath: path.join(repoRoot, 'node_modules', 'not-installed', 'yarn.js') },
    });

    expect(
      run.status,
      `stderr: ${run.stderr}
stdout: ${run.stdout}`,
    ).toBe(0);
    expect(run.stdout).toMatch(/Packed metricinsights-create-pp-dev-\d.*-latest\.tgz/);
    expect(fs.existsSync(path.join(repoRoot, 'metricinsights-create-pp-dev-latest.tgz'))).toBeTruthy();
  });
});

test.describe('npm create flow', () => {
  for (const template of templates) {
    test(`npm create (npm exec) + npm install for ${template.name} template`, async () => {
      test.setTimeout(300_000);

      await withTmpDir('npm-flow', async (tmpRoot) => {
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

        expect(run.status, `create stderr: ${run.stderr}\nstdout: ${run.stdout}`).toBe(0);

        const templateSpecificFile = path.join(targetDir, template.checkFile);

        expect(fs.existsSync(templateSpecificFile)).toBeTruthy();

        const installRun = runNpmSync(['install', '--no-audit', '--fund=false'], {
          cwd: targetDir,
          encoding: 'utf8',
        });

        expect(installRun.status, `npm install stderr: ${installRun.stderr}\nstdout: ${installRun.stdout}`).toBe(0);
        expect(fs.existsSync(path.join(targetDir, 'node_modules'))).toBeTruthy();
      });
    });
  }
});

test('runs dev server for scaffolded vanilla project', async () => {
  // scaffold + npm install + server start; the install alone takes minutes on a slow registry
  test.setTimeout(300_000);

  await withTmpDir('devserver', async (tmpRoot) => {
    const packageName = 'sample-vanilla-server';
    const targetDir = path.join(tmpRoot, packageName);
    const port = await freePort();

    const scaffold = scaffoldProject({
      targetDir,
      template: 'vanilla',
      packageName,
      install: false,
      cursorRules: false,
      ppComponents: false,
    });

    expect(scaffold.status, `stderr: ${scaffold.stderr}\nstdout: ${scaffold.stdout}`).toBe(0);

    // pp-dev requires mi.url whenever mi.mode is "embedding" or app.type is "template" — fill in the
    // placeholders the template ships commented out, same as a user would before their first `dev`.
    const configPath = path.join(targetDir, 'pp-dev.config.js');
    const configSource = fs.readFileSync(configPath, 'utf8');
    const placeholders = ["// url: 'https://example.metricinsights.com',", '// id: 1,'];

    for (const placeholder of placeholders) {
      expect(configSource, `the vanilla pp-dev.config.js no longer contains ${placeholder}`).toContain(placeholder);
    }

    fs.writeFileSync(
      configPath,
      placeholders.reduce((source, placeholder) => source.replace(placeholder, placeholder.slice(3)), configSource),
    );

    const install = runNpmSync(['install', '--no-audit', '--fund=false'], {
      cwd: targetDir,
      encoding: 'utf8',
    });

    expect(install.error, `install spawn error: ${install.error?.message ?? 'none'}`).toBeUndefined();
    expect(install.status, `stderr: ${install.stderr}\nstdout: ${install.stdout}`).toBe(0);

    const devServer = runNpm(['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: targetDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // pp-dev answers "/" with a redirect to the page's own base, /pl/<package name>/ — that is what
    // tells this server apart from anything else that could answer on the port.
    const isScaffoldedApp = (response) =>
      response.status === 302 && (response.headers.get('location') ?? '').includes(`/${packageName}/`);

    try {
      await waitForHttp(devServer, `http://127.0.0.1:${port}/`, isScaffoldedApp, 60_000);
    } finally {
      stopProcessTree(devServer.pid);
    }
  });
});
