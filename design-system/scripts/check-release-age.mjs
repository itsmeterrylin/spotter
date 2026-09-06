// Fails if any pinned dependency version was published less than MIN_DAYS ago.
// Usage: node scripts/check-release-age.mjs   (MIN_DAYS env overrides 60)
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const MIN_DAYS = Number(process.env.MIN_DAYS ?? 60);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const now = Date.now();
let failed = false;
for (const [name, version] of Object.entries(deps)) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) { console.error(`${name}: "${version}" is not an exact pin`); failed = true; continue; }
  const times = JSON.parse(execSync(`npm view ${name} time --json`, { encoding: 'utf8' }));
  const published = times[version];
  if (!published) { console.error(`${name}@${version}: not found on the registry`); failed = true; continue; }
  const ageDays = Math.floor((now - Date.parse(published)) / 86_400_000);
  const ok = ageDays >= MIN_DAYS;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}@${version} published ${published.slice(0, 10)} (${ageDays} days)`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
