import snapshots from "./product-scope-snapshots.json" with { type: "json" };
import {reviewedScopeSnapshots, reviewedScopeDecisions} from './reviewed-reports.mjs';
import { materialMatchesLine } from "./investigation.mjs";
import {revisedReportLine} from './report-quality-revisions.mjs';
import {catalogueRevision} from './catalogue-runtime.mjs';
export const productScopeVersion = "internal-it-1";
// Editorial admission decisions, not assurance opinions or claims of standards conformance.
export const scopeReview = {};

// Cache only the expected, reviewed text, never an admission decision or the
// caller's mutable line. A new publication invalidates practical revisions;
// replacing a snapshot or changing its source text also forces reconstruction.
let expectedRevision = -1, expectedLines = new WeakMap();
function expectedReportLine(reviewed, practical) {
  if (!reviewed || !practical) return reviewed?.line;
  const revision = catalogueRevision();
  if (revision !== expectedRevision) {
    expectedLines = new WeakMap(); expectedRevision = revision;
  }
  const source = reviewed.line, cached = expectedLines.get(reviewed);
  if (cached && cached.source === source) return cached.text;
  const text = JSON.stringify(revisedReportLine(JSON.parse(source)));
  expectedLines.set(reviewed, {source, text});
  return text;
}

export function scopeDecision(framework, line) {
  return decideScope(framework, line, null);
}
function decideScope(framework, line, lookups) {
  if (line?.displayOnly) return {status:'hold', reason:'Bladeroverzicht; laad de volledige bron voor gebruik in een onderzoek.'};
  if (line?.source_id) {
    const own = lookups ? lookups.materials.get(line.id)
      : framework.workbenchMaterials?.find((m) => m.id === line.id);
    return own && materialMatchesLine(own, line)
      ? { status: "retain", reason: "Eigen onderzoeksbouwsteen; geen goedgekeurde catalogusnorm." }
      : { status: "hold", reason: "Onbekende onderzoeksbouwsteen." };
  }
  if (!framework.productScope)
    return { status: "retain", reason: "Historisch kader buiten de actieve productcatalogus." };
  const reviewed = snapshots[line?.id] ?? reviewedScopeSnapshots[line?.id];
  const report = (lookups ? lookups.reports.get(line?.report_id)
    : framework.reports?.find((r) => r.id === line?.report_id)) ?? framework.report;
  const expected = expectedReportLine(reviewed, line?.practicalRevision);
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
// One ephemeral lookup per batch, not a cache of admission decisions. Preserve
// Array.find's first-match semantics; rebuild after every edit or publication.
function scopeLookups(framework) {
  const firstById = records => {
    const byId = new Map();
    for (const record of records ?? []) {
      const id = record.id;
      // Array.find uses strict equality: NaN must never become a matching ID.
      if (!Number.isNaN(id) && !byId.has(id)) byId.set(id, record);
    }
    return byId;
  };
  // A batch of own materials must not scan unrelated report metadata (or vice versa).
  let materials, reports;
  return {
    get materials() { return materials ??= firstById(framework.workbenchMaterials); },
    get reports() { return reports ??= firstById(framework.reports); },
  };
}
export function admittedLines(framework) {
  const lookups = scopeLookups(framework);
  return framework.lines.filter((l) => decideScope(framework, l, lookups).status === "retain");
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
  const lookups = scopeLookups(framework);
  const allowed = new Set(framework.lines.filter(l=>referenced.has(l.id) &&
    decideScope(framework,l,lookups).status === 'retain').map(l=>l.id));
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
