import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareIntake } from "../intake.mjs";
import { prepareModelReview, REVIEW_ASPECTS } from "../model-quality.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const load = path => JSON.parse(readFileSync(path, "utf8"));

// All generated sources and receipts are explicitly fictitious and remain under work/.
export async function fixture(t, count = 1, editModel = () => {}) {
  const scratch = join(root, "work", "local-database-tests");
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, "case-"));
  t.after(() => {
    assert.equal(dirname(dir), scratch);
    rmSync(dir, { recursive: true, force: true });
  });
  const packages = [], plan = { format: "omnibus-local-database", schemaVersion: 1, packages: [] };
  for (let index = 0; index < count; index++) {
    const id = `SYNTHETIC_${index}`, folder = join(dir, id);
    mkdirSync(folder);
    const model = { id, kind: "own", version: "synthetic-1", source: "Fictieve testbron", selected: false,
      title: `Fictief model ${index}`, question: "Hoe werkt de fictieve oefening?", selection_status: "HOLD",
      limitations: "Uitsluitend testgegevens; geen inhoudelijke goedkeuring.",
      items: [{ id: "TEST", title: "Fictieve dimensie", definition: "Een verzonnen testbegrip.",
        question: "Hoe beschrijf je deze oefening?", probes: "", included: false,
        questions: [{ id: "TEST-1", title: "Fictieve vraag", question: "Hoe beschrijf je deze oefening?", probes: "", included: false, origin: "synthetic-test" }] }] };
    editModel(model);
    const source = "Fictieve testbron. Geen echt model. A😀é\r\nTweede regel.\r\n";
    writeFileSync(join(folder, "source.txt"), source);
    writeFileSync(join(folder, "contract.txt"), "Synthetic test of model-review-1; no real source approval.");
    save(join(folder, "model.json"), model);
    const basis = prepareModelReview(model, { sourceEvidence: [{ id: "source", sha256: hash(Buffer.from(source)) }] });
    // Receipt fabrication is confined to tests. The builder never creates or fixes reviews.
    const reviews = Object.entries(REVIEW_ASPECTS).map(([role, aspects]) => ({ role,
      actorId: `synthetic-test-reviewer-${role}`, basisHash: basis.basisHash, decision: "APPROVE", humanValidation: false,
      unresolvedIssues: [], assessments: basis.targets.map(target => ({ targetId: target.id, decision: "APPROVE",
        reason: "Synthetic receipt for a software test only.",
        aspects: Object.fromEntries(aspects.map(aspect => [aspect, "Fictitious test assessment; no substantive approval."])) })) }));
    save(join(folder, "basis.json"), basis);
    save(join(folder, "reviews.json"), reviews);
    const marker = join(dir, "executed.txt");
    writeFileSync(join(folder, "inert.mjs"), `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'DO NOT EXECUTE');`);
    const intakePlan = { format: "omnibus-intake-plan", schemaVersion: 1,
      package: { id, kind: "model", version: "synthetic-1", title: model.title }, contract: "model-review-1",
      files: [
        { id: "contract", path: "contract.txt", roles: ["contract"] },
        { id: "source", path: "source.txt", roles: ["source", "source-text"] },
        { id: "model", path: "model.json", roles: ["viewer-content", "context", "limitations"] },
        { id: "basis", path: "basis.json", roles: ["review-basis"] },
        { id: "reviews", path: "reviews.json", roles: ["review"] },
        { id: "inert", path: "inert.mjs", roles: ["supporting"] },
      ] };
    const intake = join(folder, "intake.json");
    save(join(folder, "plan.json"), intakePlan);
    const prepared = await prepareIntake(join(folder, "plan.json"), intake);
    plan.packages.push({ intake: `${id}/intake.json`, sha256: prepared.manifestSha256, authorIds: ["synthetic-test-author"] });
    packages.push({ id, folder, intake, model, source, basis, reviews });
  }
  const planPath = join(dir, "packages.json"), out = join(dir, "new-database");
  save(planPath, plan);
  return { dir, packages, plan, planPath, out, options: { plan: planPath, out }, savePlan: () => save(planPath, plan) };
}

// Negative tests may create a newly pinned fictitious envelope to reach deeper checks.
// This is never advice or code for repairing a received, rejected package.
export function repinFixture(f, index = 0) {
  const p = f.packages[index], manifest = load(p.intake);
  for (const file of manifest.files) {
    const bytes = readFileSync(join(p.folder, file.path));
    file.sha256 = hash(bytes); file.bytes = bytes.length;
  }
  save(p.intake, manifest);
  f.plan.packages[index].sha256 = hash(readFileSync(p.intake)); f.savePlan();
}

export async function admittedFixture(t, { editModel = () => {}, count = 1 } = {}) {
  const f = await fixture(t, count, model => { model.selection_status = "APPROVED"; editModel(model); });
  const p = f.packages[0], manifest = load(p.intake);
  const note = "Fictief verificatieverslag: geen echte bronlezing, onafhankelijkheid of inhoudelijke goedkeuring. Alleen softwaretest.";
  writeFileSync(join(p.folder, "owner-verification.txt"), note);
  manifest.files.push({ id: "owner-verification", path: "owner-verification.txt", roles: ["supporting"],
    bytes: Buffer.byteLength(note), sha256: hash(Buffer.from(note)) });
  save(p.intake, manifest); repinFixture(f);
  const admission = { format: "omnibus-local-owner-admission", schemaVersion: 1, scope: "local-database-only",
    ownerId: "synthetic-local-owner", decidedAt: "2026-10-25T12:00:00.000Z", decision: "ADMIT",
    package: manifest.package, intakeSha256: f.plan.packages[0].sha256, basisHash: p.basis.basisHash,
    authorIds: f.plan.packages[0].authorIds, verificationEvidenceIds: ["owner-verification"],
    confirmations: { reviewerIndependence: true, actualSourceReading: true, sourceFidelity: true }, unresolvedIssues: [] };
  const admissionPath = join(f.dir, "owner-admission.json");
  const saveAdmission = () => {
    save(admissionPath, admission);
    f.plan.packages[0].admission = { file: "owner-admission.json", sha256: hash(readFileSync(admissionPath)) };
    f.savePlan();
  };
  saveAdmission();
  return { ...f, admission, admissionPath, saveAdmission };
}
