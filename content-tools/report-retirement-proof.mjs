import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {evidencePath} from './evidence-paths.mjs';
import {removedReportIds} from '../lib/removed-report-content.mjs';

// Frozen evidence belongs to the active reports' original review trail.
// It is never served or treated as a new content approval.
const archived = new URL('../../report-ingestion/CIBG-BIO-2024-RUN-20261011T144814Z/baseline/viewer/app/report-point-catalogue.json', import.meta.url);
export const originalReportCatalogueHash = '54efe0aeefae3a1aa9351b7af7c9f4506e77816ae88960fe255e2b39adc4b5a9';
export function verifyReportCatalogueRemoval(current) {
  const bytes=readFileSync(evidencePath(fileURLToPath(archived)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),originalReportCatalogueHash,'Original review evidence changed');
  const expected=JSON.parse(bytes), removed=new Set(removedReportIds);
  for(const key of ['blocks','points','sources']) expected[key]=expected[key].filter(item=>!removed.has(item.report_id));
  expected.reports=expected.reports.filter(report=>!removed.has(report.id));
  // Only the generated population fingerprint may differ. All retained records
  // and review receipts must remain exactly as independently reviewed.
  assert.ok(isDeepStrictEqual({...current,fingerprint:undefined},{...expected,fingerprint:undefined}),'Report removal changed retained content');
  return originalReportCatalogueHash;
}
