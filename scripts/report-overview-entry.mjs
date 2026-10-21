// Build-time only. The same source admission and reviewed presentation adapters
// as the application produce the overview; no extraction or new content here.
import {ensureCatalogue} from '../lib/catalogue-runtime.mjs';
import {baseFramework, corpus} from '../lib/application-catalogue.mjs';
import {admittedLines} from '../lib/product-scope.mjs';
import {sourceElement} from '../lib/framework-source-items.mjs';
import catalogue from '../lib/report-point-catalogue.mjs';
import {projectReportOverviews} from './report-overview-projection.mjs';
export {configureCatalogueReader} from '../agent-tools/catalogue-transport.mjs';

export async function reportOverviews() {
  await ensureCatalogue(['catalogue', 'report']);
  return projectReportOverviews(admittedLines(baseFramework), corpus.map(c => c.framework), catalogue.points, sourceElement);
}
