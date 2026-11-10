/**
 * Runs `npm audit --json` for the package itself and for every template, and fails (exit 1) when
 * any of them has a high or critical vulnerability that is not allowlisted. `npm run audit:all`.
 *
 * The templates keep no lockfile in the repository (.gitignore, scripts/clean-templates.js), and
 * npm audit needs one, so each template's package.json is copied to a temporary directory where
 * `npm install --package-lock-only` resolves the tree that a scaffolded project would get today.
 * That is also why a template can fail from one day to the next without a change here: the
 * advisory is new, or a transitive dependency moved.
 *
 * The allowlist is the shared one in mi-examples-workflows (audit-allowlist.json), read on every
 * run: from AUDIT_ALLOWLIST_URL, which the shared CI audit sets, else from its main branch. It
 * holds advisories with no upstream fix that cannot be reached, each with a reason and an `until`
 * date after which it stops applying. Add or remove entries there, not here. If the list cannot be
 * loaded, nothing is allowlisted. AUDIT_ALLOWLIST_URL=none audits without it.
 */
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseAllowlist } from './audit-allowlist.js';
import { npmCommand } from './npm-cli.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_ALLOWLIST_URL =
  'https://raw.githubusercontent.com/mi-examples/mi-examples-workflows/main/audit-allowlist.json';
const FAILING_SEVERITIES = new Set(['high', 'critical']);
const MAX_BUFFER = 64 * 1024 * 1024;

/** Loads the shared allowlist: GHSA id -> reason, for the entries that have not expired. */
async function loadAllowlist() {
  const source = process.env.AUDIT_ALLOWLIST_URL || DEFAULT_ALLOWLIST_URL;

  if (source === 'none') {
    return new Map();
  }

  try {
    let text;

    if (/^https?:\/\//.test(source)) {
      const response = await fetch(source, { signal: AbortSignal.timeout(15_000) });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      text = await response.text();
    } else {
      text = readFileSync(source, 'utf8');
    }

    const { allowlist, warnings } = parseAllowlist(text);

    for (const warning of warnings) {
      console.warn(warning);
    }

    console.log(`Audit allowlist: ${source} (${allowlist.size} active)`);

    return allowlist;
  } catch (error) {
    console.warn(`⚠ Could not load the audit allowlist from ${source} (${error.message}); nothing is allowlisted.`);

    return new Map();
  }
}

function runNpm(args, cwd) {
  const { command, args: fullArgs, shell } = npmCommand(args);

  return spawnSync(command, fullArgs, { cwd, encoding: 'utf8', shell, maxBuffer: MAX_BUFFER });
}

/** The GHSA id in an advisory URL, as GitHub writes it (GHSA-jmr9-qjv8-65gv). */
function ghsaIdFromUrl(url) {
  const match = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i.exec(url ?? '');

  return match ? match[0] : null;
}

/** The advisories a vulnerable package ultimately stems from, through the `via` chain. */
function resolveGhsaIds(vulnerabilities, name, seen) {
  if (seen.has(name)) {
    return [];
  }

  seen.add(name);

  const entry = vulnerabilities[name];

  if (!entry) {
    return [`UNKNOWN:${name}`];
  }

  const ids = [];

  for (const via of entry.via) {
    if (typeof via === 'string') {
      ids.push(...resolveGhsaIds(vulnerabilities, via, seen));
    } else {
      ids.push(ghsaIdFromUrl(via.url) ?? `UNKNOWN:${via.title ?? name}`);
    }
  }

  return ids;
}

/**
 * `npm audit --json` in `cwd`, checked against the allowlist. npm exits non-zero whenever it finds
 * anything, so only the report decides.
 */
function auditDirectory(cwd, allowlist) {
  const spawned = runNpm(['audit', '--json'], cwd);

  if (spawned.error || !spawned.stdout) {
    console.error(spawned.error ?? spawned.stderr ?? 'npm audit produced no output');

    return false;
  }

  let report;

  try {
    report = JSON.parse(spawned.stdout);
  } catch (error) {
    console.error(`Could not parse the npm audit output: ${error.message}\n${spawned.stdout}`);

    return false;
  }

  if (report.error) {
    console.error(`npm audit failed: ${report.error.summary ?? report.error.code ?? JSON.stringify(report.error)}`);

    return false;
  }

  const vulnerabilities = report.vulnerabilities ?? {};
  const counts = report.metadata?.vulnerabilities ?? {};
  let unresolved = 0;

  for (const [name, entry] of Object.entries(vulnerabilities)) {
    if (!FAILING_SEVERITIES.has(entry.severity)) {
      continue;
    }

    const ghsaIds = [...new Set(resolveGhsaIds(vulnerabilities, name, new Set()))];
    const unallowlisted = ghsaIds.filter((id) => !allowlist.has(id));

    if (unallowlisted.length === 0) {
      const reasons = ghsaIds.map((id) => `${id} — ${allowlist.get(id)}`).join('; ');

      console.log(`  ⚠ ${name} (${entry.severity}) — ALLOWLISTED: ${reasons}`);
      continue;
    }

    unresolved += 1;
    console.log(`  ✗ ${name} (${entry.severity}) — ${unallowlisted.join(', ')}`);
  }

  const lower = ['moderate', 'low', 'info']
    .filter((severity) => counts[severity] > 0)
    .map((severity) => `${counts[severity]} ${severity}`)
    .join(', ');

  if (unresolved === 0) {
    console.log(`  ✓ no unresolved high/critical vulnerabilities${lower ? ` (${lower}, not failing)` : ''}`);
  }

  return unresolved === 0;
}

/** The package itself: its own package-lock.json is in the repository. */
function auditRoot(allowlist) {
  return auditDirectory(rootDir, allowlist);
}

/** A template: resolve its tree from package.json alone, in a temporary directory. */
function auditTemplate(template, allowlist) {
  const tmp = mkdtempSync(join(tmpdir(), `create-pp-dev-audit-${template}-`));

  try {
    copyFileSync(join(rootDir, template, 'package.json'), join(tmp, 'package.json'));

    const install = runNpm(
      ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--fund=false', '--loglevel=error'],
      tmp,
    );

    if (install.error || install.status !== 0) {
      const reason = install.error?.message ?? install.stderr;

      console.error(`npm install --package-lock-only failed for ${template}:\n${reason}`);

      return false;
    }

    return auditDirectory(tmp, allowlist);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const allowlist = await loadAllowlist();
const templates = readdirSync(rootDir)
  .filter((entry) => entry.startsWith('template-'))
  .sort();
const bar = '='.repeat(60);
const results = [];

for (const { label, run } of [
  { label: 'root', run: () => auditRoot(allowlist) },
  ...templates.map((template) => ({ label: template, run: () => auditTemplate(template, allowlist) })),
]) {
  console.log(`\n${bar}\n  npm audit — ${label}\n${bar}\n`);
  results.push({ label, ok: run() });
}

console.log(`\n${bar}\n  Audit summary\n${bar}`);

for (const { label, ok } of results) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}: ${ok ? 'ok' : 'failed'}`);
}

console.log('');

if (results.some(({ ok }) => !ok)) {
  process.exit(1);
}
