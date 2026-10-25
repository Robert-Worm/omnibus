// Reuse the CIO-shaped, multi-source viewer already used by Topical packages.
// Copy authored data and exact spans; never flatten actor/condition relationships
// or manufacture a missing control chain, legal status or review decision.
import { digest } from "../local-data/repository.mjs";
import { lawReaderPassages } from "../lib/law-source-reader.mjs";
import { validateFlatFoundationChain } from "../lib/admitted-foundation.mjs";

const need = (ok, message) => { if (!ok) throw Error("Framework viewer: " + message); };
const text = value => typeof value === "string" && Boolean(value.trim());
const strings = value => Array.isArray(value) && value.every(text);

export function projectLocalFrameworkViewer({ catalogue, bank, pages, status, pdfHash, reviewBasis, title }) {
  const context = catalogue.context, id = catalogue.source_identity.source_id;
  need(context && ["title", "intro", "edition", "applicability", "kind_label", "coverage", "source_explanation", "status", "as_of"]
    .every(key => text(context[key])) && context.title === title, "reviewed catalogue.context is incomplete");
  need(["EFFECTIVE", "FUTURE", "UNKNOWN"].includes(context.status) && typeof context.effective_from === "string", "missing explicit source status");
  need(["law", "framework", "audit"].includes(context.kind), "missing reviewed catalogue category");
  need(strings(context.audience) && context.audience.length && strings(context.use_cases) && context.use_cases.length &&
    Array.isArray(context.limitations) && context.limitations.every(row => text(row.title) && text(row.text)), "missing About context");
  need(typeof status.official_url === "string" && (!status.official_url || status.official_url.startsWith("https://")) &&
    text(status.publication_rights), "missing reviewed source URL/rights");
  need(pages.length && pages.every((p, i) => p.page === i + 1 && typeof p.text === "string"), "invalid physical source pages");
  need(/^[a-f0-9]{64}$/.test(pdfHash) && /^[a-f0-9]{64}$/.test(reviewBasis), "missing exact source/review identity");
  for (const record of bank.records) need(lawReaderPassages(pages, record.source_spans).length === record.source_spans.length,
    "unresolved literal source span");
  const objectives = new Map(catalogue.objectives.map(o => [o.id, o])), goals = new Map(catalogue.goals.map(g => [g.id, g]));
  for (const criterion of catalogue.criteria) {
    need(text(criterion.chapter), "missing reviewed norm group");
    if (catalogue.points.some(p => p.criterion_id === criterion.id && p.selection_status === "SELECTABLE"))
      checkChain(criterion);
  }
  for (const point of catalogue.points) {
    need(text(point.chapter), "missing reviewed point group");
    if (point.selection_status !== "SELECTABLE") continue;
    checkChain(point);
  }
  function checkChain(row) {
    need(row.objective_ids.length, "selectable norm or point has no reviewed control objective");
    for (const objectiveId of row.objective_ids) {
      const objective = objectives.get(objectiveId);
      need(objective?.goal_ids?.length, "selectable point has no reviewed goal");
      validateFlatFoundationChain([{ id: row.id, auditRole: "norm", reviewStatus: "ai-reviewed",
        objective: objective.goal_ids.map(id => goals.get(id)?.text ?? "").join("\n\n"),
        risk: objective.risk, controlObjective: objective.text, control: objective.control_measure }]);
      need(objective.goal_ids.every(id => text(goals.get(id)?.text)), "empty goal in a shared control chain");
      need(objective.control_measure_basis === "ANALYST_PROPOSAL" && text(objective.control_measure_rationale), "missing control proposal provenance");
    }
  }
  const documentId = id + "-main", textHash = digest(pages.map(p => p.text).join(""));
  return structuredClone({ id, family: "local-framework", reviewBasis, catalogue, bank, status,
    context: { ...context, documents: [{ id: documentId, role: title }] },
    manifest: { documents: [{ id: documentId, file: "source.pdf", first_package_page: 1, last_package_page: pages.length, pdf_sha256: pdfHash }] },
    documents: [{ id: documentId, sourceId: id, packageDocumentId: documentId, title, role: "main", pages,
      pdf_hash: pdfHash, source_sha256: textHash, url: status.official_url }],
    questionPlan: { subquestions: [] }, legacyRelations: [] });
}
