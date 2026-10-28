import reviewed from '../app/reviewed-reports.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};
import {catalogueDerived} from './catalogue-runtime.mjs';
import {uniqueReportCorpus,reportCorpusHistory} from './report-corpus-history.mjs';
// New local reports are admitted only through a source-reviewed, frozen derivative.
// Original corpus and stored drafts are kept for explicit compatible migration.
export function extendReportCorpus(base, {includeAdditions=true}={}) {
  if (!reviewed.corpus.length && (!includeAdditions || !additions.corpus.length)) return base;
  return {...base, content_hash:includeAdditions?additions.content_hash:reviewed.content_hash,
    corpus:uniqueReportCorpus(base.corpus,reviewed.corpus,includeAdditions?additions.corpus:[]),themes:[...base.themes,...reviewed.themes,...(includeAdditions?additions.themes:[])]};
}
// Explicit release history only: never accept an arbitrary hash from an imported file.
// Reviewed entries are append-only, so earlier corpora can reuse their unchanged records.
export function previousReportCorpora(base) {
  return reportCorpusHistory(base,reviewed,additions);
}
export const reviewedScopeSnapshots = {};
catalogueDerived(() => Object.assign(reviewedScopeSnapshots, reviewed.scopeSnapshots, additions.scopeSnapshots));
export const reviewedScopeDecisions = {...reviewed.scopeDecisions,...additions.scopeDecisions};
export const reviewedResearchPresets = [...(reviewed.researchPresets ?? []),...additions.researchPresets];
// Later reports supply their own subquestion groups as well as central plans.
// Do not turn newly connected, unreviewed wording into a suggestion: the shared
// presentation gate treats an explicit missing receipt as unknown.
export const reviewedResearchGroups = [...(reviewed.researchGroups ?? []),
  ...(additions.researchGroups ?? []).map(row=>({...row,questionReview:row.questionReview??null}))];
export const reviewedReportIds = [...reviewed.corpus,...additions.corpus].map(c => c.framework.report.id);
export const reviewedThemeIds = [...reviewed.themes,...additions.themes].map(t => t.id);
