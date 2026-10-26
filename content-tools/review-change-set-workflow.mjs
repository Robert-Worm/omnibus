// Read-only connection to the ordinary source-package gates. This is neither
// an importer nor a substitute for the pinned publication command.
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonical } from "./identity.mjs";
import { prepareCorrectionHandoff } from "./review-change-set.mjs";
import { checkLocalDatabase, localDatabaseLimits } from "./local-database.mjs";
import { localSourceSnapshot } from "./local-source-review.mjs";

const need = (ok, message) => { if (!ok) throw Error("Correction source gate: " + message); };
function bytes(file, expected) {
  need(statSync(file).isFile() && statSync(file).size <= localDatabaseLimits.jsonBytes, "input exceeds JSON byte limit");
  const value = readFileSync(file);
  need(value.length <= localDatabaseLimits.jsonBytes && (!expected || createHash("sha256").update(value).digest("hex") === expected), "input changed after ordinary package check");
  return value;
}
const json = value => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(value));
const sorted = values => [...values].sort((a, b) => a.fileId.localeCompare(b.fileId));
function noHold(value) {
  if (!value || typeof value !== "object") return;
  need(value.hold?.active !== true && ![value.status, value.selection_status, value.reviewStatus, value.decision]
    .some(status => ["HOLD", "REJECT", "REJECTED"].includes(status)), "offered content contains HOLD or rejection");
  for (const child of Object.values(value)) noHold(child);
}

async function checkedBasis(plan, basis, manifest) {
  // Reuse every normal intake, passage, relationship, reading/custody, review
  // and owner-receipt check. Never accept a cached check result from the caller.
  const checked = await checkLocalDatabase({ plan });
  const input = json(bytes(plan, checked.planSha256));
  need(input.packages.length === basis.sources.length && checked.sourceEvidence?.length === basis.sources.length,
    "the complete correction scope must match the report/framework plans");
  need(checked.ownerAdmissions?.length === input.packages.length, "each package needs its ordinary pinned local-owner admission");
  const result = [];
  for (const entry of input.packages) {
    const intakePath = resolve(dirname(plan), entry.intake), intake = json(bytes(intakePath, entry.sha256));
    const source = basis.sources.find(source => source.id === intake.package.id);
    need(source, "package is outside correction scope");
    const evidence = checked.sourceEvidence.find(item => item.packageId === source.id);
    need(evidence?.sourceMethodValidated && evidence.viewerShapeValidated, "complete source method and shared viewer shape required");
    // The manifest was validated by the ordinary reader; subsequent bytes must
    // still match its exact hash. Only JSON needed for this binding is read here.
    const basisFile = intake.files.find(file => file.roles.includes("review-basis"));
    const prefix = basisFile.path.slice(0, -"REVIEW-BASIS.json".length);
    const contentNames = ["CATALOGUE.json", ...(intake.package.kind === "report"
      ? ["APP-FINAL.json", "REUSE-VIEWER-PROJECTION.json"] : ["SOURCE-STATUS.json"])];
    const required = new Set([basisFile.id, ...intake.files.filter(file => file.roles.includes("review") ||
      ["CORRECTION-BASIS.json", ...contentNames].some(name => file.path === prefix + name)).map(file => file.id)]);
    const files = new Map(intake.files.filter(file => required.has(file.id))
      .map(file => [file.id, bytes(resolve(dirname(intakePath), file.path), file.sha256)]));
    const { read, lookup } = localSourceSnapshot(intake, files);
    contentNames.forEach(name => noHold(read(name)));
    const frozen = read("REVIEW-BASIS.json"), binding = lookup("CORRECTION-BASIS.json");
    need(binding.file.roles.includes("supporting"), "correction basis must be retained as supporting evidence");
    need((frozen.files ?? frozen.target_hashes)?.["CORRECTION-BASIS.json"] === binding.file.sha256,
      "correction basis must have been part of the original source-specific review targets");
    need(canonical(read("CORRECTION-BASIS.json")) === canonical(basis), "reviewed correction basis differs from handoff");
    const originals = intake.files.filter(file => file.roles.includes("source"));
    need(canonical(sorted(originals.map(file => ({ fileId: file.id, sha256: file.sha256 })))) ===
      canonical(sorted(source.documents.map(doc => ({ fileId: doc.id, sha256: doc.sha256 })))),
    "correction documents must identify every original source file and hash");
    const reviews = sorted(intake.files.filter(file => file.roles.includes("review"))
      .map(file => ({ fileId: file.id, sha256: file.sha256 })));
    for (const review of manifest.reviews.filter(review => review.sourceId === source.id))
      need(Array.isArray(review.packageReviews) && canonical(sorted(review.packageReviews)) === canonical(reviews),
        "each review reference must bind the exact retained source-specific reviews");
    result.push({ package: intake.package, intakeSha256: entry.sha256, basisSha256: evidence.basisSha256,
      correctionBasisSha256: binding.file.sha256, packageReviews: reviews,
      sourceMethodValidated: true, viewerShapeValidated: true });
  }
  return { planSha256: checked.planSha256, packages: result };
}

export async function prepareSourceCheckedCorrection({ correction, beforePlan, afterPlan }) {
  const handoff = prepareCorrectionHandoff(correction);
  const before = await checkedBasis(resolve(beforePlan), correction.previousBasis, correction.previousManifest);
  const after = await checkedBasis(resolve(afterPlan), correction.currentBasis, correction.currentManifest);
  for (const source of after.packages) {
    const previous = before.packages.find(item => item.package.id === source.package.id);
    need(previous.package.kind === source.package.kind, "source kind cannot change in a correction");
    if (handoff.entries.some(entry => entry.sourceId === source.package.id)) {
      need(previous.package.version !== source.package.version, "changed package needs a new version");
      need(previous.basisSha256 !== source.basisSha256 && previous.intakeSha256 !== source.intakeSha256,
        "changed package needs a new source review basis and intake");
      need(source.packageReviews.every(review => !previous.packageReviews.some(old => old.sha256 === review.sha256)),
        "changed or dependent content needs new source-specific reviews");
    }
  }
  return { ...handoff, status: "SOURCE_CHECKED_CORRECTION_HANDOFF", sourceChecks: { before, after },
    publicationCreated: false, comparisonExecuted: false, viewerExecuted: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), flags = ["--correction", "--before-plan", "--after-plan"];
    need(args.length === 6 && flags.every((flag, index) => args[index * 2] === flag && args[index * 2 + 1] &&
      !args[index * 2 + 1].startsWith("--")),
    "Usage: node content-tools/review-change-set-workflow.mjs --correction <correction.json> --before-plan <packages.json> --after-plan <packages.json>");
    console.log(JSON.stringify(await prepareSourceCheckedCorrection({ correction: json(bytes(args[1])),
      beforePlan: args[3], afterPlan: args[5] }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "HOLD", planningOnly: true, publishable: false, error: error.message }));
    process.exitCode = 1;
  }
}
