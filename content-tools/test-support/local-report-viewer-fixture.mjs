// Entirely fictitious authoring and reviews. Never an admission or real source.
import { sourceReviewFixture } from "./local-source-review-fixture.mjs";
import { refreshSyntheticReviewHashes } from "./local-source-passages-fixture.mjs";
import { reportViewerFiles } from "../local-report-viewer.mjs";

export function reportViewerFixture() {
  const f = sourceReviewFixture("report"), app = f.read("APP-FINAL.json"), line = app.framework.lines[0];
  const report = app.framework.report, evidence = app.framework.evidence[0];
  report.year = 2026;
  line.relationships = [];
  for (const status of Object.values(line.controlStatus)) status.evidence_ids = [];
  app.framework.limitations = ["Fictieve historische situatie; geen huidige tekortkoming vastgesteld."];
  for (const [key, value] of Object.entries({ objective: "Meldingen tijdig afhandelen.", risk: "Een melding blijft onbehandeld.",
    control: "Wijs een behandelaar aan en leg het besluit vast.", criterion: "Voor een melding is een behandelaar aangewezen.",
    auditQuestion: "Hoe wordt een melding afgehandeld?", procedure: "Volg een gekozen melding tot het besluit. Doorvraag: wie besloot?" })) line[key].text = value;
  for (const key of ["objective", "risk", "control", "criterion", "auditQuestion", "procedure", "finding", "owner"])
    Object.assign(line[key], { reason: "Fictief analysevoorstel met beperkte reikwijdte.",
      basis: key === "finding" ? "EXPLICIT" : key === "risk" ? "INFERRED" : key === "owner" ? "NOT_ESTABLISHED" : "PROPOSED" });
  line.finding.reason += " " + line.exportContext;
  const source = { ...evidence, id: "FICTIEF-M1", source_hash: report.source_hash,
    evidence_ids: [evidence.id], locator_status: "EXACT" };
  const link = { material_id: source.id, evidence_id: evidence.id, role: "MOTIVATES_PROPOSAL" };
  const absent = { status: "NOT_SELECTED", reason: "Niet afzonderlijk uitgewerkt in dit fictieve pakket." };
  const point = { id: "K1/TP01", legacy_line_id: line.id, report_id: report.id, title: "Behandelaar voor een melding",
    text: line.criterion.text, source_links: [link], context_source_links: [], variant_available: false,
    source_context: { report: app.framework.limitations[0], local: "Alleen bij een melding." },
    goal_review: "RETAINED_CHAIN_CONTEXT", review_status: "SYNTHETIC_NOT_ADMITTED", human_validation: false,
    qualifier_checks: [{ meaning: "Alleen bij een melding.", status: "SYNTHETIC" }],
    phases: { opzet: absent, bestaan: absent, werking: absent, onderzoek: { status: "APPLICABLE",
      procedure: line.procedure.text, evidence: "", boundary: "Alleen het gekozen geval; geen oordeel over een periode." } } };
  const question = { id: "FICTIEF-Q1", point_ids: [point.id], text: line.auditQuestion.text };
  const goal = { id: "FICTIEF-G1", legacy_line_id: line.id, report_id: report.id, ...line.objective };
  const control = { id: "FICTIEF-BD1", legacy_line_ids: [line.id], report_id: report.id, title: "Afhandeling bewaakt",
    text: "Elke melding heeft een herkenbare behandelaar.", basis: "PROPOSED", reason: "Fictieve risicoafleiding.", evidence_ids: [evidence.id] };
  const reuse = { points: [point], organizational_goals: [goal], control_objectives: [control], interview_questions: [question], visual_sources: [] };
  const projection = { fingerprint: "synthetic-projection", reports: [report], sources: [source], points: [point],
    blocks: [{ id: line.id, report_id: report.id, line, objective: control, criterion: line.criterion }],
    interview_questions: [question], visual_sources: [], status: "HOLD" };
  const locators = [{ point_id: point.id, report_id: report.id, source_hash: report.source_hash, pdf_hash: report.pdf_hash,
    question_ids: [question.id], relations: [{ ...source, ...link }] }];
  f.set("APP-FINAL.json", app);
  f.set(reportViewerFiles[0], reuse); f.set(reportViewerFiles[1], projection); f.set(reportViewerFiles[2], { locators });
  const basis = f.read("REVIEW-BASIS.json");
  for (const name of reportViewerFiles) basis.files[name] = f.paths.get(name).sha256;
  f.set("REVIEW-BASIS.json", basis); refreshSyntheticReviewHashes(f);
  return { ...f, input: { app, reuse, projection, locators } };
}
