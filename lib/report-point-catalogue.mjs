import legacy from '../app/report-point-catalogue.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};
import {catalogueDerived} from './catalogue-runtime.mjs';
import {revisedReportBlock,revisedReportPoint,reportQualityVersion} from './report-quality-revisions.mjs';
// Keep the old reviewed catalogue byte-identical; new independently sealed packets
// are additive. Do not relabel historic author states or recycle old review hashes.
const added=additions.catalogue;
const catalogue={...legacy,fingerprint:legacy.fingerprint+':'+added.fingerprint,
 blocks:[...legacy.blocks,...added.blocks],points:[...legacy.points,...added.points],
 sources:[...legacy.sources,...added.sources],reports:[...legacy.reports,...added.reports],
 interview_questions:additions.interview_questions,visual_sources:additions.visual_sources,
 integrationReview:added.integrationReview};
catalogue.fingerprint += ':'+reportQualityVersion;
catalogueDerived(() => {
 for(const key of ['blocks','points','sources','reports']) {
   const values=[...legacy[key],...added[key]];
   catalogue[key].splice(0,catalogue[key].length,...(key==='blocks'?values.map(revisedReportBlock):key==='points'?values.map(revisedReportPoint):values));
 }
});
export default catalogue;
