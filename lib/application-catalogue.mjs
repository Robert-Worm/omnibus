import originalBundle from '../app/trial-corpus.json' with {type:'json'};
import {extendReportCorpus, previousReportCorpora} from './reviewed-reports.mjs';
import {composeCorpus} from './corpus-model.mjs';
import {applyProductScope} from './product-scope.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
import {assertNoRemovedReportContent} from './removed-report-content.mjs';
import {revisedReportLine,reportQualityVersion} from './report-quality-revisions.mjs';
import runtime from 'omnibus-data:lib/application-catalogue.mjs';
import {registerCatalogueResource,applyCatalogueEdits} from './catalogue-runtime.mjs';
import {databaseSourceClient} from './database-source-client.mjs';
import {foundationSummaries,reportSummaries} from './catalogue-summary.mjs';
import {reportOverviewKey} from './report-overviews.mjs';
import {foundationOverviewKey} from './foundation-overviews.mjs';
import {modelDirectoryKey} from './model-directory.mjs';
import {modelContentKeys,projectModelIds} from './model-loading.mjs';

export const corpus = extendReportCorpus(originalBundle).corpus;
export let baseFramework, previousFrameworks;
catalogueDerived(() => {
  baseFramework = applyProductScope(composeCorpus(extendReportCorpus(originalBundle)));
  // Scope acceptance applies to the unchanged source extraction first. The
  // reviewed practical revision then becomes the current text. Its application
  // record distinguishes independent-panel review from requested text-only self-review.
  baseFramework = {...baseFramework,practicalRevision:reportQualityVersion,lines:baseFramework.lines.map(revisedReportLine)};
  previousFrameworks = previousReportCorpora(originalBundle).map(b => applyProductScope(composeCorpus(b)));
  // Identity-only compatibility: a former baseline is still valid for projects
  // containing only current sources or user materials. Removed content is
  // rejected before hydration/restoration; no old norm text is retained here.
  previousFrameworks.push(...[
    ['4.25-trial','e3035e5c4ef5b5aff335886f218d739b0172de328b50d9dc66ac13a5a2a1f352','e3035e5c4ef5b5aff335886f218d739b0172de328b50d9dc66ac13a5a2a1f352'],
    ['4.24','f27c13041075b16966f0519ce245944edfa028d26d296f2c072c547a0b2aaf0a','7a849a31b69afee287e5b6e7c5e48e8e3c1f5e4a7cc9414f52f6bf2cbe43ed51'],
  ].map(([version,content_hash,source_hash])=>({...baseFramework,version,content_hash,report:{...baseFramework.report,source_hash}})));
});
// In the database build these navigation-only lists have their own resource.
// Norms/evidence are not needed to search the directory or restore open tabs.
export const legacyThemes = [], discoveryViews = [], themes = [], reportViews = [], workspaces = [];
export const catalogueRouting = runtime.routing;
registerCatalogueResource('catalogue', () => databaseSourceClient.content(runtime.ref), value =>
  applyCatalogueEdits({legacyThemes,discoveryViews,themes,reportViews,workspaces,foundationSummaries,reportSummaries},
    Object.entries(value).map(([key,value]) => ({path:[key],value}))), runtime.ref);

export function projectCatalogueKeys(value) {
  assertNoRemovedReportContent(value);
  const draft = value?.draft ?? value;
  const ids = new Set([
    ...(draft?.included ?? []), ...Object.keys(draft?.overrides ?? {}), ...Object.keys(draft?.notes ?? {}),
    ...Object.keys(draft?.branchItems ?? {}), ...(draft?.research?.links ?? []).map(link => link.line_id),
  ]);
  const reports = new Set([...ids].map(id => catalogueRouting.reports[id]).filter(Boolean));
  for (const m of draft?.investigation?.materials ?? []) {
    if (catalogueRouting.reports[m.originalLineId]) reports.add(catalogueRouting.reports[m.originalLineId]);
    if (m.reportTrace) { try { reports.add(JSON.parse(m.reportTrace).report_id); } catch { /* validator reports malformed traces */ } }
  }
  const openIds=value?.view?.combined?value?.workspace?.openIds??[]:[value?.workspace?.activeId];
  const overviewKeys = openIds.flatMap(id => (catalogueRouting.workspaces[id] ?? []).map(reportOverviewKey));
  if (value?.view?.page === 'reader' && value.view.readerId) reports.add(value.view.readerId);
  const needsDirectory=(value?.workspace?.openIds?.length??0)>0||!['entry','start',undefined].includes(value?.view?.page)||reports.size>0||(draft?.investigation?.materials?.length??0)>0;
  const needsModels=(value?.modelLibrary?.models?.length??0)>0||value?.view?.page==='model-workspace'||
    (draft?.investigation?.materials??[]).some(m=>m.kind==='model-question');
  return [...(needsDirectory?['catalogue']:[]),...overviewKeys,...(needsModels?modelContentKeys(projectModelIds(value)):value?.view?.page==='models'?[modelDirectoryKey()]:[]), ...[...reports].filter(Boolean).map(id => 'report:' + id),
    ...(value?.view?.page==='foundation-workspace'?[value.view.foundationFocus||draft?.investigation?.sourceIds?.[0]].filter(Boolean).map(id=>foundationOverviewKey(id,Boolean(value.view.aboutViews?.laws))):[]),
    ...(draft?.investigation?.materials ?? []).map(m => 'foundation:' + m.foundationId)];
}
