import snapshots from "./product-scope-snapshots.json" with { type: "json" };
import {reviewedScopeSnapshots, reviewedScopeDecisions} from './reviewed-reports.mjs';
import { materialMatchesLine } from "./investigation.mjs";
import {revisedReportLine} from './report-quality-revisions.mjs';
export const productScopeVersion = "internal-it-1";
// Editorial admission decisions, not assurance opinions or claims of standards conformance.
export const scopeReview = {};

export function scopeDecision(framework, line) {
  if (line?.displayOnly) return {status:'hold', reason:'Bladeroverzicht; laad de volledige bron voor gebruik in een onderzoek.'};
  if (line?.source_id) {
    const own = framework.workbenchMaterials?.find((m) => m.id === line.id);
    return own && materialMatchesLine(own, line)
      ? { status: "retain", reason: "Eigen onderzoeksbouwsteen; geen goedgekeurde catalogusnorm." }
      : { status: "hold", reason: "Onbekende onderzoeksbouwsteen." };
  }
  if (!framework.productScope)
    return { status: "retain", reason: "Historisch kader buiten de actieve productcatalogus." };
  const reviewed = snapshots[line?.id] ?? reviewedScopeSnapshots[line?.id];
  const report = framework.reports?.find((r) => r.id === line?.report_id) ?? framework.report;
  const expected=reviewed && line?.practicalRevision
    ? JSON.stringify(revisedReportLine(JSON.parse(reviewed.line))) : reviewed?.line;
  if (
    framework.productScope !== productScopeVersion ||
    !reviewed ||
    expected !== JSON.stringify(line) ||
    reviewed.sourceHash !== report.source_hash
  )
    return {
      status: "hold",
      reason:
        "Nieuwe of gewijzigde broninhoud; eerst inhoudelijk beoordelen voor internal audit en IT-audit.",
    };
  const [status, reason] = scopeReview[line.id] ?? reviewedScopeDecisions[line.id] ?? ["hold", "Nog niet beoordeeld."];
  return { status, reason };
}
export function admittedLines(framework) {
  return framework.lines.filter((l) => scopeDecision(framework, l).status === "retain");
}
export function applyProductScope(framework) {
  const scoped = { ...framework, productScope: productScopeVersion };
  const lines = admittedLines(scoped),
    ids = new Set(lines.map((l) => l.id));
  return {
    ...scoped,
    themes: (framework.themes ?? [])
      .map((t) => {
        const lineIds = t.lineIds.filter((id) => ids.has(id));
        return {
          ...t,
          lineIds,
          reportIds: [
            ...new Set(
              lines
                .filter((l) => lineIds.includes(l.id))
                .map((l) => l.report_id ?? framework.report.id),
            ),
          ],
        };
      })
      .filter((t) => t.lineIds.length),
    patterns: framework.patterns.filter((p) => p.line_ids.every((id) => ids.has(id))),
  };
}
export function cleanScopeDraft(framework, draft) {
  if (!framework.productScope) return { draft, removed: [] };
  // Cleaning a project only needs admission decisions for its selections and
  // links, not every unrelated norm in the loaded catalogue. Keep the same
  // source checks for every referenced line, including links outside selection.
  const referenced = new Set([...draft.included,...(draft.research?.links ?? []).map(l=>l.line_id)]);
  const allowed = new Set(framework.lines.filter(l=>referenced.has(l.id) &&
    scopeDecision(framework,l).status === 'retain').map(l=>l.id));
  const removed = draft.included.filter((id) => !allowed.has(id));
  const badLinks = draft.research?.links.some((l) => !allowed.has(l.line_id));
  if (!removed.length && !badLinks) return { draft, removed };
  return {
    removed,
    draft: {
      ...draft,
      included: draft.included.filter((id) => allowed.has(id)),
      ...(draft.research
        ? {
            research: {
              ...draft.research,
              links: draft.research.links.filter((l) => allowed.has(l.line_id)),
            },
          }
        : {}),
    },
  };
}
export function assertScopeExport(framework, draft) {
  const { removed } = cleanScopeDraft(framework, draft);
  if (removed.length)
    throw new Error(
      "Deze onderdelen vallen buiten internal audit en IT-audit: " +
        removed.join(", ") +
        ". Open het bijgewerkte referentiekader om de testselectie op te schonen.",
    );
}
