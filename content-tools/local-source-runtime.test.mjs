import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildLocalDatabase } from "./local-database.mjs";
import { sourceRuntimeFixture } from "./test-support/local-source-runtime-fixture.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication } from "../local-data/runtime-publication.mjs";
import { webResource, publicationReadScope } from "../local-data/web-resources.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { projectReportDelivery } from "../scripts/report-delivery-projection.mjs";
import { applyCatalogueEdits } from "../lib/catalogue-runtime.mjs";
import { hydratedModule } from "./local-source-runtime.mjs";

test("admitted report reaches a new pinned viewer publication and lossless lazy delivery", async t => {
  const f = await sourceRuntimeFixture(t), before = readFileSync(f.baseline.databasePath);
  const built = await buildLocalDatabase(f.options);
  assert.equal(built.runtime.status, "LOCAL_READY");
  const reader = new CatalogueRepository(built.database, { readOnly: true });
  try {
    const c = readRuntimePublication(reader, { ...built, contract: runtimeContractHash });
    const read = ref => webResource(reader, built.release, ref.hash), moduleId = "app/report-additions.json";
    const data = structuredClone(c.modules[moduleId]);
    assert.equal(data.corpus[0].framework.lines.length, 0, "norms do not load at startup");
    const projection = projectReportDelivery(c, read);
    for (const part of [...projection.registrations[moduleId]].reverse()) applyCatalogueEdits(data, part.bundle[moduleId]);
    assert.deepEqual(data.corpus[0].framework.lines, f.read("APP-FINAL.json").framework.lines);
    assert.deepEqual(data.catalogue.points, f.read("REUSE-CANDIDATE.json").points);
    assert.deepEqual(data.control_objectives, f.read("REUSE-CANDIDATE.json").control_objectives);
    assert.equal(data.scopeSnapshots.K1.line, JSON.stringify(data.corpus[0].framework.lines[0]));
    assert.equal(data.scopeDecisions.K1[0], "retain");
    assert.equal(c.routing.reports.K1, "FICTIEF");
    assert.deepEqual(read(c.refs.catalogue).reportSummaries.FICTIEF.admittedIds, ["K1"]);
    assert.deepEqual(c.routing.workspaces["process:report-PR12"], ["FICTIEF"]);
    assert.deepEqual(read(c.refs.catalogue).discoveryViews.find(row => row.id === "process:report-PR12").lineIds, ["K1"]);
    const links = read(c.refs.catalogue).themes.filter(row => row.reportIds.includes("FICTIEF"));
    assert(links.some(row => row.id === "process:report-PR12"));
    assert(links.some(row => row.id.startsWith("theme:local-")));
    const source = data.corpus[0].source.databaseSource;
    assert.equal(source.release, built.release);
    assert(publicationReadScope(reader, c).allows(`/api/v1/documents/${source.version}/index`));
    const document = reader.exportRelease(built.release).documents[0];
    assert.deepEqual(document.pages, f.read("APP-FINAL.json").source.pages);
    assert.deepEqual(data.history[0].reportIds, []);
  } finally { reader.close(); }
  assert.deepEqual(readFileSync(f.baseline.databasePath), before);
});

test("a local owner cannot turn a HOLD report projection into selectable content", async t => {
  const f = await sourceRuntimeFixture(t, "report", f => {
    const p = f.read("REUSE-VIEWER-PROJECTION.json"); p.status = "HOLD"; f.set("REUSE-VIEWER-PROJECTION.json", p);
  });
  await assert.rejects(buildLocalDatabase(f.options), /still HOLD/);
  assert.equal(existsSync(f.options.out), false);
});

test("unknown reviewed process fails before publication, not at browser startup", async t => {
  const f = await sourceRuntimeFixture(t, "report", f => {
    const cat = f.read("CATALOGUE.json"); cat.process_mappings[0].process_id = "UNKNOWN"; f.set("CATALOGUE.json", cat);
    f.set("TAXONOMY-SNAPSHOT.json", { processes: { UNKNOWN: { title: "Unknown" } } });
  });
  await assert.rejects(buildLocalDatabase(f.options), /Onbekende beoordeelde proceskoppeling/);
  assert.equal(existsSync(f.options.out), false);
});

test("large frozen baseline is checked and retained by the complete local database route", async t => {
  const f = await sourceRuntimeFixture(t, "report", f => {
    f.baselineRegistry = { corpus: [], retained: Array(10_000).fill("x".repeat(1000)) };
  });
  const built = await buildLocalDatabase(f.options);
  assert.equal(built.runtime.status, "LOCAL_READY");
  const reader = new CatalogueRepository(built.database, { readOnly: true });
  try {
    const fileId = f.paths.get("prior/viewer/app/reviewed-reports.json").id, expected = f.files.get(fileId);
    const artifacts = reader.exportRelease(built.release).artifacts;
    const stored = artifacts.find(artifact => artifact.name === `FICTIEF/files/${fileId}`).data;
    assert.deepEqual(Buffer.from(stored.content, "base64"), expected);
  } finally { reader.close(); }
});

test("incoming authored fields cannot masquerade as delivery references", async t => {
  const f = await sourceRuntimeFixture(t, "framework", f => {
    const cat = f.read("CATALOGUE.json"); cat.context.databaseSource = { schema: 1 }; f.set("CATALOGUE.json", cat);
  });
  await assert.rejects(buildLocalDatabase(f.options), /cannot supply delivery references/);
  assert.equal(existsSync(f.options.out), false);
});

test("framework publication preserves complete chains, actors, exceptions, HOLD and exact pages", async t => {
  const f = await sourceRuntimeFixture(t, "framework"), before = readFileSync(f.baseline.databasePath);
  const built = await buildLocalDatabase(f.options), reader = new CatalogueRepository(built.database, { readOnly: true });
  try {
    const content = readRuntimePublication(reader, { ...built, contract: runtimeContractHash });
    const resources = Object.fromEntries(Object.entries(content.refs).map(([key, ref]) => [key, webResource(reader, built.release, ref.hash)]));
    const moduleId = "lib/topical-reviewed.json", initial = content.modules[moduleId].packages[0];
    assert.deepEqual(initial.catalogue.points, []); assert.deepEqual(initial.documents[0].pages, []);
    const packet = hydratedModule({ content, resources }, moduleId).packages[0];
    assert.deepEqual(packet.catalogue, f.read("CATALOGUE.json"));
    assert.deepEqual(packet.bank, f.read("RECONCILED-SOURCE.json"));
    assert.deepEqual(packet.documents[0].pages, f.read("source/pages.json"));
    assert.deepEqual(resources.catalogue.foundationSummaries.FICTIEF.pointIds, ["K1"]);
    assert.equal(packet.context.kind_label, "Fictief lokaal kader");
    assert.equal(packet.catalogue.objectives[0].control_measure, "Wijs bij ontvangst een behandelaar aan.");
  } finally { reader.close(); }
  assert.deepEqual(readFileSync(f.baseline.databasePath), before);
});

test("framework viewer rejects incomplete chains rather than filling them automatically", async t => {
  const f = await sourceRuntimeFixture(t, "framework", f => {
    const cat = f.read("CATALOGUE.json"); cat.objectives[0].control_measure = ""; f.set("CATALOGUE.json", cat);
  });
  await assert.rejects(buildLocalDatabase(f.options), /Onvolledige beheersketen/);
  assert.equal(existsSync(f.options.out), false);
});

for (const status of ["HOLD", "CONTEXT_ONLY"]) test(`framework ${status} remains outside the selectable publication summary`, async t => {
  const f = await sourceRuntimeFixture(t, "framework", f => {
    const cat = f.read("CATALOGUE.json"); cat.points[0].selection_status = status; f.set("CATALOGUE.json", cat);
  });
  const built = await buildLocalDatabase(f.options), reader = new CatalogueRepository(built.database, { readOnly: true });
  try {
    const content = readRuntimePublication(reader, { ...built, contract: runtimeContractHash });
    const resources = Object.fromEntries(Object.entries(content.refs).map(([key, ref]) => [key, webResource(reader, built.release, ref.hash)]));
    assert.deepEqual(resources.catalogue.foundationSummaries.FICTIEF.pointIds, []);
    assert.equal(hydratedModule({ content, resources }, "lib/topical-reviewed.json").packages[0].catalogue.points[0].selection_status, status);
    if (status === "HOLD") assert.equal(reader.exportRelease(built.release).packages.find(p => p.id === "FICTIEF").records.find(r => r.data.id === "K1").status, "HOLD");
  } finally { reader.close(); }
});
