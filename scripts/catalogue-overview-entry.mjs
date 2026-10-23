// Build-time only. The same source admission and reviewed presentation adapters
// as the application produce display/search projections; no new content here.
import {ensureCatalogue} from '../lib/catalogue-runtime.mjs';
import {baseFramework, corpus} from '../lib/application-catalogue.mjs';
import {admittedLines} from '../lib/product-scope.mjs';
import {sourceElement} from '../lib/framework-source-items.mjs';
import catalogue from '../lib/report-point-catalogue.mjs';
import {projectReportOverviews} from './report-overview-projection.mjs';
import {foundations} from '../lib/investigation.mjs';
import {preparedFoundationItems} from '../lib/foundation-workspace.mjs';
import {projectFoundationSearch} from '../lib/foundation-search-projection.mjs';
import {projectFoundationOverview} from './foundation-overview-projection.mjs';
import {cioSourceId,cioPoints,cioSourceBank} from '../lib/cio-law-data.mjs';
import {cioFunctionRows,cioFunctionGroups} from '../lib/cio-function-view.mjs';
import {topicalPackages,topicalRows,topicalGroups} from '../lib/topical-content.mjs';
import {foundationProposals} from '../lib/investigation.mjs';
import {isAdmittedFoundation,flatLawPresentation} from '../lib/admitted-foundation.mjs';
import {projectWwkeOverview} from './wwke-overview-projection.mjs';
import {wwkeSourceId,wwkeCatalogue,wwkePoints,wwkePointContext,wwkeBank,wwkeFilters} from '../lib/wwke-law-data.mjs';
import {wwkeBrowserGroups} from '../lib/wwke-browser-view.mjs';
import {readableWwkeCriterion} from '../lib/wwke-readable-criteria.mjs';
import {initialModelLibrary} from '../lib/model-library.mjs';
import {describeModel} from '../lib/model-directory.mjs';
export {configureCatalogueReader} from '../agent-tools/catalogue-transport.mjs';

export async function catalogueOverviews() {
  await ensureCatalogue(['catalogue', 'report', 'foundation', 'models']);
  return {
    modelDirectory:initialModelLibrary().models.map(describeModel),
    reports:projectReportOverviews(admittedLines(baseFramework), corpus.map(c => c.framework), catalogue.points, sourceElement),
    foundationSearch:projectFoundationSearch(preparedFoundationItems,foundations),
    foundationOverviews:Object.fromEntries([
      [wwkeSourceId,projectWwkeOverview(wwkeSourceId,{criteria:wwkeCatalogue.criteria,points:wwkePoints,contextFor:wwkePointContext,criterionText:readableWwkeCriterion,records:wwkeBank.records,filters:wwkeFilters,groups:wwkeBrowserGroups})],
      [cioSourceId,projectFoundationOverview(cioSourceId,{rows:cioFunctionRows,groups:cioFunctionGroups,points:cioPoints,records:cioSourceBank.records})],
      ...topicalPackages.map(p=>[p.id,projectFoundationOverview(p.id,{rows:topicalRows(p),groups:topicalGroups(p),points:p.catalogue.points,records:p.bank.records})]),
      ...foundations.filter(isAdmittedFoundation).map(source=>{
        const members=foundationProposals.filter(p=>p.sourceId===source.id),keys=new Map(members.map(p=>[p.id,p.originKey]));
        return [source.id,projectFoundationOverview(source.id,flatLawPresentation(source,members),id=>keys.get(id))];
      }),
    ]),
  };
}
