import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { digest } from "./identity.mjs";
import { createReviewManifest, reviewChangeSet, reviewHashVersion } from "./review-change-set.mjs";

// All content and review statements below are invented test data.
function fixture() {
  const source = (id) => ({
    id, version: "exercise-1", context: { definitions: "Fictieve definitie." },
    applicability: { scope: "Alleen een oefening" }, hold: { active: true, reason: "Fictieve bron" },
    documents: [{ id: "doc", version: "edition-1", sha256: digest("Fictieve documentbytes.") }],
    items: ["N1", "N2"].map((itemId) => ({
      id: itemId, norm: "Controleer de fictieve afspraak.", doel: "Een fictief resultaat.",
      risico: "Fictieve vergissing met een fictief gevolg.", beheersdoelstelling: "Fictieve zekerheid.",
      beheersmaatregel: "Fictieve controlehandeling.",
      toetspunten: [{ id: `${itemId}-P1`, text: "Fictief toetsaspect.", opzet: "Vergelijk de fictieve inrichting.", bestaan: "Inspecteer een fictief geval." }],
      context: { variants: ["Algemeen", "Bronspecifiek"] }, applicability: { status: "oefening" }, hold: { active: true },
      passages: [{ id: "passage-1", documentId: "doc", documentVersion: "edition-1", documentSha256: digest("Fictieve documentbytes."),
        location: { page: 1, start: 0, end: 8 }, text: "Fictief.", context: "Fictieve omringende tekst en uitzondering." }],
      dependencies: [], evidence: { complete: true, gaps: [] },
    })),
  });
  return { format: "omnibus-review-basis", schemaVersion: 1, scopeId: "synthetic-catalogue", inventoryComplete: true,
    rubricVersion: "OAK-exercise-1", protocolVersion: "exercise-protocol-1", context: { interpretation: "Fictieve context." },
    sources: [source("A"), source("B")] };
}
function reviewed(basis) {
  const manifest = createReviewManifest(basis);
  manifest.reviews = manifest.sources.flatMap((source) => source.items.map((item) => ({
    sourceId: source.sourceId, itemId: item.itemId, hashVersion: manifest.hashVersion, itemHash: item.itemHash,
    reviewId: `synthetic-${source.sourceId}-${item.itemId}`, sourceVerified: true, coverageComplete: true, unresolvedQuestions: [],
  })));
  return manifest;
}
const first = (basis) => basis.sources[0].items[0];
const sourceResult = (result, source = "A") => result.sources.find((entry) => entry.sourceId === source);
const ids = (entries) => entries.map((entry) => entry.itemId);
function freeze(value) {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test("identical complete review stays version-bound; input and HOLD remain untouched", () => {
  const basis = freeze(fixture()), previous = freeze(reviewed(basis));
  const bytes = JSON.stringify([basis, previous]), result = reviewChangeSet(previous, basis);
  for (const source of result.sources) {
    assert.deepEqual(ids(source.ongewijzigd), ["N1", "N2"]);
    assert.deepEqual(source.opnieuw, []);
    assert.deepEqual(source.verdwenen, []);
    assert.ok(source.ongewijzigd.every((item) => item.itemHash === item.previousHash && item.previousReviewId));
  }
  assert.equal(JSON.stringify([basis, previous]), bytes);
  assert.equal(result.planningOnly, true);
  assert.equal(result.automaticApproval, false);
  assert.equal(result.runtimeSourceChecksRequired, true);
  assert.deepEqual(createReviewManifest(basis).reviews, []);
  assert.ok(!JSON.stringify(result).includes("Fictieve"));
});

test("all chain fields and relevant context invalidate an unchanged norm", () => {
  const changes = {
    doel: (b) => { first(b).doel += " Nieuw."; },
    risico: (b) => { first(b).risico += " Nieuw."; },
    beheersdoelstelling: (b) => { first(b).beheersdoelstelling += " Nieuw."; },
    beheersmaatregel: (b) => { first(b).beheersmaatregel += " Nieuw."; },
    point: (b) => { first(b).toetspunten[0].text += " Nieuw."; },
    opzet: (b) => { first(b).toetspunten[0].opzet += " Nieuw."; },
    bestaan: (b) => { first(b).toetspunten[0].bestaan += " Nieuw."; },
    werking: (b) => { first(b).toetspunten[0].werking = "Een fictieve periode."; },
    expectedEvidence: (b) => { first(b).toetspunten[0].expectedEvidence = ["Fictief bewijs"]; },
    decisionRule: (b) => { first(b).toetspunten[0].decisionRule = "Fictieve vergelijking"; },
    pointApplicability: (b) => { first(b).toetspunten[0].applicability = { status: "beperkt" }; },
    variants: (b) => { first(b).context.variants[1] += " Nieuw."; },
    fieldProvenance: (b) => { first(b).fieldSources = { doel: { type: "afleiding", basis: "Fictief" } }; },
    applicability: (b) => { first(b).applicability.status = "beperkt"; },
    hold: (b) => { first(b).hold.active = false; },
    passage: (b) => { first(b).passages[0].text += " Nieuw."; },
    passageContext: (b) => { first(b).passages[0].context += " Uitzondering."; },
    passageLocation: (b) => { first(b).passages[0].location.page = 2; },
    sourceVersion: (b) => { b.sources[0].version = "exercise-2"; },
    sourceContext: (b) => { b.sources[0].context.definitions += " Nieuw."; },
    sourceApplicability: (b) => { b.sources[0].applicability.scope = "Beperkter"; },
    sourceHold: (b) => { b.sources[0].hold.reason += " Nog een vraag."; },
    documentVersion: (b) => { b.sources[0].documents[0].version = "edition-2"; b.sources[0].items.forEach((item) => { item.passages[0].documentVersion = "edition-2"; }); },
    documentBytes: (b) => { const hash = digest("Andere fictieve bytes."); b.sources[0].documents[0].sha256 = hash; b.sources[0].items.forEach((item) => { item.passages[0].documentSha256 = hash; }); },
    globalContext: (b) => { b.context.interpretation += " Nieuw."; },
    rubric: (b) => { b.rubricVersion = "OAK-exercise-2"; },
    protocol: (b) => { b.protocolVersion = "exercise-protocol-2"; },
  };
  for (const [label, change] of Object.entries(changes)) {
    const basis = fixture(), previous = reviewed(basis);
    change(basis);
    assert.equal(first(basis).norm, fixture().sources[0].items[0].norm);
    const result = reviewChangeSet(previous, basis), changed = sourceResult(result).opnieuw.find((item) => item.itemId === "N1");
    assert.ok(changed?.reasons.includes("review-basis-changed"), label);
    assert.notEqual(changed.itemHash, changed.previousHash, label);
    if (["rubric", "protocol", "globalContext"].includes(label)) assert.equal(sourceResult(result, "B").opnieuw.length, 2, label);
    else assert.equal(sourceResult(result, "B").ongewijzigd.length, 2, label);
  }
  const basis = fixture(), previous = reviewed(basis);
  first(basis).norm += " Gewijzigd.";
  assert.equal(sourceResult(reviewChangeSet(previous, basis)).opnieuw.length, 1);
});

test("stable identities handle additions, renames, removed points and removed sources", () => {
  const basis = fixture();
  first(basis).toetspunten.push({ ...first(basis).toetspunten[0], id: "N1-P2" });
  const previous = reviewed(basis);
  first(basis).toetspunten.pop();
  basis.sources[0].items[1].id = "N3";
  basis.sources.pop();
  const result = reviewChangeSet(previous, basis), a = sourceResult(result);
  assert.deepEqual(ids(a.opnieuw), ["N1", "N3"]);
  assert.deepEqual(a.opnieuw[0].removedPointIds, ["N1-P2"]);
  assert.deepEqual(a.opnieuw[1].reasons, ["new-item"]);
  assert.deepEqual(ids(a.verdwenen), ["N2"]);
  assert.deepEqual(ids(sourceResult(result, "B").verdwenen), ["N1", "N2"]);
  assert.equal(previous.sources.length, 2);
  assert.equal(previous.sources[0].items[0].pointIds.length, 2);
  const empty = fixture(); empty.sources = [];
  assert.equal(reviewChangeSet(createReviewManifest(empty), fixture()).sources[0].opnieuw.length, 2);
});

test("report point IDs with slashes remain stable data identities", () => {
  const basis = fixture();
  first(basis).toetspunten[0].id = "SYNTHETIC-K01/TP01";
  const previous = reviewed(basis);
  assert.deepEqual(sourceResult(reviewChangeSet(previous, basis)).ongewijzigd[0].pointIds, ["SYNTHETIC-K01/TP01"]);
  first(basis).toetspunten[0].text += " Nieuw.";
  const changed = sourceResult(reviewChangeSet(previous, basis)).opnieuw[0];
  assert.equal(changed.itemId, "N1");
  assert.deepEqual(changed.pointIds, ["SYNTHETIC-K01/TP01"]);
  assert.deepEqual(changed.removedPointIds, []);
});

test("duplicates fail instead of silently choosing a review or item", () => {
  const changes = [
    (b) => b.sources.push(structuredClone(b.sources[0])),
    (b) => b.sources[0].items.push(structuredClone(first(b))),
    (b) => first(b).toetspunten.push(structuredClone(first(b).toetspunten[0])),
    (b) => { b.sources[0].items[1].toetspunten[0].id = "N1-P1"; },
    (b) => first(b).passages.push(structuredClone(first(b).passages[0])),
    (b) => b.sources[0].documents.push(structuredClone(b.sources[0].documents[0])),
    (b) => { first(b).dependencies = [{ sourceId: "A", itemId: "N2" }, { sourceId: "A", itemId: "N2" }]; },
  ];
  for (const change of changes) { const basis = fixture(); change(basis); assert.throws(() => createReviewManifest(basis), /duplicate/i); }
  const basis = fixture(), previous = reviewed(basis);
  previous.reviews.push(structuredClone(previous.reviews[0]));
  assert.throws(() => reviewChangeSet(previous, basis), /duplicate review/i);
  assert.doesNotThrow(() => createReviewManifest(fixture())); // Same local IDs across sources are distinct identities.
});

test("equal hashes never hide missing evidence or incomplete old reviews", () => {
  const missingEvidence = [
    (b) => { delete b.rubricVersion; }, (b) => { delete b.protocolVersion; },
    (b) => { delete b.context; }, (b) => { delete b.sources[0].version; },
    (b) => { delete b.sources[0].context; }, (b) => { delete first(b).context; },
    (b) => { delete first(b).applicability; }, (b) => { delete first(b).hold; },
    (b) => { delete first(b).doel; }, (b) => { first(b).toetspunten = []; },
    (b) => { delete first(b).toetspunten[0].opzet; },
    (b) => { delete first(b).toetspunten[0].bestaan; },
    (b) => { delete b.sources[0].documents; }, (b) => { b.sources[0].documents[0].sha256 = "unverified"; },
    (b) => { first(b).passages = []; }, (b) => { delete first(b).passages[0].context; },
    (b) => { first(b).passages[0].location = {}; }, (b) => { first(b).passages[0].documentVersion = "wrong-edition"; },
    (b) => { first(b).passages[0].documentSha256 = digest("wrong bytes"); },
    (b) => { delete first(b).dependencies; },
    (b) => { delete first(b).evidence; }, (b) => { first(b).evidence.gaps.push("Ongelezen uitzondering"); },
  ];
  for (const change of missingEvidence) {
    const basis = fixture(); change(basis);
    const result = sourceResult(reviewChangeSet(reviewed(basis), basis)).opnieuw[0];
    assert.equal(result.itemHash, result.previousHash);
    assert.ok(result.reasons.includes("previous-evidence-incomplete"));
    assert.ok(result.reasons.includes("current-evidence-incomplete"));
  }
  const incompleteReviews = [
    (m) => { m.reviews.shift(); }, (m) => { m.reviews[0].sourceVerified = false; },
    (m) => { m.reviews[0].coverageComplete = false; }, (m) => { delete m.reviews[0].reviewId; },
    (m) => { m.reviews[0].unresolvedQuestions = ["Fictieve bronvraag"]; },
    (m) => { delete m.reviews[0].unresolvedQuestions; },
    (m) => { m.reviews[0].itemHash = digest("stale"); }, (m) => { m.reviews[0].hashVersion = "old"; },
  ];
  for (const change of incompleteReviews) {
    const basis = fixture(), previous = reviewed(basis); change(previous);
    assert.deepEqual(ids(sourceResult(reviewChangeSet(previous, basis)).opnieuw), ["N1"]);
  }
});

test("changed dependency chains propagate transitively, across sources and through cycles", () => {
  const basis = fixture();
  first(basis).dependencies = [{ sourceId: "A", itemId: "N2" }];
  basis.sources[0].items[1].dependencies = [{ sourceId: "B", itemId: "N1" }];
  basis.sources[1].items[0].dependencies = [{ sourceId: "A", itemId: "N1" }];
  const previous = reviewed(basis);
  basis.sources[1].items[0].risico += " Nieuw.";
  const result = reviewChangeSet(previous, basis);
  assert.deepEqual(ids(sourceResult(result).opnieuw), ["N1", "N2"]);
  assert.deepEqual(ids(sourceResult(result, "B").opnieuw), ["N1"]);
  assert.deepEqual(ids(sourceResult(result, "B").ongewijzigd), ["N2"]);
  basis.sources[1].items.shift();
  const missing = sourceResult(reviewChangeSet(previous, basis)).opnieuw;
  assert.ok(missing.every((item) => item.evidenceIssues.some((issue) => issue.startsWith("dependency-missing:"))));
  assert.ok(sourceResult(reviewChangeSet(reviewed(basis), basis)).opnieuw.every((item) => item.reasons.includes("current-evidence-incomplete")));
});

test("object key order is canonical, array order and extra context are significant", () => {
  const basis = fixture(), previous = reviewed(basis);
  const reordered = (value) => Array.isArray(value) ? value.map(reordered) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reordered(v)])) : value;
  assert.deepEqual(createReviewManifest(reordered(basis)), createReviewManifest(basis));
  first(basis).context.variants.reverse();
  assert.deepEqual(ids(sourceResult(reviewChangeSet(previous, basis)).opnieuw), ["N1"]);
  const reorderedInventory = fixture(); reorderedInventory.sources.reverse(); reorderedInventory.sources.forEach((source) => source.items.reverse());
  assert.ok(reviewChangeSet(previous, reorderedInventory).sources.every((source) => source.ongewijzigd.length === 2));
});

test("unknown versions, partial inventories, different scopes and non-JSON values fail closed", () => {
  const basis = fixture(), previous = reviewed(basis);
  previous.hashVersion = "old-format";
  assert.ok(reviewChangeSet(previous, basis).sources.every((source) => source.opnieuw.length === 2));
  assert.ok(sourceResult(reviewChangeSet(previous, basis)).opnieuw[0].reasons.includes("hash-version-changed"));
  previous.schemaVersion = 2;
  assert.throws(() => reviewChangeSet(previous, basis), /Unsupported/);
  const incomplete = fixture(); incomplete.inventoryComplete = false;
  assert.throws(() => reviewChangeSet(reviewed(basis), incomplete), /complete inventory/);
  const otherScope = fixture(); otherScope.scopeId = "different";
  assert.throws(() => reviewChangeSet(reviewed(basis), otherScope), /different review scopes/);
  const sparse = []; sparse.length = 2; sparse[1] = 1;
  for (const value of [undefined, NaN, () => {}, new Date(), sparse]) {
    const bad = fixture(); bad.context.bad = value;
    assert.throws(() => createReviewManifest(bad), /JSON/);
  }
  const getter = fixture();
  Object.defineProperty(getter.context, "bad", { enumerable: true, get() { throw new Error("Getter executed"); } });
  assert.throws(() => createReviewManifest(getter), /JSON data properties/);
});

test("CLI only reads JSON, preserves every input byte and produces no files", async (t) => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const work = join(root, "work"); await mkdir(work, { recursive: true });
  const directory = await mkdtemp(join(work, "review-changes-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const script = fileURLToPath(new URL("../scripts/check-review-changes.mjs", import.meta.url));
  const basisPath = join(directory, "basis.json"), priorPath = join(directory, "previous.json"), codePath = join(directory, "package.mjs");
  const basis = fixture(), previous = reviewed(basis);
  await writeFile(basisPath, JSON.stringify(basis)); await writeFile(priorPath, JSON.stringify(previous));
  await writeFile(codePath, 'throw new Error("PACKAGE_CODE_MUST_NOT_RUN");');
  const before = await Promise.all([basisPath, priorPath, codePath].map((path) => readFile(path)));
  const call = (args) => spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: "utf8" });
  const snapshot = JSON.parse(execFileSync(process.execPath, [script, "--snapshot", basisPath], { cwd: directory, encoding: "utf8" }));
  assert.equal(snapshot.hashVersion, reviewHashVersion); assert.deepEqual(snapshot.reviews, []);
  const compared = call([priorPath, basisPath]); assert.equal(compared.status, 0, compared.stderr);
  assert.equal(JSON.parse(compared.stdout).sources[0].ongewijzigd.length, 2);
  const invalid = call(["--snapshot", codePath]); assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /valid JSON/); assert.ok(!invalid.stderr.includes("PACKAGE_CODE_MUST_NOT_RUN"));
  assert.equal(call([priorPath]).status, 1);
  assert.equal(call(["--snapshot", join(directory, "absent.json")]).status, 1);
  assert.deepEqual(await Promise.all([basisPath, priorPath, codePath].map((path) => readFile(path))), before);
  assert.deepEqual((await readdir(directory)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0), ["basis.json", "package.mjs", "previous.json"]);
});
