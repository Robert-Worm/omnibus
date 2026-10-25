import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fixture, admittedFixture } from "./test-support/local-database-fixture.mjs";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { CatalogueRepository, digest } from "../local-data/repository.mjs";
import { readRuntimePublication, publishRuntime } from "../local-data/runtime-publication.mjs";
import { prepareWebResources, publicationReadScope, webResource } from "../local-data/web-resources.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { buildLocalDatabase, checkLocalDatabase } from "./local-database.mjs";
import { checkRuntimeDatabase } from "../scripts/check-runtime-database.mjs";
import { readDatabaseSettings } from "../scripts/database-build-options.mjs";
import { projectModelDelivery } from "../scripts/model-delivery-projection.mjs";
import { applyCatalogueEdits } from "../lib/catalogue-runtime.mjs";
import { structureModelData } from "../lib/model-structure.mjs";

const LIBRARY = "lib/model-library.mjs";
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2));
async function runtimeCase(t, { admitted = true, editBase = () => {}, inline = false, ...options } = {}) {
  const f = admitted ? await admittedFixture(t, options) : await fixture(t);
  const originalModel = structuredClone(f.packages[0].model);
  originalModel.id = "SYNTHETIC_BASE"; originalModel.title = "Existing fictitious model";
  const document = { id: "synthetic-base-text", title: "Not a real source", pages: [{ page: 1, text: "A😀é\r\nExact source text." }] };
  const baseline = runtimeFixture(t, { documents: [document],
    packages: [{ id: originalModel.id, kind: "model", title: originalModel.title,
      records: [{ id: originalModel.id, kind: "model", data: originalModel }] }] });
  const writer = new CatalogueRepository(baseline.databasePath);
  let publication, sourceRef;
  try {
    const content = readRuntimePublication(writer, { ...baseline, contract: runtimeContractHash });
    const version = digest(document), index = writer.documentIndex(baseline.release, version);
    sourceRef = { schema: 1, release: baseline.release, version, indexHash: digest(JSON.stringify(index)) };
    const library = { models: inline ? [originalModel] : [], activeIntegrityDimensions: [],
      preInterviewReview: [], prePracticalCevQuestions: [], previousActiveQuestions: [] };
    content.modules[LIBRARY] = library;
    const resources = {
      "models:base": [{ path: ["models"], value: inline ? [] : [originalModel] }],
      "source:test": { databaseSource: sourceRef, prose: baseline.release },
    };
    content.refs = prepareWebResources(writer, baseline.release, resources);
    content.modules[LIBRARY].sourceTest = { databaseSource: sourceRef };
    content.modules[LIBRARY].deliveryTest = content.refs["source:test"];
    content.registrations[LIBRARY] = ["models:base"];
    editBase(content, writer);
    publication = publishRuntime(writer, content, { release: baseline.release, contract: runtimeContractHash });
  } finally { writer.close(); }
  const base = join(f.dir, "base.json");
  save(base, { database: baseline.databasePath, release: baseline.release, publication });
  return { ...f, base, baseline, originalModel, sourceRef, options: { ...f.options, base } };
}

for (const inline of [false, true]) await test(`local model publication preserves base and uses shared lazy viewer data (inline=${inline})`, async t => {
  const f = await runtimeCase(t, { inline }), before = readFileSync(f.baseline.databasePath);
  const paths = readdirSync(f.dir, { recursive: true }).sort();
  const checked = await checkLocalDatabase(f.options);
  assert.equal(checked.status, "LOCAL_VIEWER_INPUTS_CHECKED");
  assert.equal(checked.runtime.status, "NOT_BUILT");
  assert.deepEqual(readdirSync(f.dir, { recursive: true }).sort(), paths);
  const result = await buildLocalDatabase(f.options);
  assert.equal(result.status, "LOCAL_VIEWER_DATABASE_CREATED");
  assert.equal(result.runtime.status, "LOCAL_READY");
  assert.equal(result.runtime.scope, "local-database-only");
  assert.equal(result.publishable, false); assert.equal(result.newContentApproval, false);
  const pins = readDatabaseSettings(join(f.out, "local-build.json"));
  assert.equal(checkRuntimeDatabase(pins).status, "VERIFIED_RUNTIME_DATABASE");
  const reader = new CatalogueRepository(pins.database, { readOnly: true });
  try {
    const content = readRuntimePublication(reader, { ...pins, contract: runtimeContractHash });
    const read = ref => webResource(reader, pins.release, ref.hash);
    const delivery = projectModelDelivery(content, read);
    assert.deepEqual(delivery.ids, [f.originalModel.id, f.packages[0].id]);
    const own = delivery.registrations[LIBRARY].find(item => item.key === `models:item:${f.packages[0].id}`);
    const selectedLibrary = structuredClone(content.modules[LIBRARY]);
    applyCatalogueEdits(selectedLibrary, own.edits);
    assert.deepEqual(selectedLibrary.models, [f.packages[0].model]);
    const full = structuredClone(content.modules[LIBRARY]);
    for (const key of content.registrations[LIBRARY]) applyCatalogueEdits(full, read(content.refs[key]));
    assert.deepEqual(full.models, [f.originalModel, f.packages[0].model]);
    assert.deepEqual(content.summary.models, { models: 2, dimensions: 2, questions: 2 });
    const source = read(content.refs["source:test"]);
    assert.equal(source.databaseSource.release, pins.release);
    assert.equal(source.databaseSource.version, f.sourceRef.version);
    assert.equal(source.prose, f.baseline.release, "source-like strings are not rewritten");
    assert.deepEqual(content.modules[LIBRARY].deliveryTest, content.refs["source:test"]);
    assert(publicationReadScope(reader, content).allows(`/api/v1/documents/${f.sourceRef.version}/index`));
    const bundle = reader.exportRelease(pins.release);
    assert.deepEqual(bundle.packages.find(item => item.id === f.originalModel.id).records[0].data, f.originalModel);
    assert.equal(bundle.manifest.scope, "local-database-only");
    const ownEvidence = bundle.artifacts.find(item => item.name === `${f.packages[0].id}/local-owner-admission`);
    assert.deepEqual(Buffer.from(ownEvidence.data.content, "base64"), readFileSync(f.admissionPath));
    assert.equal(existsSync(join(f.dir, "executed.txt")), false);
  } finally { reader.close(); }
  assert.deepEqual(readFileSync(f.baseline.databasePath), before, "base database remains byte-identical");
  await assert.rejects(buildLocalDatabase(f.options), /Output already exists/);
});

await test("one-command viewer build works without private authoring modules", async t => {
  const f = await runtimeCase(t);
  const run = spawnSync(process.execPath, ["scripts/build-local-database.mjs", "--plan", f.planPath,
    "--base", f.base, "--out", f.out], { encoding: "utf8", timeout: 30000 });
  assert.ifError(run.error); assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).runtime.status, "LOCAL_READY");
});

await test("viewer publication never skips missing admissions, source or review checks", async t => {
  for (const admitted of [false, true]) await t.test(`admitted=${admitted}`, async st => {
    const f = await runtimeCase(st, { admitted });
    if (admitted) writeFileSync(join(f.packages[0].folder, "source.txt"), "Changed after approval.");
    await assert.rejects(buildLocalDatabase(f.options), admitted ? /checksum\/size/ : /Every viewer package/);
    assert.equal(existsSync(f.out), false);
  });
  const f = await runtimeCase(t, { count: 2 });
  await assert.rejects(buildLocalDatabase(f.options), /Every viewer package/);
  assert.equal(existsSync(f.out), false);
});

await test("duplicate models, invalid shared shape and broken base pins fail closed", async t => {
  for (const [name, mutate, expected] of [
    ["model collision", content => { content.modules[LIBRARY].models.push({ id: "synthetic_0" }); }, /Existing identity/],
    ["no model library", content => { content.modules[LIBRARY] = {}; }, /no model library/],
    ["shape", content => { content.modules[LIBRARY].models.push({ id: "BROKEN" }); }, /Ongeldige modelgegevens/],
    ["source", content => { content.modules[LIBRARY].sourceTest.databaseSource.indexHash = "f".repeat(64); }, /source reference/],
    ["duplicate resource", (content, writer) => {
      Object.assign(content.refs, prepareWebResources(writer, content.release, { "models:local:SYNTHETIC_0": [] }));
    }, /Delivery identity/],
  ]) await t.test(name, async st => {
    const f = await runtimeCase(st, { editBase: mutate });
    await assert.rejects(buildLocalDatabase(f.options), expected);
    assert.equal(existsSync(f.out), false);
  });
  const f = await runtimeCase(t), base = JSON.parse(readFileSync(f.base));
  save(f.base, { ...base, publication: "f".repeat(64) });
  await assert.rejects(buildLocalDatabase(f.options), /missing or changed publication/);
  assert.equal(existsSync(f.out), false);
});

await test("full shared viewer restoration rejects unusable optional model fields before writing", async t => {
  for (const [name, editModel, error] of [
    ["origin", m => { m.items[0].questions[0].origin = "invented-origin"; }, /herkomstmarkering/],
    ["levels", m => { m.items[0].questions[0].selectedLevels = ["invented-level"]; }, /vraagselectie/],
    ["source link", m => { m.items[0].questions[0].sourceIds = ["missing"]; }, /Onbekende modelbron/],
    ["indicator", m => { m.items[0].questions[0].indicatorId = "TEST-MISSING"; }, /INDICATOR_LINK/],
    ["version", m => { m.structureVersion = 99; }, /structuurversie/],
  ]) await t.test(name, async st => {
    const f = await admittedFixture(st, { editModel });
    await assert.rejects(buildLocalDatabase(f.options), error);
    assert.equal(existsSync(f.out), false);
  });
});

await test("shared restoration preserves selected and edited own-model questions without mutating catalogue data", async t => {
  const f = await admittedFixture(t), original = structuredClone(f.packages[0].model);
  const restored = structureModelData(original);
  restored.selected = true; restored.items[0].included = true;
  Object.assign(restored.items[0].questions[0], { included: true, selectedLevels: ["operational"],
    question: "Mijn eigen formulering", variants: { operational: "Mijn eigen formulering" } });
  const roundtrip = structureModelData(JSON.parse(JSON.stringify(restored)));
  assert.deepEqual(roundtrip, restored);
  assert.deepEqual(original, f.packages[0].model);
});
