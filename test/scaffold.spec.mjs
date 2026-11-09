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
 * Resolves once the dev server answers HTTP on `url` (any status counts), rejects when the child
 * exits first or the budget runs out. The server's output is kept for the error message.
 */
function waitForHttp(child, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    let output = '';
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
        finish();
      } catch {
        // not listening yet
      }
    }, 500);

    const timer = setTimeout(() => {
      finish(new Error(`timed out waiting for the dev server at ${url}\noutput:\n${output}`));
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
    const port = 4173;

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

    const devServer = runNpm(['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
      cwd: targetDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    try {
      await waitForHttp(devServer, `http://127.0.0.1:${port}/`, 60_000);
    } finally {
      stopProcessTree(devServer.pid);
    }
  });
});
