import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyReportRelease } from './verify-report-release.mjs';

// Both delivery forms use the same existing release gates. A database build
// must not accidentally admit content that the offline package would reject.
export function verifyApplicationRelease() {
  verifyReportRelease();
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  for (const args of [
    ['scripts/verify-theme-curation.mjs'],
    ['scripts/prepare-organizational-goals.mjs', '--check'],
    ['scripts/prepare-cio-integration.mjs', '--check'],
    ['scripts/prepare-wwke.mjs', '--check'],
    ['scripts/verify-cio-editorial.mjs'],
    ['scripts/verify-wwke-text-review.mjs'],
    ['scripts/prepare-topical-integration.mjs','--check'],
  ]) execFileSync(process.execPath, args, { cwd, stdio: 'inherit' });
}
