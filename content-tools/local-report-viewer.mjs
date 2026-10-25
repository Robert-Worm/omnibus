// Portable projection of the existing reuse packet, not an authoring or admission
// step. The caller must bind ALL inputs to the final reviews before using this.
import { canonical } from "./identity.mjs";
import { indexPages } from "../lib/source-text-blocks.mjs";

export const reportViewerFiles = ["REUSE-CANDIDATE.json", "REUSE-VIEWER-PROJECTION.json", "POINT-SOURCE-LOCATORS.json"];
const requireValue = (ok, message) => { if (!ok) throw Error("Report viewer: " + message); };
const text = value => typeof value === "string" && Boolean(value.trim());
const equal = (a, b) => canonical(a) === canonical(b);
function indexed(rows, label, key = "id") {
  requireValue(Array.isArray(rows), label + " must be an array");
  const result = new Map();
  for (const row of rows) {
    requireValue(text(row?.[key]) && !result.has(row[key]), label + " has missing or duplicate identities");
    result.set(row[key], row);
  }
  return result;
}

/** Assemble the same data consumed by report-point-adapter and report-point-source.
 * No filesystem, database, generated prose, changed review states or scope grants.
 * Missing reuse authoring is an error, never a generated goal or new test phase.
 */
export function projectLocalReportViewer({ app, reuse, projection, locators }) {
  requireValue([app, reuse, projection].every(value => value && typeof value === "object" && !Array.isArray(value)),
    "missing report or reuse object");
  const report = app?.framework?.report;
  requireValue(text(report?.id) && text(report.title), "missing report identity");
  const lines = indexed(app.framework.lines, "lines");
  const blocks = indexed(projection.blocks, "blocks"), points = indexed(projection.points, "points");
  const sources = indexed(projection.sources, "sources"), evidence = indexed(app.framework.evidence, "evidence");
  const exact = indexed(locators, "locators", "point_id");
  requireValue(lines.size && points.size && blocks.size === lines.size && exact.size === points.size,
    "incomplete line, point or locator coverage");
  requireValue(equal(projection.reports, [report]), "projected report differs from APP-FINAL");
  requireValue(text(projection.fingerprint), "missing projection fingerprint");
  requireValue(equal(projection.points, reuse.points), "projected points differ from the authored reuse points");
  for (const key of ["interview_questions", "visual_sources"])
    requireValue(equal(projection[key], reuse[key]), key + " differ from the authored reuse data");

  const goals = indexed(reuse.organizational_goals, "goals", "legacy_line_id");
  const controls = indexed(reuse.control_objectives, "control objectives"), assignments = new Map();
  for (const control of controls.values()) {
    requireValue(control.report_id === report.id && text(control.text) && text(control.title) &&
      Array.isArray(control.legacy_line_ids) && control.legacy_line_ids.length, "incomplete control objective");
    for (const id of control.legacy_line_ids) {
      requireValue(lines.has(id) && !assignments.has(id), "unknown or ambiguous control objective assignment");
      assignments.set(id, control);
    }
  }
  requireValue(goals.size === lines.size && assignments.size === lines.size, "every line needs an authored goal and control objective");
  for (const [id, line] of lines) {
    const block = blocks.get(id), goal = goals.get(id);
    requireValue(line.report_id === report.id && block?.report_id === report.id && equal(block.line, line),
      "projected line differs from APP-FINAL: " + id);
    requireValue(block.criterion?.text === line.criterion?.text && text(line.criterion?.text), "changed or missing norm: " + id);
    requireValue(goal?.report_id === report.id && text(goal.text), "missing authored goal: " + id);
    requireValue(text(line.risk?.text) && text(line.control?.text), "missing risk or control: " + id);
    requireValue(assignments.get(id).text !== line.control.text, "control objective duplicates the control: " + id);
    const validRefs = value => Array.isArray(value?.evidence_ids) && value.evidence_ids.every(ref => evidence.has(ref));
    requireValue(Array.isArray(line.relationships) && line.relationships.every(validRefs), "missing or unresolved source relationships: " + id);
    requireValue(["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"]
      .every(key => validRefs(line[key])) && line.controlStatus && Object.values(line.controlStatus).every(validRefs),
    "incomplete or unresolved source evidence shape: " + id);
  }

  requireValue(Array.isArray(app.source?.pages) && app.source.pages.length, "missing source pages");
  requireValue(app.source.pages.every((page, i) => page.page === i + 1 && typeof page.text === "string"), "invalid physical pages");
  const pages = indexPages(app.source.pages), chars = Array.from(pages.map(page => page.text).join(""));
  function passage(value) {
    requireValue(value?.locator_status === "EXACT" && value.source_hash === report.source_hash &&
      Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end) && value.start >= 0 &&
      value.end > value.start && value.end <= chars.length &&
      chars.slice(value.start, value.end).join("") === value.quote, "nonliteral source passage");
    const touched = pages.filter(page => page.end > value.start && page.start < value.end && page.end > page.start);
    requireValue(value.page === touched[0]?.page && (value.page_end ?? value.page) === touched.at(-1)?.page,
      "source passage page boundaries differ");
  }
  for (const source of sources.values()) {
    requireValue(source.report_id === report.id, "foreign source material");
    passage(source);
  }
  const covered = new Set();
  for (const [id, point] of points) {
    requireValue(point.report_id === report.id && lines.has(point.legacy_line_id) && text(point.text) && text(point.title), "invalid point: " + id);
    covered.add(point.legacy_line_id);
    requireValue(text(point.source_context?.report) && text(point.source_context?.local), "missing point context: " + id);
    for (const phases of [point.phases, ...(point.generic_variant ? [point.generic_variant.phases] : [])]) {
      requireValue(phases && ["opzet", "bestaan", "werking"].every(name => phases[name]) &&
        Object.keys(phases).every(name => ["opzet", "bestaan", "werking", "onderzoek"].includes(name)), "missing or unknown phase status: " + id);
      for (const phase of Object.values(phases)) requireValue(
        phase.status === "NOT_SELECTED" && text(phase.reason) || phase.status === "APPLICABLE" &&
          text(phase.procedure) && typeof phase.evidence === "string" && text(phase.boundary), "incomplete authored phase: " + id);
    }
    const locator = exact.get(id);
    requireValue(locator?.report_id === report.id && locator.source_hash === report.source_hash && locator.pdf_hash === report.pdf_hash,
      "locator belongs to a different source: " + id);
    requireValue(Array.isArray(point.source_links) && point.source_links.length && Array.isArray(point.context_source_links), "missing point links: " + id);
    const links = [...point.source_links, ...point.context_source_links];
    // The same evidence can support a proposal and qualify its parent. Preserve
    // both roles and their order, rather than deduplicating by evidence identity.
    requireValue(Array.isArray(locator.relations) && links.length === locator.relations.length, "incomplete point relations: " + id);
    for (const [index, link] of links.entries()) {
      const material = sources.get(link.material_id), relation = locator.relations[index], source = evidence.get(link.evidence_id);
      requireValue(material?.evidence_ids?.includes(link.evidence_id) && relation && source, "unresolved point evidence: " + id);
      requireValue(Object.entries(link).every(([key, value]) => equal(relation[key], value)), "changed point relation: " + id);
      passage(relation);
      requireValue(["quote", "start", "end", "page"].every(key => relation[key] === source[key]) &&
        (relation.page_end ?? relation.page) === (source.page_end ?? source.page), "locator differs from APP-FINAL evidence: " + id);
    }
  }
  requireValue(covered.size === lines.size, "a report line has no selectable point");
  const questions = indexed(reuse.interview_questions, "questions");
  for (const question of questions.values()) requireValue(text(question.text) && Array.isArray(question.point_ids) &&
    question.point_ids.length && question.point_ids.every(id => points.has(id)), "unresolved interview question");
  for (const locator of exact.values()) requireValue(equal(locator.question_ids,
    [...questions.values()].filter(q => q.point_ids.includes(locator.point_id)).map(q => q.id)), "changed question links");
  for (const visual of indexed(reuse.visual_sources, "visuals").values()) requireValue(
    visual.report_id === report.id && visual.pdf_hash === report.pdf_hash &&
    (visual.supports_point_ids ?? []).every(id => points.has(id)) &&
    (visual.context_line_ids ?? []).every(id => lines.has(id)), "foreign or unresolved visual context");

  // Preserve additional authored fields (including limitations and qualifiers).
  // These are data copies, not a new independently approved content edition.
  const additions = structuredClone({ corpus: [app], catalogue: projection, locators,
    organizational_goals: reuse.organizational_goals, control_objectives: reuse.control_objectives,
    interview_questions: reuse.interview_questions, visual_sources: reuse.visual_sources });
  return { additions, catalogue: { ...additions.catalogue,
    interview_questions: additions.interview_questions, visual_sources: additions.visual_sources } };
}
