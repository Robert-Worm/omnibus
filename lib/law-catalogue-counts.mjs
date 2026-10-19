import {cioSourceId} from './cio-law-data.mjs';
import {cioFunctionRows} from './cio-function-view.mjs';
import {wwkeSourceId} from './wwke-law-data.mjs';
import {wwkeBrowserRows} from './wwke-browser-view.mjs';
import {lawViewCounts} from './law-view-counts.mjs';
import {catalogueDerived,catalogueReady} from './catalogue-runtime.mjs';
import {foundationSummaries} from './catalogue-summary.mjs';
import {topicalPackages,topicalRows} from './topical-content.mjs';
const counts=new Map([
 [cioSourceId,lawViewCounts(cioFunctionRows)],
 [wwkeSourceId,lawViewCounts(wwkeBrowserRows({section:'norms'}))],
]);
catalogueDerived(()=>{counts.set(cioSourceId,lawViewCounts(cioFunctionRows));counts.set(wwkeSourceId,lawViewCounts(wwkeBrowserRows({section:'norms'})));});
catalogueDerived(()=>{for(const p of topicalPackages)counts.set(p.id,lawViewCounts(topicalRows(p)));});
export const lawCatalogueCounts=sourceId=>!catalogueReady(['foundation:'+sourceId])&&foundationSummaries[sourceId] ? foundationSummaries[sourceId] : counts.get(sourceId);
