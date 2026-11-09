import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, styleText } from 'node:util';
import spawn from 'cross-spawn';
import * as p from '@clack/prompts';

// dist/index.mjs is bundled into <package>/dist; the templates, the Cursor rules and package.json
// sit next to that directory.
const packageRoot = path.resolve(fileURLToPath(import.meta.url), '../..');
const cwd = process.cwd();

// clack can only ask questions on a terminal. In a pipe or in CI every answer has to come from a
// flag (or from --yes), otherwise the prompt would be cancelled at once and nothing created.
const canPrompt = Boolean(process.stdin.isTTY);

const PP_COMPONENTS_PACKAGE = '@metricinsights/pp-components';
const PP_COMPONENTS_FALLBACK_VERSION = '1.0.0';
const REGISTRY_TIMEOUT_MS = 10_000;

type ColorFunc = (str: string | number) => string;

// node:util styleText honours NO_COLOR / FORCE_COLOR and non-TTY output.
const color =
  (format: Parameters<typeof styleText>[0]): ColorFunc =>
  (str) =>
    styleText(format, String(str));
const blue = color('blue');
const cyan = color('cyan');
const magenta = color('magenta');
const yellow = color('yellow');

type Framework = {
  name: string;
  display: string;
  color: ColorFunc;
  variants: FrameworkVariant[];
};

type FrameworkVariant = {
  name: string;
  display: string;
  color: ColorFunc;
};

const FRAMEWORKS: Framework[] = [
  {
    name: 'vanilla',
    display: 'Vanilla',
    color: yellow,
    variants: [
      {
        name: 'vanilla-ts',
        display: 'TypeScript',
        color: blue,
      },
      {
        name: 'vanilla',
        display: 'JavaScript',
        color: yellow,
      },
    ],
  },
  {
    name: 'react',
    display: 'React',
    color: cyan,
    variants: [
      {
        name: 'react',
        display: 'TypeScript',
        color: blue,
      },
    ],
  },
  {
    name: 'nextjs',
    display: 'Next.js',
    color: magenta,
    variants: [
      {
        name: 'nextjs',
        display: 'CommonJS',
        color: magenta,
      },
      {
        name: 'nextjs-esm',
        display: 'ESM',
        color: magenta,
      },
    ],
  },
];

const TEMPLATE_NAMES = FRAMEWORKS.flatMap((f) => f.variants.map((v) => v.name));

const renameFiles: Record<string, string> = {
  _gitignore: '.gitignore',
};

const defaultTargetDir = 'pp-project';

const CLI_OPTIONS = {
  template: { type: 'string', short: 't' },
  'package-name': { type: 'string' },
  install: { type: 'boolean' },
  'cursor-rules': { type: 'boolean' },
  'pp-components': { type: 'boolean' },
  yes: { type: 'boolean', short: 'y' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
} as const;

const USAGE = `Usage: create-pp-dev [project-name] [options]

Scaffolds a Metric Insights Portal Page project from one of the templates.
Without a flag the CLI asks for the value; with --yes it takes the default instead.

Options:
  -t, --template <name>        Template: ${TEMPLATE_NAMES.join(', ')}
      --package-name <name>    package.json "name" (default: derived from the project name)
      --install                Install the packages after scaffolding (--no-install skips it)
      --cursor-rules           Copy the MI Cursor rules into .cursor/rules (--no-cursor-rules skips it)
      --pp-components          Add ${PP_COMPONENTS_PACKAGE} as a dependency (--no-pp-components skips it)
  -y, --yes                    Ask nothing: keep the files of a non-empty directory, install the
                               packages, no Cursor rules, no pp-components; needs --template
  -h, --help                   Show this help
  -v, --version                Show the version

Examples:
  npm create @metricinsights/pp-dev@latest my-pp -- --template react
  npm create @metricinsights/pp-dev@latest my-pp -- --template nextjs --no-install -y
`;

/** Prints the reason and exits with 1. Never returns. */
function fail(message: string): never {
  p.cancel(message);
  process.exit(1);
}

function parseCliArgs() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: CLI_OPTIONS,
      allowPositionals: true,
      allowNegative: true,
      strict: true,
    });
  } catch (error) {
    // node's message for an unknown option goes on to explain positionals after '--'; the first
    // sentence says what matters.
    const message = (error instanceof Error ? error.message : String(error)).replace(/\.\s+To specify .*$/s, '');

    fail(`${message}. Run create-pp-dev --help for the available options.`);
  }
}

/**
 * Runs a prompt, or fails when there is no terminal to show it on. `hint` names the flag that
 * answers the question without a prompt.
 */
async function ask<T>(hint: string, run: () => Promise<T>): Promise<Exclude<T, symbol>> {
  if (!canPrompt) {
    fail(`Standard input is not a terminal, so there is nothing to ask: pass ${hint} or --yes (see --help).`);
  }

  const result = await run();

  if (p.isCancel(result)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return result as Exclude<T, symbol>;
}

async function chooseTemplate(): Promise<string> {
  const framework = await ask('--template <name>', () =>
    p.select<Framework>({
      message: 'Select a framework:',
      options: FRAMEWORKS.map((f) => ({
        value: f,
        label: f.color(f.display || f.name),
      })),
    }),
  );

  if (framework.variants.length === 1) {
    return framework.variants[0].name;
  }

  return ask('--template <name>', () =>
    p.select<string>({
      message: 'Select a variant:',
      options: framework.variants.map((v) => ({
        value: v.name,
        label: v.color(v.display || v.name),
      })),
    }),
  );
}

/**
 * The newest published version of pp-components, read from the registry npm is configured with.
 * A registry that is down, slow or answers something else is a warning, not a failure: the project
 * is already on disk by now, and `^1.0.0` is a working floor.
 */
async function latestPpComponentsVersion(): Promise<string> {
  const registry = (process.env.npm_config_registry || 'https://registry.npmjs.org').replace(/\/+$/, '');
  const url = `${registry}/${PP_COMPONENTS_PACKAGE}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS) });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const packument = (await response.json()) as { 'dist-tags'?: { latest?: unknown } };
    const latest = packument['dist-tags']?.latest;

    if (typeof latest !== 'string' || !latest) {
      throw new Error('no "latest" dist-tag in the response');
    }

    return latest;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    p.log.warn(
      `Could not read the latest ${PP_COMPONENTS_PACKAGE} version from ${url} (${reason}); ` +
        `using ^${PP_COMPONENTS_FALLBACK_VERSION}.`,
    );

    return PP_COMPONENTS_FALLBACK_VERSION;
  }
}

async function init() {
  const { values: argv, positionals } = parseCliArgs();

  if (argv.help) {
    console.log(USAGE);

    return;
  }

  if (argv.version) {
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8')) as { version: string };

    console.log(pkg.version);

    return;
  }

  const argTargetDir = formatTargetDir(positionals[0]);
  const argTemplate = argv.template;
  const argPackageName = argv['package-name'];
  const shouldInstallPackages = argv.install;
  const shouldAddCursorRules = argv['cursor-rules'];
  const shouldAddMiComponentsLibrary = argv['pp-components'];
  const assumeDefaults = argv.yes === true;

  let targetDir = argTargetDir ?? defaultTargetDir;
  // The directory's own name, whether the target was given as ".", a relative or an absolute path.
  const getProjectName = () => path.basename(path.resolve(cwd, targetDir));

  p.intro('Create PP Dev Project');

  // Everything the flags say is checked before anything is asked or written, so a typo can't end
  // with an emptied directory and an error.
  if (argTemplate !== undefined && !TEMPLATE_NAMES.includes(argTemplate)) {
    fail(`Unknown template "${argTemplate}". Available templates: ${TEMPLATE_NAMES.join(', ')}.`);
  }

  if (argPackageName !== undefined && !isValidPackageName(argPackageName)) {
    fail(`Invalid package.json name "${argPackageName}".`);
  }

  if (assumeDefaults && argTemplate === undefined) {
    fail(`--yes needs --template <name>. Available templates: ${TEMPLATE_NAMES.join(', ')}.`);
  }

  try {
    if (!argTargetDir) {
      if (assumeDefaults) {
        targetDir = defaultTargetDir;
      } else {
        const projectName = await ask('the project name as the first argument', () =>
          p.text({
            message: 'Project name:',
            initialValue: targetDir,
            validate: (value) => {
              if (!value?.trim()) {
                return 'Project name is required';
              }

              return undefined;
            },
          }),
        );

        targetDir = formatTargetDir(projectName) ?? defaultTargetDir;
      }
    }

    if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
      const message =
        targetDir === '.'
          ? 'Current directory is not empty. Please choose how to proceed:'
          : `Target directory "${targetDir}" is not empty. Please choose how to proceed:`;

      const overwrite = assumeDefaults
        ? 'ignore'
        : await ask('--yes (keeps the existing files)', () =>
            p.select<'yes' | 'no' | 'ignore'>({
              message,
              options: [
                { value: 'yes', label: 'Remove existing files and continue' },
                { value: 'no', label: 'Cancel operation' },
                { value: 'ignore', label: 'Ignore files and continue' },
              ],
            }),
          );

      if (overwrite === 'no') {
        p.cancel('Operation cancelled');

        process.exit(0);
      }

      if (overwrite === 'yes') {
        emptyDir(targetDir);
      }

      if (assumeDefaults) {
        p.log.info(`Keeping the existing files in ${targetDir === '.' ? 'the current directory' : `"${targetDir}"`}`);
      }
    }

    let packageName: string;

    if (argPackageName !== undefined) {
      packageName = argPackageName;
    } else if (assumeDefaults) {
      packageName = toValidPackageName(getProjectName());
    } else {
      packageName = await ask('--package-name <name>', () =>
        p.text({
          message: 'Package name:',
          initialValue: toValidPackageName(getProjectName()),
          validate: (value) => {
            if (!value || !isValidPackageName(value)) {
              return 'Invalid package.json name';
            }

            return undefined;
          },
        }),
      );
    }

    if (!isValidPackageName(packageName)) {
      fail(`Invalid package.json name "${packageName}".`);
    }

    const template = argTemplate ?? (await chooseTemplate());

    const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
    const pkgManager = pkgInfo ? pkgInfo.name : 'npm';

    const root = path.resolve(cwd, targetDir);

    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }

    p.log.step('Scaffolding project...');

    const templateDir = path.join(packageRoot, `template-${template}`);

    const write = (file: string, content?: string) => {
      const targetPath = path.join(root, renameFiles[file] ?? file);

      if (content) {
        fs.writeFileSync(targetPath, content);
      } else {
        copy(path.join(templateDir, file), targetPath);
      }
    };

    const files = fs.readdirSync(templateDir);

    for (const file of files.filter((f) => f !== 'package.json')) {
      write(file);
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, 'package.json'), 'utf-8'));

    pkg.name = packageName;

    write('package.json', JSON.stringify(pkg, null, 2) + '\n');

    const addCursorRules =
      shouldAddCursorRules ??
      (assumeDefaults
        ? false
        : await ask('--cursor-rules or --no-cursor-rules', () =>
            p.confirm({
              message: 'Add Cursor rules?',
            }),
          ));

    const cdProjectName = path.relative(cwd, root);

    if (addCursorRules) {
      const rulesDir = path.join(packageRoot, 'mi-cursor-rules');
      const ruleFiles = fs.readdirSync(rulesDir);

      fs.mkdirSync(path.join(root, '.cursor/rules'), { recursive: true });

      for (const file of ruleFiles) {
        copy(path.join(rulesDir, file), path.join(root, '.cursor/rules', file));
      }
    }

    const addMiComponentsLibrary =
      shouldAddMiComponentsLibrary ??
      (assumeDefaults
        ? false
        : await ask('--pp-components or --no-pp-components', () =>
            p.confirm({
              message: `Add ${PP_COMPONENTS_PACKAGE} (https://www.npmjs.com/package/${PP_COMPONENTS_PACKAGE}) library?`,
            }),
          ));

    if (addMiComponentsLibrary) {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
      const version = await latestPpComponentsVersion();

      if (!pkgJson.dependencies) {
        pkgJson.dependencies = {};
      }

      pkgJson.dependencies[PP_COMPONENTS_PACKAGE] = `^${version}`;

      write('package.json', JSON.stringify(pkgJson, null, 2) + '\n');
    }

    const installPackages =
      shouldInstallPackages ??
      (assumeDefaults
        ? true
        : await ask('--install or --no-install', () =>
            p.confirm({
              message: 'Install packages?',
            }),
          ));

    const installCommand = `${pkgManager} install`;

    if (installPackages) {
      const [cmd, ...args] = installCommand.split(' ');
      const { status, error } = spawn.sync(cmd, args, {
        stdio: 'inherit',
        cwd: root,
      });

      if (error || status !== 0) {
        const reason = error ? error.message : `exit code ${status ?? 'unknown'}`;
        const where = cdProjectName ? ` in ${cdProjectName}` : '';

        fail(
          `"${installCommand}" failed (${reason}). ` +
            `The project files are in place; run "${installCommand}"${where} to retry.`,
        );
      }
    }

    p.outro('Project created successfully! 🎉');

    console.log('\nNext steps:\n');

    if (root !== cwd) {
      console.log(`  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`);

      const configFileName = fs.readdirSync(root).find((value) => value.startsWith('pp-dev.config'));

      if (configFileName) {
        console.log(`  Fill in the configuration file: ${path.join(root, configFileName)}`);
      } else {
        console.log(`  Fill configuration in ${path.join(root, 'package.json')} key "pp-dev"`);
      }
    }

    if (!installPackages) {
      console.log(`  ${installCommand}`);
    }

    console.log(pkgManager === 'yarn' ? '  yarn dev' : `  ${pkgManager} run dev`);
    console.log();
  } catch (error) {
    p.cancel('Operation failed');
    console.error(error);

    process.exit(1);
  }
}

export function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/[\\/]+$/g, '');
}

export function copy(src: string, dest: string) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

export function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName);
}

export function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-');
}

export function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });

  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);

    copy(srcFile, destFile);
  }
}

export function isEmpty(path: string) {
  const files = fs.readdirSync(path);

  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

export function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue;
    }

    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

export function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) {
    return undefined;
  }

  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');

  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

init().catch((e) => {
  console.error(e);

  process.exit(1);
});
