// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/report-point-adapter.mjs";
import additions from "@/app/report-additions.json" with {type:'json'};
import { addMaterials } from "@/lib/investigation.mjs";
import {reportPointTrace,reportDownloadUrls} from "@/lib/report-point-source.mjs";
import {reportPointLookup} from "@/lib/report-point-lookup.mjs";
import { controlObjectiveFor, objectiveGroupFor } from "@/lib/control-objectives.mjs";
import { organizationalGoalFor } from "@/lib/organizational-goals.mjs";
import { selectLines } from "@/lib/workspace-view.mjs";
// Authored generic formulations. No replacement is performed on quotations,
// source context, evidence boundaries, or the historical parent record.
const generic = data.generic;
// Material construction only reads this view; copying its complete provenance
// for every selected point is unnecessary. Clone only phases we actually edit.
function resolvedPointWording(point, mode = "generic") {
  if (!["generic", "source"].includes(mode)) throw Error("Onbekende formulering.");
  const wording = mode === "generic" && generic[point.id];
  if (mode === "generic" && point.generic_variant) {
    return {...point, title:point.generic_variant.title, text:point.generic_variant.text,
      phases:point.generic_variant.phases};
  }
  if (!wording) return point;
  const copy = {...point, title:wording[0], text:wording[1], phases:structuredClone(point.phases)};
  const phase = Object.keys(copy.phases).find((k) => copy.phases[k].status === "APPLICABLE");
  copy.phases[phase].procedure = wording[2];
  if (wording[3]) copy.phases[phase].evidence = wording[3];
  if (point.id === "ERP25-L02/TP01")
    copy.phases.bestaan.procedure =
      "Selecteer een recente risicoacceptatie en een escalatie rond het onderzochte informatiesysteem. Vergelijk de feitelijke beslisser met het mandaat op het beslismoment en leg vast welke andere deelnemende organisaties moesten worden betrokken.";
  return copy;
}
// Viewer callers retain an independent, editable copy, including nested data.
export function pointWording(point, mode = "generic") {
  return structuredClone(resolvedPointWording(point, mode));
}
export function makeReportPointMaterial(catalogue, id, mode) {
  return pointMaterial(catalogue,id,mode,reportPointLookup(catalogue));
}
function pointMaterial(catalogue, id, mode, lookup) {
  const original = lookup.points(id);
  if (!original) throw Error("Onbekend toetspunt.");
  const point = resolvedPointWording(original, mode),
    block = lookup.blocks(point.legacy_line_id);
  const report = lookup.reports(point.report_id),
    bd = controlObjectiveFor(block.line),
    group = objectiveGroupFor(block.line);
  const trace=reportPointTrace(catalogue,id,lookup);
  const hasFrozenTrace = additions.locators.some(locator => locator.point_id === id);
  const references = (links) =>
    links
      .map((l) => {
        const m = lookup.sources(l.material_id);
        if (!m) throw Error("Bronpassage ontbreekt.");
        const precise=hasFrozenTrace?trace.relations.find(r=>r.evidence_id===l.evidence_id):null;
        return `${l.evidence_id} · pagina ${precise?.page ?? m.page ?? "onbekend"}\n${precise?.quote ?? m.quote}`;
      })
      .join("\n\n");
  const phases = Object.entries(point.phases).filter(([, v]) => v.status === "APPLICABLE");
  const phaseText = (v) =>
    [v.procedure, "Bewijs: " + v.evidence, "Beperking: " + v.boundary].join("\n");
  return {
    kind: "criterion",
    title: point.title,
    body: point.text,
    originKey: "report-point:" + point.id,
    sourcePointId: point.id,
    originalLineId: block.id,
    wordingMode: original.variant_available === false ? "source" : mode,
    question: trace.questions.map(q=>q.text).join('\n\n'),
    ...(hasFrozenTrace?{reportTrace:JSON.stringify(trace)}:{}),
    rationale: mode === 'generic' && original.practical_revision
      ? block.line.practicalGenericGoal : organizationalGoalFor(block.line).text,
    risk: block.line.risk.text,
    control: mode === 'generic' && original.variant_available !== false &&
      typeof original.generic_control === 'string' && original.generic_control.trim()
      ? original.generic_control : block.line.control.text,
    controlObjective: bd.text,
    controlObjectiveId: group.id,
    controlObjectiveTitle: group.title,
    parentCriterion: block.criterion.text,
    procedure: phases.map(([name, v]) => name.toUpperCase() + "\n" + phaseText(v)).join("\n\n"),
    documents: [...new Set(phases.map(([, v]) => v.evidence))].join("\n"),
    testDesign: point.phases.opzet.status === "APPLICABLE" ? phaseText(point.phases.opzet) : "",
    testExistence:
      point.phases.bestaan.status === "APPLICABLE" ? phaseText(point.phases.bestaan) : "",
    testOperation: "",
    sourceTitle: report.title,
    sourceUrl: reportDownloadUrls[report.id] || (report.url?.startsWith("https://") ? report.url : ""),
    location: [
      ...new Set(
        point.source_links.map((l) => {
          const m = lookup.sources(l.material_id);
          return l.evidence_id + " · pagina " + (m.page ?? "onbekend");
        }),
      ),
    ].join("; "),
    sourceHash: report.source_hash,
    edition: String(report.year),
    reviewStatus: point.review_status || "AUTHOR_REVIEWED_PILOT",
    sourceText: references(point.source_links),
    sourceContext: [
      point.source_context.report,
      point.source_context.local !== point.source_context.report ? point.source_context.local : "",
      ...trace.limitations,
      ...trace.visuals.map(v=>'Visuele broncontext · pagina '+v.page+'\n'+v.observation+'\n'+v.interpretation_limit),
      point.context_source_links.length
        ? "Aanvullende historische context\n" + references(point.context_source_links)
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    sourceChanges:
      "Hergebruikversie " +
      catalogue.fingerprint +
      ". " + (point.detail_level === 'CRITERION_RETAINED' ? 'Bestaand criterium als geheel behouden; uitsplitsing en fase-uitwerking nog te beoordelen. ' : 'Voorgesteld toetspunt. ') + "Geen algemene verplichting en geen huidige bevinding.",
    sourceMethodology:
      "Herkomst: " +
      block.id +
      (point.goal_review === 'RETAINED_CHAIN_CONTEXT'
        ? ". Het organisatie-/procesdoel is behouden uit de beoordeelde bronanalyse. "
        : ". Het organisatie-/procesdoel volgt de afzonderlijke doelreview. ") +
      "Afgeleide doelen en beheersdoelstellingen zijn analysevoorstellen, geen bevestiging van vastgestelde organisatiedoelen. Risico, maatregel en bovenliggend criterium zijn context uit de bronanalyse. Het toetspunt en de uitvoering zijn voorstellen. Formulering: " +
      (point.variant_available === false ? "brongebonden analysevoorstel, niet aanvullend gegeneraliseerd" : mode === "generic" ? "generiek" : "broncontext") +
      ". Onderzoeksperiode, populatie en toepasselijkheid afzonderlijk bepalen.",
  };
}
export function adoptReportPoints(draft, catalogue, ids, mode) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw Error("Ongeldige selectie.");
  const lookup=reportPointLookup(catalogue,ids.length>1);
  return addMaterials(
    draft,
    ids.map((id) => pointMaterial(catalogue, id, mode, lookup)),
  );
}

// Selection changes only inclusion. Saved wording, overrides and question links
// survive deselection so that selecting a point again restores the same work.
export function setReportPointSelection(draft, catalogue, ids, selected, mode = "generic") {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || typeof selected !== "boolean")
    throw Error("Ongeldige selectie.");
  if (!["generic", "source"].includes(mode)) throw Error("Onbekende formulering.");
  const points = ids.map((id) => {
    const point = catalogue.points.find((p) => p.id === id);
    if (!point) throw Error("Onbekend toetspunt.");
    return point;
  });
  if (!points.length) return draft;
  let next = selected ? adoptReportPoints(draft, catalogue, ids, mode) : draft;
  if (!selected) {
    const pointIds = new Set(ids);
    const materialIds = (draft.investigation?.materials || [])
      .filter(
        (m) =>
          pointIds.has(m.sourcePointId) || ids.some((id) => m.originKey === "report-point:" + id),
      )
      .map((m) => m.id);
    next = selectLines(next, materialIds, false);
  }
  // A deliberate point-level choice replaces whole-item inclusion, not the
  // historical source or its saved edits/links. Never count both as selections.
  const parents = new Set(points.map((p) => p.legacy_line_id));
  const retainedSnapshots = (draft.investigation?.materials || [])
    .filter(m => parents.has(m.originalLineId) &&
      m.sourcePointId === m.originalLineId + '/TC-ALL' &&
      !ids.includes(m.sourcePointId))
    .map(m => m.id);
  return selectLines(next, [...parents, ...retainedSnapshots], false);
}

// Bulk and row checkboxes use the same rule: worked-out rows select their
// children; ordinary rows retain existing whole-item selection behaviour.
export function selectReportRows(draft, catalogue, rowIds, selected) {
  if (
    !Array.isArray(rowIds) ||
    rowIds.some((id) => typeof id !== "string") ||
    typeof selected !== "boolean"
  )
    throw Error("Ongeldige selectie.");
  const rows = new Set(rowIds);
  const points = catalogue.points.filter((p) => rows.has(p.legacy_line_id));
  const workedOut = new Set(points.map((p) => p.legacy_line_id));
  const next = setReportPointSelection(
    draft,
    catalogue,
    points.map((p) => p.id),
    selected,
  );
  return selectLines(
    next,
    [...rows].filter((id) => !workedOut.has(id)),
    selected,
  );
}
