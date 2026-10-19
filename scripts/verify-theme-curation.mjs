import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateThemeCuration} from '../content-tools/theme-curation.mjs';
import taxonomy from '../lib/theme-curation.json' with {type:'json'};
import {verifyReportQualityRelease} from './verify-report-quality-release.mjs';
import raw from '../app/report-point-catalogue.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};
import originalBundle from '../app/trial-corpus.json' with {type:'json'};
import {extendReportCorpus} from '../lib/reviewed-reports.mjs';
import {composeCorpus} from '../lib/corpus-model.mjs';
import {applyProductScope} from '../lib/product-scope.mjs';

export async function verifyThemeCuration() {
  // Historical classification evidence remains fixed; practical changes have
  // an additional independently reviewed category-impact receipt.
  const baseFramework=applyProductScope(composeCorpus(extendReportCorpus(originalBundle)));
  const review = JSON.parse(readFileSync(new URL('../content-tools/theme-curation-review.json',import.meta.url),'utf8'));
  const result=validateThemeCuration(taxonomy,review,baseFramework.lines,[...raw.points,...additions.catalogue.points]);
  verifyReportQualityRelease();
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  console.log(JSON.stringify(await verifyThemeCuration()));
