// Explicitly fictitious envelope tests. These are NOT completed extraction
// dossiers, source readings or admission receipts, and must remain HOLD.
import { createHash } from "node:crypto";
export const hashBytes = bytes => createHash("sha256").update(bytes).digest("hex");
const encoded = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value));

export function sourceReviewFixture(kind, prefix = "payload") {
  const report = kind === "report", files = new Map(), paths = new Map();
  const manifest = { format: "omnibus-intake", schemaVersion: 1,
    package: { id: "FICTIEF", kind, version: "synthetic-1", title: "Fictief dossier; geen brongoedkeuring" },
    contract: report ? "report-kit-1.1" : "framework-cio-0.1+addendum-01", files: [] };
  const set = (name, value, roles = ["supporting"]) => {
    const bytes = encoded(value), existing = paths.get(name);
    const file = { id: existing?.id ?? "f" + files.size, path: prefix ? prefix + "/" + name : name,
      roles: existing?.roles ?? roles, bytes: bytes.length, sha256: hashBytes(bytes) };
    if (existing) manifest.files[manifest.files.indexOf(existing)] = file;
    else manifest.files.push(file);
    paths.set(name, file); files.set(file.id, bytes);
  };
  const read = name => JSON.parse(files.get(paths.get(name).id));
  set(report ? "CONTRACT.md" : "CONTRACT.txt", "Fictief contract voor softwaretests.", ["contract"]);
  const pdfName = report ? "source.pdf" : "source/source.pdf";
  set(pdfName, "%PDF Fictieve bytes, geen werkelijk document.", ["source"]);
  const sourceText = "Fictieve bron 😀é\r\nTweede regel.\r\n";
  set(report ? "source.txt" : "source/pages.json", report ? sourceText : [{ page: 1, text: sourceText }], ["source-text"]);
  set("RECONCILED-SOURCE.json", { author_agent: "synthetic-reconciler", records: [{ id: "R1", text: "Fictief bronrecord." }] }, ["source-bank"]);
  const item = { id: "K1", title: "Fictieve norm", source_links: [{ record_id: "R1" }] };
  set("CATALOGUE.json", report ? { author_agent: "synthetic-author", process_mappings: [] }
    : { author_agent: "synthetic-author", source_identity: { source_id: "FICTIEF" },
      goals: [], objectives: [], criteria: [], points: [item] }, ["catalogue", "context", "limitations"]);
  if (report) {
    set("APP-FINAL.json", { framework: { report: { id: "FICTIEF", title: manifest.package.title }, lines: [item] } }, ["viewer-content"]);
    set("APP-SOURCE-LINKS.json", { links: [{ line_id: "K1", record_ids: ["R1"] }] }, ["source-links"]);
    set("INCLUSION-DECISIONS.json", { decisions: [] });
    set("SOURCE.json", { text_sha256: paths.get("source.txt").sha256, pdf_sha256: paths.get(pdfName).sha256 });
    for (const name of ["INPUT-FREEZE.json", "FIRST-SUBMISSIONS.json", "ISSUES.json", "REPAIRS.json",
      "audit-draft-review.json", "REVIEW-CONTRACT.json", "TAXONOMY-SNAPSHOT.json", "RECONCILIATION-LOG.json",
      ...["extractor", "inventory"].flatMap(role => ["result.json", "READ-LOG.json", "VISUAL-EVIDENCE.json"]
        .map(name => role + "/output/" + name))]) set(name, { synthetic: true });
    set("AUTHORING.json", { author_agent: "synthetic-author" });
    set("receipt.json", { synthetic: true, decision: "HOLD" }, ["receipt"]);
  } else {
    set("CONTRACT-ADDENDUM-01.txt", "Fictief contractaddendum.", ["contract"]);
    for (const name of ["SOURCE-MANIFEST.json", "SOURCE-STATUS.json", "ISSUES.json", "RECONCILIATION.json"])
      set(name, { synthetic: true });
    set("MIGRATION.json", { synthetic: true, mappings: [] }, ["migration"]);
    paths.get("CATALOGUE.json").roles.push("source-links");
  }
  const dependencies = [...paths].filter(([name]) => !["source.pdf", "receipt.json"].includes(name));
  const basis = report ? { files: Object.fromEntries(dependencies.map(([name, file]) => [name, file.sha256])),
    source_pdf_sha256: paths.get(pdfName).sha256, source_contract: "4.22", human_validation: false }
    : { target_hashes: Object.fromEntries(dependencies.map(([name, file]) => [name, file.sha256])) };
  set("REVIEW-BASIS.json", basis, ["review-basis"]);
  const targets = report ? Object.fromEntries(["APP-FINAL.json", "CATALOGUE.json", "RECONCILED-SOURCE.json",
    "INCLUSION-DECISIONS.json", "APP-SOURCE-LINKS.json", "REVIEW-BASIS.json"].map(name => [name, paths.get(name).sha256]))
    : { ...basis.target_hashes, "REVIEW-BASIS.json": paths.get("REVIEW-BASIS.json").sha256 };
  // Review schemas copied from the unchanged contract; no actual source review.
  const aspects = report ? {
    SOURCE: ["literal_fidelity", "attribution_and_scope", "counterevidence", "link_support"],
    PRACTICAL: ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"],
  } : {
    SOURCE: ["fidelity", "addressee_scope", "conditions_exceptions", "link_support"],
    LEGAL: ["addressee", "modality", "applicability", "composition_and_status"],
    PRACTICAL: ["independent_judgment", "phase_usability", "grouping", "reuse_semantics"],
  };
  for (const [role, keys] of Object.entries(aspects)) set(`reviews/${role}.json`, {
    [report ? "review_kind" : "review_role"]: role, reviewer_agent: "synthetic-reviewer-" + role,
    decision: "APPROVE", human_validation: false, unresolved_issues: [], target_hashes: targets,
    [report ? "item_reviews" : "object_reviews"]: [{ id: "K1", decision: "APPROVE",
      [report ? "assessment" : "reason"]: "Fictieve beoordeling; alleen een technische proef.",
      ...(report ? {} : { link_count: 1 }),
      [report ? "field_assessments" : "aspects"]: Object.fromEntries(keys.map(key => [key, "Fictief, niet inhoudelijk gereviewd."])) },
    ...(!report && role === "SOURCE" ? [{ id: "R1", decision: "APPROVE", reason: "Fictieve bronbeoordeling." }] : [])],
  }, ["review"]);
  return { manifest, files, paths, set, read, authorIds: ["synthetic-author"] };
}
