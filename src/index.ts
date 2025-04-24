/* eslint-disable no-console */
import fs, { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';
import minimist from 'minimist';
import * as p from '@clack/prompts';
import { blue, cyan, magenta, red, reset, yellow } from 'kolorist';

// Avoids autoconversion to number of the project name by defining that the args
// non associated with an option ( _ ) needs to be parsed as a string. See #4606
const argv = minimist<{
  t?: string;
  template?: string;
}>(process.argv.slice(2), { string: ['_'] });
const cwd = process.cwd();

type ColorFunc = (str: string | number) => string;

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
  customCommand?: string;
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
        display: 'Next.js',
        color: magenta,
      },
    ],
  },
];

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
};

const defaultTargetDir = 'pp-project';

async function init() {
  const argTargetDir = formatTargetDir(argv._[0]);
  const argTemplate = argv.template || argv.t;

  let targetDir = argTargetDir || defaultTargetDir;
  const getProjectName = () => (targetDir === '.' ? path.basename(path.resolve()) : targetDir);

  p.intro('Create PP Dev Project');

  try {
    if (!argTargetDir) {
      const projectName = await p.text({
        message: 'Project name:',
        initialValue: targetDir,
        validate: (value: string) => {
          if (!value) {
            return 'Project name is required';
          }

          return undefined;
        },
      });

      if (p.isCancel(projectName)) {
        p.cancel('Operation cancelled');

        process.exit(0);
      }

      targetDir = formatTargetDir(projectName) || defaultTargetDir;
    }

    if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
      const message =
        targetDir === '.'
          ? 'Current directory is not empty. Please choose how to proceed:'
          : `Target directory "${targetDir}" is not empty. Please choose how to proceed:`;

      const overwrite = await p.select({
        message,
        options: [
          { value: 'yes', label: 'Remove existing files and continue' },
          { value: 'no', label: 'Cancel operation' },
          { value: 'ignore', label: 'Ignore files and continue' },
        ],
      });

      if (p.isCancel(overwrite)) {
        p.cancel('Operation cancelled');

        process.exit(0);
      }

      if (overwrite === 'no') {
        p.cancel('Operation cancelled');

        process.exit(0);
      }

      if (overwrite === 'yes') {
        emptyDir(targetDir);
      }
    }

    const packageName = await p.text({
      message: 'Package name:',
      initialValue: toValidPackageName(getProjectName()),
      validate: (value: string) => {
        if (!isValidPackageName(value)) {
          return 'Invalid package.json name';
        }

        return undefined;
      },
    });

    if (p.isCancel(packageName)) {
      p.cancel('Operation cancelled');

      process.exit(0);
    }

    const framework = await p.select<{ value: Framework; label: string }[], Framework>({
      message: 'Select a framework:',
      options: FRAMEWORKS.map((f) => ({
        value: f,
        label: f.color(f.display || f.name),
      })),
    });

    if (p.isCancel(framework)) {
      p.cancel('Operation cancelled');

      process.exit(0);
    }

    let selectedVariant: string | undefined;

    if (framework.variants) {
      const variantResult = await p.select({
        message: 'Select a variant:',
        options: framework.variants.map((v: FrameworkVariant) => ({
          value: v.name,
          label: v.color(v.display || v.name),
        })),
      });

      if (p.isCancel(variantResult)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      selectedVariant = variantResult as string;
    }

    // determine template
    const template = selectedVariant || framework.name || argTemplate || 'vanilla';

    const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
    const pkgManager = pkgInfo ? pkgInfo.name : 'npm';
    const isYarn1 = pkgManager === 'yarn' && pkgInfo?.version.startsWith('1.');

    const { customCommand } = FRAMEWORKS.flatMap((f) => f.variants).find((v) => v.name === template) ?? {};

    if (customCommand) {
      const fullCustomCommand = customCommand
        .replace(/^npm create /, () => {
          return `${pkgManager} create `;
        })
        .replace('@latest', () => (isYarn1 ? '' : '@latest'))
        .replace(/^npm exec/, () => {
          if (pkgManager === 'pnpm') {
            return 'pnpm dlx';
          }

          if (pkgManager === 'yarn' && !isYarn1) {
            return 'yarn dlx';
          }

          return 'npm exec';
        });

      const [command, ...args] = fullCustomCommand.split(' ');
      const replacedArgs = args.map((arg) => arg.replace('TARGET_DIR', targetDir));
      const { status } = spawn.sync(command, replacedArgs, {
        stdio: 'inherit',
      });

      process.exit(status ?? 0);
    }

    const root = path.join(cwd, targetDir);

    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }

    p.log.step('Scaffolding project...');

    const templateDir = path.resolve(fileURLToPath(import.meta.url), '../..', `template-${template}`);

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

    const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'));

    pkg.name = packageName || getProjectName();

    write('package.json', JSON.stringify(pkg, null, 2) + '\n');

    const addCursorRules = await p.confirm({
      message: 'Add cursor rules?',
    });

    const cdProjectName = path.relative(cwd, root);

    if (addCursorRules) {
      const ruleFiles = fs.readdirSync(path.resolve(fileURLToPath(import.meta.url), '../..', 'mi-cursor-rules'));

      mkdirSync(path.join(root, '.cursor/rules'), { recursive: true });

      for (const file of ruleFiles) {
        copy(
          path.resolve(fileURLToPath(import.meta.url), '../..', 'mi-cursor-rules', file),
          path.join(root, '.cursor/rules', file),
        );
      }
    }

    const addMiComponentsLibrary = await p.confirm({
      message:
        'Add @metricinsights/pp-components (https://www.npmjs.com/package/@metricinsights/pp-components) library?',
    });

    if (addMiComponentsLibrary) {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
      const latestVersion = await fetch('https://registry.npmjs.org/@metricinsights/pp-components').then((res) =>
        res.json(),
      );

      const version = latestVersion['dist-tags']?.latest ?? '0.0.1';

      pkgJson.dependencies['@metricinsights/pp-components'] = `^${version}`;

      write('package.json', JSON.stringify(pkgJson, null, 2) + '\n');
    }

    const installPackages = await p.confirm({
      message: 'Install packages?',
    });

    if (installPackages) {
      const installCommand = pkgManager === 'yarn' ? 'yarn install' : `${pkgManager} install`;

      spawn.sync(installCommand, {
        stdio: 'inherit',
      });
    }

    p.outro('Project created successfully! 🎉');

    console.log(`\nNext steps:\n`);

    if (root !== cwd) {
      console.log(`  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`);

      const configFileName = fs.readdirSync(root).find((value) => value.startsWith('pp-dev.config'));

      configFileName
        ? console.log(`  Fill in the configuration file: ${path.join(root, configFileName)}`)
        : console.log(`  Fill configuration in ${path.join(root, 'package.json')} key "pp-dev"`);
    }

    switch (pkgManager) {
      case 'yarn':
        console.log('  yarn');
        console.log('  yarn dev');
        break;
      default:
        console.log(`  ${pkgManager} install`);
        console.log(`  ${pkgManager} run dev`);
        break;
    }

    console.log();
  } catch (error) {
    p.cancel('Operation failed');
    console.error(error);

    process.exit(1);
  }
}

function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '');
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName);
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-');
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });

  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);

    copy(srcFile, destFile);
  }
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path);

  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

function emptyDir(dir: string) {
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

function pkgFromUserAgent(userAgent: string | undefined) {
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
});
