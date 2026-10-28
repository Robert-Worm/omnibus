// Synthetic local-owner trial only; no real source, reading or admission.
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { sourceMethodFixture } from "./local-source-method-fixture.mjs";
import { hashBytes } from "./local-source-review-fixture.mjs";
import { prepareIntake } from "../intake.mjs";
import { runtimeFixture } from "../../local-data/test-support/runtime-fixture.mjs";
import { CatalogueRepository } from "../../local-data/repository.mjs";
import { readRuntimePublication, publishRuntime } from "../../local-data/runtime-publication.mjs";
import { prepareWebResources } from "../../local-data/web-resources.mjs";
import { runtimeContractHash } from "../../lib/runtime-contract-identity.mjs";
import { syntheticFrameworkQuestions } from "./local-framework-questions.mjs";
import { syntheticReportQuestions } from "./local-report-questions.mjs";

export async function sourceRuntimeFixture(t, kind = "report", configure = () => {}) {
  const f = sourceMethodFixture(kind, f => {
    if (kind === "report") { const projection = f.read("REUSE-VIEWER-PROJECTION.json");
      projection.status = "SYNTHETIC_REVIEWED"; f.set("REUSE-VIEWER-PROJECTION.json", projection);
      const cat = f.read("CATALOGUE.json"); cat.process_mappings[0].process_id = "PR12"; f.set("CATALOGUE.json", cat);
      f.set("TAXONOMY-SNAPSHOT.json", { processes: { PR12: { title: "Besturing en risicomanagement" } } }); }
    else {
      const cat = f.read("CATALOGUE.json"), reason = "Fictieve afleiding; geen echte beoordeling.";
      cat.context = { title: f.manifest.package.title, intro: "Fictief kader voor meldingen.", edition: "Testuitgave", kind: "framework",
        applicability: "Uitsluitend fictieve meldingen.", kind_label: "Fictief lokaal kader", coverage: "Drie fictieve pagina's.",
        source_explanation: "Fictieve softwaretestbron, geen publicatie.", status: "UNKNOWN", effective_from: "", as_of: "2026-01-01",
        audience: ["Testorganisatie"], use_cases: ["Software testen"], limitations: [{ title: "Test", text: reason }] };
      cat.goals = [{ id: "G1", title: "Afhandeling", text: "Meldingen bereiken de verantwoordelijke.", basis: "ANALYST_PROPOSAL", rationale: reason, source_record_ids: ["R1"] }];
      cat.objectives = [{ id: "O1", title: "Behandelaar bekend", text: "Iedere melding heeft een herkenbare behandelaar.", basis: "ANALYST_PROPOSAL", rationale: reason,
        goal_ids: ["G1"], risk: "Meldingen blijven liggen.", risk_basis: "ANALYST_PROPOSAL", source_record_ids: ["R1"],
        control_measure: "Wijs bij ontvangst een behandelaar aan.", control_measure_basis: "ANALYST_PROPOSAL", control_measure_rationale: reason }];
      cat.criteria[0].objective_ids = ["O1"];
      Object.assign(cat.points[0], { objective_ids: ["O1"], selection_status: "SELECTABLE", chapter: "Fictieve afhandeling",
        addressees: [{ label: "Testorganisatie", role: "NORM_ADDRESSEE", condition: "Bij ontvangst" }], exceptions: ["Geen echte verplichting."] });
      f.set("CATALOGUE.json", cat);
      f.set("SOURCE-STATUS.json", { ...f.read("SOURCE-STATUS.json"), official_url: "https://example.invalid/framework", publication_rights: "Fictieve testinhoud." });
      for (const role of ["SOURCE", "LEGAL", "PRACTICAL"]) {
        const review = f.read(`reviews/${role}.json`);
        review.object_reviews.push(...["G1", "O1"].map(id => ({ id, decision: "APPROVE", reason })));
        f.set(`reviews/${role}.json`, review);
      }
    }
    configure(f);
    if (kind === "report") {
      const reuse=f.read("REUSE-CANDIDATE.json");
      syntheticReportQuestions(f.read("APP-FINAL.json").framework,reuse);
      f.set("REUSE-CANDIDATE.json",reuse);
    }
    if (kind === "framework") {
      const cat = f.read("CATALOGUE.json");
      syntheticFrameworkQuestions(cat, f.read("RECONCILED-SOURCE.json"), f.paths.get("source/source.pdf").sha256);
      f.set("CATALOGUE.json", cat);
    }
  });
  f.set("owner-observation.txt", "Fictieve waarneming voor softwaretests; geen echte vrijgave.");
  const dir = mkdtempSync(join(tmpdir(), "omnibus-local-viewer-")), input = join(dir, "input"); mkdirSync(input);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const save = (name, value) => { const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n");
    writeFileSync(join(dir, name), bytes); return hashBytes(bytes); };
  for (const file of f.manifest.files) {
    const path = join(input, file.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, f.files.get(file.id));
  }
  save("input/plan.json", { format: "omnibus-intake-plan", schemaVersion: 1, package: f.manifest.package, contract: f.manifest.contract,
    files: f.manifest.files.map(({ id, path, roles }) => ({ id, path, roles })) });
  const intake = await prepareIntake(join(input, "plan.json"), join(input, "intake.json"));
  const receipt = { format: "omnibus-local-owner-admission", schemaVersion: 1, scope: "local-database-only",
    ownerId: "synthetic-owner", decidedAt: "2026-01-02T00:00:00.000Z", decision: "ADMIT", package: f.manifest.package,
    intakeSha256: intake.manifestSha256, basisHash: f.hash("REVIEW-BASIS.json"), authorIds: f.authorIds,
    verificationEvidenceIds: [f.paths.get("owner-observation.txt").id],
    confirmations: { reviewerIndependence: true, actualSourceReading: true, sourceFidelity: true }, unresolvedIssues: [] };
  const admission = { file: "admission.json", sha256: save("admission.json", receipt) };
  save("packages.json", { format: "omnibus-local-database", schemaVersion: 1, packages: [{ intake: "input/intake.json",
    sha256: intake.manifestSha256, authorIds: f.authorIds, sourceEvidence: f.proof, admission }] });
  const baseline = runtimeFixture(t), writer = new CatalogueRepository(baseline.databasePath);
  let publication;
  try {
    const content = readRuntimePublication(writer, { ...baseline, contract: runtimeContractHash });
    const empty = { version: "synthetic", content_hash: "a".repeat(64), corpus: [], themes: [], researchPresets: [], researchGroups: [],
      scopeSnapshots: {}, scopeDecisions: {}, catalogue: { fingerprint: "synthetic", reports: [], blocks: [], points: [], sources: [] },
      organizational_goals: [], control_objectives: [], interview_questions: [], visual_sources: [], locators: [], process_mappings: [] };
    for (const id of ["app/trial-corpus.json", "app/reviewed-reports.json", "app/report-additions.json"]) content.modules[id] = structuredClone(empty);
    const nav = { legacyThemes: [], discoveryViews: [], themes: [], reportViews: [], workspaces: [], foundationSummaries: {}, reportSummaries: {} };
    content.refs = prepareWebResources(writer, baseline.release, { catalogue: nav });
    content.routing = { reports: {}, workspaces: {} }; content.summary = { reports: 0, pages: 0 };
    content.modules["lib/application-catalogue.mjs"] = { routing: content.routing, ref: content.refs.catalogue };
    content.modules["lib/topical-reviewed.json"] = { packages: [] };
    content.modules["lib/model-library.mjs"] = { models: [] };
    publication = publishRuntime(writer, content, { release: baseline.release, contract: runtimeContractHash });
  } finally { writer.close(); }
  save("base.json", { database: baseline.databasePath, release: baseline.release, publication });
  return { ...f, dir, inputRoot: input, baseline, receipt, save, options: { plan: join(dir, "packages.json"), base: join(dir, "base.json"), out: join(dir, "new") } };
}
