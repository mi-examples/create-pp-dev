// The shared audit allowlist (audit-allowlist.json in mi-examples-workflows), parsed the way the
// shared audit parses it: an entry counts only with a GHSA id, a reason and an `until` that is a
// real calendar day; an entry whose `until` day has passed is reported and no longer applies.
const GHSA_ID = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;

/** `YYYY-MM-DD` that names a day that exists: 2026-02-30 and 2026-99-99 do not. */
function isCalendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Parses the allowlist JSON. Returns the active entries as a Map from GHSA id to the reason (with
 * its expiry), and the warnings to print for entries that were ignored or have expired.
 * `today` is a `YYYY-MM-DD` in UTC; an entry applies through its `until` day.
 */
export function parseAllowlist(text, today = new Date().toISOString().slice(0, 10)) {
  const allowlist = new Map();
  const warnings = [];

  for (const entry of JSON.parse(text).entries ?? []) {
    const id = entry?.id ?? '';
    const until = entry?.until ?? '';
    const valid =
      GHSA_ID.test(id) && typeof entry.reason === 'string' && entry.reason.trim() !== '' && isCalendarDay(until);

    if (!valid) {
      warnings.push(`⚠ Ignoring an invalid audit allowlist entry: ${JSON.stringify(entry)}`);
    } else if (until < today) {
      warnings.push(`✗ The audit allowlist entry for ${id} expired on ${until}, so it applies no more.`);
    } else {
      allowlist.set(id, `${entry.reason.trim()} (until ${until})`);
    }
  }

  return { allowlist, warnings };
}
