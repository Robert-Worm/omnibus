// NEW fictitious dossiers only. Every reviewer, reading and owner receipt is a
// software-test simulation, not an attestation about real people or sources.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceRuntimeFixture } from "./local-source-runtime-fixture.mjs";
import { prepareCorrectionBrowserBase } from "./correction-browser-base.mjs";
import { createReviewManifest } from "../review-change-set.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const put = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
function authorSyntheticVersion(f, version) {
  f.manifest.package.version = `synthetic-correction-${version}`;
  const cat = f.read("CATALOGUE.json"), reason = "Synthetische afhankelijkheid; geen echte inhoudelijke goedkeuring.";
  // The second norm has its own unchanged chain, with an explicit dependency on
  // the first norm. It therefore needs a fresh review despite equal own text.
  cat.objectives.push({ ...structuredClone(cat.objectives[0]), id: "O2", title: "Afhankelijke fictieve behandeling" });
  cat.criteria.push({ ...structuredClone(cat.criteria[0]), id: "C2", objective_ids: ["O2"],
    depends_on_criterion_ids: ["C1"], composition_rationale: reason });
  cat.points.push({ ...structuredClone(cat.points[0]), id: "K2", criterion_id: "C2", objective_ids: ["O2"] });
  cat.source_dispositions[0].point_ids.push("K2");
  for (const point of cat.points) point.phase_plans.bestaan = { status: "APPLICABLE", action: "Bekijk één fictieve melding.",
    expected_evidence: "Fictieve registratie", interpretation_boundary: "Alleen bestaan", reason };
  if (version === 2) cat.objectives[0].control_measure = "De fictieve beheerder registreert bij ontvangst de behandelaar, datum en uitkomst.";
  f.set("CATALOGUE.json", cat);
  for (const role of ["SOURCE", "LEGAL", "PRACTICAL"]) {
    const review = f.read(`reviews/${role}.json`);
    review.synthetic = true; review.test_version = version;
    for (const [oldId, newId] of [["O1", "O2"], ["C1", "C2"], ["K1", "K2"]])
      review.object_reviews.push({ ...structuredClone(review.object_reviews.find(item => item.id === oldId)), id: newId, reason });
    f.set(`reviews/${role}.json`, review);
  }
  const pdf = f.paths.get("source/source.pdf"), bank = f.read("RECONCILED-SOURCE.json");
  const basis = { format: "omnibus-review-basis", schemaVersion: 1, scopeId: "synthetic-source-correction",
    inventoryComplete: true, rubricVersion: "synthetic-1", protocolVersion: "synthetic-1", context: { synthetic: true },
    sources: [{ id: f.manifest.package.id, version: "synthetic-source-edition-1", context: cat.context,
      applicability: { scope: cat.context.applicability }, hold: { active: false },
      documents: [{ id: pdf.id, version: "synthetic-source-edition-1", sha256: pdf.sha256 }],
      items: cat.criteria.map(criterion => {
        const objective = cat.objectives.find(item => item.id === criterion.objective_ids[0]);
        return { id: criterion.id, norm: criterion.text, doel: cat.goals[0].text, risico: objective.risk,
          beheersdoelstelling: objective.text, beheersmaatregel: objective.control_measure,
          context: { criterion, objective }, applicability: { scope: cat.context.applicability }, hold: { active: false },
          toetspunten: cat.points.filter(point => point.criterion_id === criterion.id).map(point => ({ ...point,
            opzet: point.phase_plans.opzet.action, bestaan: point.phase_plans.bestaan.action })),
          passages: bank.records[0].source_spans.map((span, i) => ({ id: "P" + i, documentId: pdf.id,
            documentVersion: "synthetic-source-edition-1", documentSha256: pdf.sha256,
            text: span.quote, location: { page: span.page, start: span.start, end: span.end }, context: bank.records[0].assertion })),
          dependencies: (criterion.depends_on_criterion_ids ?? []).map(itemId => ({ sourceId: f.manifest.package.id, itemId })),
          evidence: { complete: true, gaps: [] } };
      }) }] };
  // Freeze before the shared fixture simulates the normal source-specific
  // reviews/custody. Never retrofit a new hash to a retained receipt.
  f.set("CORRECTION-BASIS.json", basis);
  const reviewBasis = f.read("REVIEW-BASIS.json");
  reviewBasis.target_hashes["CORRECTION-BASIS.json"] = f.paths.get("CORRECTION-BASIS.json").sha256;
  f.set("REVIEW-BASIS.json", reviewBasis);
}

function reviewed(f, version) {
  const basis = f.read("CORRECTION-BASIS.json"), manifest = createReviewManifest(basis);
  const packageReviews = f.manifest.files.filter(file => file.roles.includes("review"))
    .map(file => ({ fileId: file.id, sha256: file.sha256 }));
  manifest.reviews = manifest.sources.flatMap(source => source.items.map(item => ({ sourceId: source.sourceId,
    itemId: item.itemId, itemHash: item.itemHash, hashVersion: manifest.hashVersion,
    reviewId: `synthetic-${version}-${item.itemId}`, sourceVerified: true, coverageComplete: true,
    unresolvedQuestions: [], packageReviews, synthetic: true })));
  return { basis, manifest };
}

export async function correctionWorkflowFixture(t, { configureAfter = () => {}, kind = "framework", browser = false } = {}) {
  mkdirSync(join(root, "work"), { recursive: true });
  const dir = mkdtempSync(join(root, "work", "source-correction-"));
  const prior = Object.fromEntries(["TMP", "TEMP", "TMPDIR"].map(key => [key, process.env[key]]));
  for (const key of Object.keys(prior)) process.env[key] = dir;
  let before, after;
  const author = kind === "report" ? authorReportVersion : authorSyntheticVersion;
  try {
    before = await sourceRuntimeFixture(t, kind, f => author(f, 1));
    after = await sourceRuntimeFixture(t, kind, f => { author(f, 2); configureAfter(f); });
  } finally {
    for (const [key, value] of Object.entries(prior)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (browser) prepareCorrectionBrowserBase(before);
  const old = reviewed(before, 1), current = reviewed(after, 2);
  const correction = { previousBasis: old.basis, previousManifest: old.manifest, currentBasis: current.basis,
    currentManifest: current.manifest, notes: [
      { sourceId: "FICTIEF", itemId: "C1", summary: "De maatregel benoemt nu de beheerder, behandelaar, ontvangstdatum en uitkomst." },
      { sourceId: "FICTIEF", itemId: "C2", summary: "De afhankelijkheid van C1 is opnieuw beoordeeld; de eigen norm en keten zijn ongewijzigd." }] };
  if (kind === "report") correction.notes = [{ sourceId: "FICTIEF", itemId: "K1", summary: "De fictieve maatregel benoemt nu de ontvangstdatum." }];
  const correctionPath = join(dir, "correction.json"); put(correctionPath, correction);
  const fixture = { synthetic: true, dir, before, after, correction, correctionPath };
  put(join(dir, "paths.json"), { synthetic: true, correction: correctionPath,
    beforePlan: before.options.plan, afterPlan: after.options.plan, beforeBase: before.options.base });
  return fixture;
}

function authorReportVersion(f, version) {
  f.manifest.package.version = "synthetic-correction-" + version;
  const app = f.read("APP-FINAL.json"), line = app.framework.lines[0];
  if (version === 2) line.control.text += " Leg ook de ontvangstdatum vast.";
  f.set("APP-FINAL.json", app);
  const projection = f.read("REUSE-VIEWER-PROJECTION.json");
  projection.blocks[0].line = structuredClone(line); f.set("REUSE-VIEWER-PROJECTION.json", projection);
  for (const role of ["SOURCE", "PRACTICAL"]) {
    const review = f.read("reviews/" + role + ".json");
    review.synthetic = true; review.test_version = version; f.set("reviews/" + role + ".json", review);
  }
  const originals = f.manifest.files.filter(file => file.roles.includes("source"));
  const document = originals[0], edition = "synthetic-source-edition-1";
  const basis = { format: "omnibus-review-basis", schemaVersion: 1, scopeId: "synthetic-report-correction",
    inventoryComplete: true, rubricVersion: "synthetic-1", protocolVersion: "synthetic-1", context: { synthetic: true },
    sources: [{ id: f.manifest.package.id, version: edition, context: { synthetic: true },
      applicability: { scope: "Alleen fictieve meldingen" }, hold: { active: false },
      documents: originals.map(file => ({ id: file.id, version: edition, sha256: file.sha256 })),
      items: [{ id: line.id, norm: line.criterion.text, doel: line.objective.text, risico: line.risk.text,
        beheersdoelstelling: f.read("REUSE-CANDIDATE.json").control_objectives[0].text, beheersmaatregel: line.control.text,
        context: { line }, applicability: { scope: "Alleen fictieve meldingen" }, hold: { active: false },
        toetspunten: [{ id: "K1/TP01", text: line.criterion.text, opzet: line.procedure.text, bestaan: "Bekijk één fictieve registratie." }],
        passages: app.framework.evidence.map(e => ({ id: e.id, documentId: document.id, documentVersion: edition,
          documentSha256: document.sha256, text: e.quote, location: { page: e.page, start: e.start, end: e.end }, context: line.exportContext })),
        dependencies: [], evidence: { complete: true, gaps: [] } }] }] };
  f.set("CORRECTION-BASIS.json", basis);
  const reviewBasis = f.read("REVIEW-BASIS.json"); reviewBasis.files["CORRECTION-BASIS.json"] = f.paths.get("CORRECTION-BASIS.json").sha256;
  f.set("REVIEW-BASIS.json", reviewBasis);
}
