import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { captureEvidencePaths } from '../content-tools/evidence-paths.mjs';
import { verifyReportRelease } from './verify-report-release.mjs';

// A transport copy of historical dependencies, never a new source approval.
export function prepareEvidenceBundle(destination, verify = verifyReportRelease) {
  const root = resolve(destination);
  if (existsSync(root)) throw new Error('Evidence bundle already exists; choose a new directory');
  const collected = captureEvidencePaths(verify);
  if (!collected.files.length) throw new Error('No verified historical dependencies were captured');
  mkdirSync(root, { recursive: true });
  const payload = join(root, 'payload'); mkdirSync(payload);
  const files = [], written = new Set(); let bytes = 0;
  for (const file of collected.files) {
    const content = readFileSync(file.target), sha = createHash('sha256').update(content).digest('hex');
    if (!written.has(sha)) {
      writeFileSync(join(payload, sha + '.bin'), content, { flag: 'wx' });
      written.add(sha); bytes += content.length;
    }
    files.push({ original: file.original, path: 'payload/' + sha + '.bin' });
  }
  const manifestPath = join(root, 'paths.json');
  writeFileSync(manifestPath, JSON.stringify({ format: 'omnibus-evidence-paths', schemaVersion: 1, files }, null, 2) + '\n', { flag: 'wx' });
  const before = process.env.OMNIBUS_EVIDENCE_MAP;
  try {
    process.env.OMNIBUS_EVIDENCE_MAP = manifestPath;
    assert.deepEqual(verify(), collected.result, 'Copied evidence must pass the same unchanged release gate');
  } finally {
    if (before === undefined) delete process.env.OMNIBUS_EVIDENCE_MAP;
    else process.env.OMNIBUS_EVIDENCE_MAP = before;
  }
  return { status: 'VERIFIED_TRANSPORT_COPY', manifestPath, paths: files.length,
    uniqueFiles: written.size, bytes, newContentApproval: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/prepare-evidence-bundle.mjs <new-directory>');
  console.log(JSON.stringify(prepareEvidenceBundle(process.argv[2])));
}
