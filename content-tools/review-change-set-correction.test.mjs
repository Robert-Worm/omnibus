import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { digest } from "./identity.mjs";
import { prepareIntake, checkIntake } from "./intake.mjs";
import { createReviewManifest, reviewChangeSet, prepareCorrectionHandoff } from "./review-change-set.mjs";
import { validateSemanticReview } from "../lib/semantic-review-gate.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { publishRuntime } from "../local-data/runtime-publication.mjs";
import { prepareWebResources } from "../local-data/web-resources.mjs";
import { runtimeContract } from "../lib/runtime-contract.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { checkRuntimeDatabase } from "../scripts/check-runtime-database.mjs";
import { compareRuntimePublications } from "../scripts/compare-runtime-publications.mjs";
import { bereidReleaseVoor } from "../scripts/prepare-release.mjs";
import { controleer, maakBron } from "../scripts/check-passages.mjs";

// Entirely invented records and receipts, constructed only in this test module.
// This exercises existing functions, not the private authoring CLI or real admission.
const root = fileURLToPath(new URL("../", import.meta.url));
const quote = "Fictieve afspraak: leg de controle vast in een oefenregister. Café 😀.";
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const shaJson = value => digest(JSON.stringify(value)); // Existing semantic gate's hash contract.
function reviewed(basis, version) {
  const manifest = createReviewManifest(basis);
  manifest.reviews = manifest.sources.flatMap(source => source.items.map(item => ({
    sourceId: source.sourceId, itemId: item.itemId, itemHash: item.itemHash, hashVersion: manifest.hashVersion,
    reviewId: `synthetic-${version}-${item.itemId}`, sourceVerified: true, coverageComplete: true, unresolvedQuestions: [],
  })));
  return manifest;
}
function fixture() {
  const previousBasis = { format: "omnibus-review-basis", schemaVersion: 1, scopeId: "synthetic-correction",
    inventoryComplete: true, rubricVersion: "synthetic-1", protocolVersion: "synthetic-1", context: {},
    sources: [{ id: "FICTIEF", version: "edition-1", context: {}, applicability: { scope: "Alleen oefening" }, hold: { active: false },
      documents: [{ id: "FICTIEF-DOC", version: "edition-1", sha256: digest(quote) }],
      items: ["N1", "N2"].map(id => ({ id, norm: "Leg de fictieve controle vast.", doel: "Fictieve controle herleidbaar maken.",
        risico: "Een fictieve afwijking blijft onopgemerkt.", beheersdoelstelling: "Fictieve controles zijn herleidbaar.",
        beheersmaatregel: "Leg de controle vast.",
        toetspunten: [{ id: `${id}-P1`, text: "Vastlegging van de fictieve controle.", opzet: "Lees de fictieve afspraak.", bestaan: "Bekijk één fictief register." }],
        context: {}, applicability: { scope: "Alleen oefening" }, hold: { active: false },
        passages: [{ id: "P1", documentId: "FICTIEF-DOC", documentVersion: "edition-1", documentSha256: digest(quote),
          location: { page: 1, start: 0, end: Array.from(quote).length }, text: quote, context: "Volledige fictieve oefenafspraak." }],
        dependencies: id === "N2" ? [{ sourceId: "FICTIEF", itemId: "N1" }] : [], evidence: { complete: true, gaps: [] },
      })) }] };
  const currentBasis = structuredClone(previousBasis);
  currentBasis.sources[0].items[0].beheersmaatregel = "De fictieve beheerder registreert de controledatum en uitkomst in het oefenregister.";
  return { previousBasis, previousManifest: reviewed(previousBasis, "before"), currentBasis, currentManifest: reviewed(currentBasis, "after"),
    notes: [{ sourceId: "FICTIEF", itemId: "N1", summary: "De beheersmaatregel benoemt nu de beheerder, controledatum en vast te leggen uitkomst." },
      { sourceId: "FICTIEF", itemId: "N2", summary: "De afhankelijkheid van N1 is opnieuw beoordeeld; de eigen normtekst is gelijk gebleven." }] };
}

test("correction notes bind both exact versions and every affected relationship without approval", () => {
  const input = fixture(), original = JSON.stringify(input), output = prepareCorrectionHandoff(input);
  assert.equal(output.publishable, false);
  assert.equal(output.automaticApproval, false);
  assert.deepEqual(output.entries.map(item => item.itemId), ["N1", "N2"]);
  assert.deepEqual(output.entries[0].changedFields, ["beheersmaatregel"]);
  assert.deepEqual(output.entries[1].changedFields, []);
  assert.ok(output.entries.every(item => item.previousHash !== item.itemHash && item.previousReviewId !== item.reviewId));
  assert.equal(output.entries[0].beforeSource.documents[0].sha256, digest(quote));
  assert.deepEqual(output.entries[0].beforeSource, output.entries[0].afterSource);
  assert.match(output.releaseNotes, /beheerder, controledatum/);
  assert.match(output.releaseNotes, /afhankelijkheid van N1/);
  assert.equal(JSON.stringify(input), original);
});

test("score, stale reviews, HOLD, changed source, relation changes and missing evidence stop the handoff", () => {
  const cases = [
    ["score alone", f => { f.currentManifest.reviews = []; f.score = 10; }],
    ["explicit review HOLD", f => { f.currentManifest.reviews[0].decision = "HOLD"; }],
    ["explicit rejection", f => { f.currentManifest.reviews[0].decision = "REJECT"; }],
    ["old receipt rebound", f => { f.currentManifest.reviews[0].reviewId = f.previousManifest.reviews[0].reviewId; }],
    ["dependent not rereviewed", f => { f.currentManifest.reviews[1] = f.previousManifest.reviews[1]; }],
    ["wrong old basis", f => { f.previousBasis.sources[0].documents[0].sha256 = digest("other bytes"); }],
    ["changed source", f => { f.currentBasis.sources[0].documents[0].sha256 = digest("changed source bytes"); }],
    ["HOLD despite fresh receipts", f => { f.currentBasis.sources[0].hold.active = true; f.currentManifest = reviewed(f.currentBasis, "hold"); }],
    ["point HOLD", f => { f.currentBasis.sources[0].items[0].toetspunten[0].selection_status = "HOLD"; f.currentManifest = reviewed(f.currentBasis, "hold"); }],
    ["unreviewed relationship mutation", f => { f.currentBasis.sources[0].items[1].dependencies = []; }],
    ["missing source evidence", f => { f.currentBasis.sources[0].items[0].evidence.gaps.push("Fictieve bewijsleemte"); f.currentManifest = reviewed(f.currentBasis, "gap"); }],
    ["wrong passage edition", f => { f.currentBasis.sources[0].items[0].passages[0].documentVersion = "edition-2"; f.currentManifest = reviewed(f.currentBasis, "wrong"); }],
    ["unexplained dependent", f => { f.notes.pop(); }],
    ["unknown note", f => { f.notes.push({ sourceId: "FICTIEF", itemId: "N3", summary: "Unknown" }); }],
  ];
  for (const [label, change] of cases) {
    const input = fixture(); change(input);
    assert.throws(() => prepareCorrectionHandoff(input), undefined, label);
  }
});

test("a reviewed source edition retains both bindings; additions and removals cannot masquerade as corrections", () => {
  const input = fixture(), source = input.currentBasis.sources[0];
  source.version = "edition-2";
  source.documents[0].version = "edition-2";
  source.documents[0].sha256 = digest("Fictieve nieuwe broneditie.");
  for (const item of source.items) {
    item.passages[0].documentVersion = "edition-2";
    item.passages[0].documentSha256 = source.documents[0].sha256;
    item.passages[0].text = "Fictieve nieuwe broneditie.";
  }
  input.currentManifest = reviewed(input.currentBasis, "new-edition");
  const output = prepareCorrectionHandoff(input);
  assert.equal(output.entries[0].beforeSource.version, "edition-1");
  assert.equal(output.entries[0].afterSource.version, "edition-2");
  assert.notEqual(output.entries[0].beforeSource.documents[0].sha256, output.entries[0].afterSource.documents[0].sha256);
  const removed = fixture(); removed.currentBasis.sources[0].items.pop();
  removed.currentManifest = reviewed(removed.currentBasis, "removed");
  assert.throws(() => prepareCorrectionHandoff(removed), /existing item identities/);
  const renamed = fixture(); renamed.currentBasis.sources[0].items[1].id = "N3";
  renamed.currentManifest = reviewed(renamed.currentBasis, "renamed");
  assert.throws(() => prepareCorrectionHandoff(renamed), /existing item identities/);
});

// A tiny test-only projection. Existing source adapters own production mapping.
function semanticInput(basis, manifest) {
  const source = basis.sources[0], groups = { g: ["Fictieve groep", "Fictieve groepscontext"] };
  const records = source.items.map(item => ({ ...item, group: "g", sourceDocuments: source.documents }));
  const items = records.map(record => ({ ...record, id: `FICTIEF-${record.id}`, sourceId: source.id,
    groupId: "FICTIEF-g", groupTitle: groups.g[0], groupDescription: groups.g[1],
    reviewBasisHash: manifest.sources[0].items.find(item => item.itemId === record.id).itemHash }));
  const review = { semanticDecision: "PASS", sharedContextReview: { decision: "PASS", basis: "Fictieve groepsreview" },
    reviewer: "synthetic-reviewer", reviewType: "synthetic-test-only", reviewDate: "2026-10-25",
    records: records.map((record, index) => ({ code: items[index].id, decision: "PASS", basis: "Fictieve bron- en ketenreview",
      recordHash: shaJson(record), itemHash: shaJson(items[index]), passagesHash: shaJson(record.passages) })),
    groups: [{ id: "g", decision: "PASS", basis: "Fictieve groepsreview", title: groups.g[0], description: groups.g[1], records: items.map(item => item.id) }] };
  return { sourceId: source.id, reviewFile: "semantic-review.json", review, records, groups, items,
    sourceRows: record => record.passages, expectedRecords: 2, expectedGroups: 1 };
}

async function packageFixture(directory, basis, manifest, semantic, handoff) {
  mkdirSync(directory);
  const files = [
    ["source.txt", quote, ["source", "source-text"]],
    ["basis.json", basis, ["review-basis"]], ["reviews.json", { manifest, semantic: semantic.review }, ["review"]],
    ["catalogue.json", semantic.items, ["catalogue"]], ["links.json", basis.sources[0].items.map(item => item.passages), ["source-links"]],
    ["context.json", basis.context, ["context"]], ["bank.json", basis.sources[0].documents, ["source-bank"]],
    ["contract.txt", "Fictieve framework-cio-0.1+addendum-01 test; geen echt bronpakket.", ["contract"]],
    ["limitations.txt", "Volledig fictief; geen inhoudelijke vrijgave.", ["limitations"]],
    ["migration.txt", "Dezelfde fictieve identiteiten; geen gebruikersproject gewijzigd.", ["migration"]],
    ...(handoff ? [["correction-handoff.json", handoff, ["supporting"]]] : []),
  ];
  for (const [name, data] of files) writeFileSync(join(directory, name), typeof data === "string" ? data : JSON.stringify(data), { flag: "wx" });
  save(join(directory, "plan.json"), { format: "omnibus-intake-plan", schemaVersion: 1,
    package: { id: "FICTIEF", kind: "framework", version: manifest.reviews[0].reviewId, title: "Fictieve correctieproef" },
    contract: "framework-cio-0.1+addendum-01", files: files.map(([name, , roles], index) => ({ id: `file-${index}`, path: name, roles })) });
  const prepared = await prepareIntake(join(directory, "plan.json"), join(directory, "intake.json"));
  const checked = await checkIntake(join(directory, "intake.json"), { expectedSha256: prepared.manifestSha256 });
  assert.equal(checked.status, "FILES_VERIFIED_REVIEW_REQUIRED");
  assert.equal(checked.publishable, false);
  assert.equal(digest(readFileSync(join(directory, "source.txt"), "utf8")), basis.sources[0].documents[0].sha256);
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "basis.json"), "utf8")), basis);
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "catalogue.json"), "utf8")), semantic.items);
  for (const item of basis.sources[0].items) {
    const passage = item.passages[0];
    assert.equal(controleer({ quote: passage.text, ...passage.location },
      [maakBron([{ number: 1, text: readFileSync(join(directory, "source.txt"), "utf8") }])]).uitkomst, "exact");
  }
  return checked;
}

function publishFixture(directory, basis, manifest, semantic, intake) {
  // This is a synthetic use of the existing semantic validator and publisher.
  // No generic production importer, review database or forged private receipt.
  assert.equal(validateSemanticReview(semantic).decisions.size, 2);
  mkdirSync(directory);
  const database = join(directory, "catalogue.sqlite"), repository = new CatalogueRepository(database);
  let release, publication;
  try {
    release = repository.importRelease({ manifest: { baselineVersion: "synthetic-correction-only" },
      packages: [{ id: "FICTIEF", kind: "foundation", title: "Fictieve correctieproef", records: semantic.items.map(item => ({
        id: item.id, kind: "norm", title: item.id, status: "HOLD", data: item,
      })) }], documents: [{ id: "FICTIEF-DOC", sourceId: "FICTIEF", pages: [{ page: 1, text: quote }] }],
      artifacts: [{ name: "synthetic-review-basis", data: basis }, { name: "synthetic-reviews", data: manifest },
        { name: "synthetic-semantic-review", data: semantic.review }, { name: "synthetic-intake", data: intake }] });
    const modules = Object.fromEntries(Object.entries(runtimeContract).map(([id, entry]) => [id, entry.kind === "exports"
      ? Object.fromEntries(entry.names.map(name => [name, { text: "Fictieve test" }])) : entry.property ? { [entry.property]: [] } : {}]));
    modules["lib/model-choice-guide.mjs"] = { guides: {}, summaries: {} };
    modules["lib/research-models.mjs"] = { ids: [], presentations: {} };
    publication = publishRuntime(repository, { format: "omnibus-runtime-publication", schemaVersion: 1,
      contentGate: "VERIFIED_APPLICATION_RELEASE", release, contract: runtimeContractHash, modules,
      refs: prepareWebResources(repository, release, { test: { label: "Fictieve correctie" } }), registrations: {}, routing: {}, summary: { synthetic: true } },
    { release, contract: runtimeContractHash });
  } finally { repository.close(); }
  const settings = { database, release, publication };
  assert.equal(checkRuntimeDatabase(settings).status, "VERIFIED_RUNTIME_DATABASE");
  save(join(directory, "local-build.json"), { ...settings, database: "catalogue.sqlite" });
  return settings;
}

test("synthetic correction uses ordinary intake, semantic checks, separate publications, comparison and concrete release notes", async t => {
  mkdirSync(join(root, "work"), { recursive: true });
  const directory = mkdtempSync(join(root, "work", "reviewed-correction-"));
  // Retain this small, ignored evidence folder for the integrator's review.
  t.diagnostic(`Synthetic evidence: ${directory}`);
  const input = fixture(); save(join(directory, "correction.json"), input);
  const retainedCorrection = readFileSync(join(directory, "correction.json"));
  const cli = spawnSync(process.execPath, [join(root, "scripts/check-review-changes.mjs"), "--correction", join(directory, "correction.json")], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const handoff = JSON.parse(cli.stdout); save(join(directory, "correction-handoff.json"), handoff);
  const rejected = fixture(); rejected.currentManifest.reviews = [];
  save(join(directory, "score-only.json"), rejected);
  const rejectedCli = spawnSync(process.execPath, [join(root, "scripts/check-review-changes.mjs"), "--correction", join(directory, "score-only.json")], { encoding: "utf8" });
  assert.equal(rejectedCli.status, 1);
  assert.match(rejectedCli.stderr, /complete, matching reviews/);
  const changed = reviewChangeSet(input.previousManifest, input.currentBasis);
  assert.deepEqual(changed.sources[0].opnieuw.map(item => item.itemId), ["N1", "N2"]);
  const oldSemantic = semanticInput(input.previousBasis, input.previousManifest), newSemantic = semanticInput(input.currentBasis, input.currentManifest);
  assert.throws(() => validateSemanticReview({ ...newSemantic, review: oldSemantic.review }), /changed after independent review/);
  const staleDependency = structuredClone(newSemantic.review);
  staleDependency.records[1] = oldSemantic.review.records[1];
  assert.throws(() => validateSemanticReview({ ...newSemantic, review: staleDependency }), /changed after independent review/);
  const beforeIntake = await packageFixture(join(directory, "before-package"), input.previousBasis, input.previousManifest, oldSemantic);
  const afterIntake = await packageFixture(join(directory, "after-package"), input.currentBasis, input.currentManifest, newSemantic, handoff);
  const before = publishFixture(join(directory, "before"), input.previousBasis, input.previousManifest, oldSemantic, beforeIntake);
  const oldBytes = readFileSync(before.database);
  const after = publishFixture(join(directory, "candidate"), input.currentBasis, input.currentManifest, newSemantic, afterIntake);
  const reader = new CatalogueRepository(after.database, { readOnly: true });
  try {
    const bundle = reader.exportRelease(after.release);
    assert.deepEqual(bundle.packages[0].records.map(record => record.data), newSemantic.items);
    assert.deepEqual(bundle.artifacts.find(artifact => artifact.name === "synthetic-review-basis").data, input.currentBasis);
    assert.ok(bundle.packages[0].records.every(record => record.status === "HOLD"));
  } finally { reader.close(); }
  const comparison = compareRuntimePublications({ before, after }); save(join(directory, "comparison.json"), comparison);
  assert.equal(comparison.status, "RUNTIME_DIFFERENCES_REVIEW_REQUIRED");
  assert.deepEqual(comparison.changes.packages.changed.map(change => change.after.id), ["FICTIEF"]);
  assert.equal(comparison.changes.packages.added.length + comparison.changes.packages.removed.length, 0);
  assert.equal(comparison.changes.documents.changed.length, 0);
  assert.equal(comparison.changes.documents.unchanged, 1);
  assert.equal(compareRuntimePublications({ before, after, expectedAdditions: ["foundation:FICTIEF"] }).status, "HOLD");
  const out = join(directory, "release");
  await bereidReleaseVoor({ settings: after, out, datum: "2026-10-25",
    huidig: { rapporten: {}, wettenEnKaders: ["FICTIEF"], modellen: 0 }, kaderCodes: ["FICTIEF"], claims: ["168"] });
  const notesPath = join(out, "releasenotities.md");
  const draft = readFileSync(notesPath, "utf8");
  assert.match(draft, /alleen verbeteringen in bestaande inhoud/);
  // Explicit operator completion of the ordinary draft, as documented; no change to release:prepare.
  writeFileSync(notesPath, draft + "\n" + handoff.releaseNotes + "\nSynthetische publicatie; geen echte contentvrijgave.\n");
  assert.match(readFileSync(notesPath, "utf8"), /FICTIEF \/ N1.*beheerder, controledatum/);
  assert.match(readFileSync(notesPath, "utf8"), /FICTIEF \/ N2.*opnieuw beoordeeld/);
  assert.deepEqual(readFileSync(before.database), oldBytes);
  assert.deepEqual(readFileSync(join(directory, "correction.json")), retainedCorrection);
  await checkIntake(join(directory, "before-package/intake.json"), { expectedSha256: beforeIntake.manifestSha256 });
  await checkIntake(join(directory, "after-package/intake.json"), { expectedSha256: afterIntake.manifestSha256 });
  assert.equal(comparison.newContentApproval, false);
  assert.equal(comparison.activated, false);
  save(join(directory, "result.json"), { synthetic: true, newContentApproval: false, before, after,
    intake: afterIntake.status, comparison: comparison.status, affected: handoff.entries.map(item => item.itemId),
    privateAuthoringCliExecuted: false, releaseNotesCompletedByOperator: true });
});
