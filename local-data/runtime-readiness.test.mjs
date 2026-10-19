import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { CatalogueRepository, digest } from "./repository.mjs";
import { prepareWebResources, publicationReadScope } from "./web-resources.mjs";
import { publishRuntime, readRuntimePublication } from "./runtime-publication.mjs";
import { createRuntimeReadiness } from "./runtime-readiness.mjs";
import { createStaticWeb } from "./static-web.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";

const work = fileURLToPath(new URL("../work/runtime-readiness-tests/", import.meta.url));
const refused = { message: "Runtime readiness startup refused" };
const ready = { ready: true };
const restart = { ready: false, reason: "restart-required" };
const unavailable = { ready: false, reason: "unavailable" };

function fixture(t, { wal = false, contract = digest("synthetic code contract") } = {}) {
  mkdirSync(work, { recursive: true });
  const dir = mkdtempSync(join(work, "case-"));
  const path = join(dir, "synthetic.sqlite");
  const connections = [];
  t.after(() => {
    for (const repo of connections.reverse()) if (repo.db.isOpen) repo.close();
    assert.ok(resolve(dir).startsWith(resolve(work) + sep));
    rmSync(dir, { recursive: true, force: true });
  });
  const open = readOnly => {
    const repo = new CatalogueRepository(path, { readOnly });
    connections.push(repo);
    return repo;
  };
  const writer = open(false);
  if (wal) writer.db.exec("PRAGMA journal_mode=WAL");
  const release = writer.importRelease({
    manifest: { baselineVersion: "synthetic readiness test" }, packages: [], documents: [],
  });
  const refs = prepareWebResources(writer, release, { example: { text: "Synthetic resource" } });
  const value = { format: "omnibus-runtime-publication", schemaVersion: 1, release, contract,
    contentGate: "VERIFIED_APPLICATION_RELEASE", modules: {}, registrations: {},
    refs, routing: {}, summary: {} };
  const publication = publishRuntime(writer, value, { release, contract });
  const pins = { release, publication, contract };
  const repository = open(true);
  const initialize = (expected = pins) => {
    const checked = readRuntimePublication(repository, expected);
    return { pins: expected, value: publicationReadScope(repository, checked) };
  };
  const start = () => createRuntimeReadiness(repository, initialize);
  return { dir, path, writer, repository, open, pins, value, initialize, start };
}

test("startup validation runs once; repeated probes preserve pins, bytes and connection settings", t => {
  const f = fixture(t);
  const before = readFileSync(f.path), files = readdirSync(f.dir);
  let validations = 0;
  const state = createRuntimeReadiness(f.repository, () => {
    validations++;
    return f.initialize();
  });
  const resource = Object.values(f.value.refs)[0].hash;
  assert.equal(state.value.allows(`/api/v1/content/${resource}`), true);
  f.pins.release = digest("caller tried to switch release");
  f.pins.publication = digest("caller tried to switch publication");
  f.pins.contract = digest("caller tried to switch contract");
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    assert.deepEqual(state.probe(), ready);
    samples.push(performance.now() - start);
  }
  assert.equal(validations, 1);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.probe()));
  assert.equal(f.repository.db.prepare("SELECT total_changes() AS n").get().n, 0);
  assert.equal(f.repository.db.prepare("PRAGMA busy_timeout").get().timeout, 5000);
  assert.equal(f.repository.db.prepare("PRAGMA query_only").get().query_only, 1);
  assert.deepEqual(readFileSync(f.path), before);
  assert.deepEqual(readdirSync(f.dir), files);
  samples.sort((a, b) => a - b);
  t.diagnostic(`100 warm synthetic probes: p95=${samples[94].toFixed(3)}ms; max=${samples[99].toFixed(3)}ms (not a hosted capacity result)`);
});

test("wrong or missing explicit pins and missing pinned metadata refuse startup safely", t => {
  const f = fixture(t);
  for (const key of ["release", "publication", "contract"]) {
    for (const value of [undefined, "", digest("other " + key)]) {
      const pins = { ...f.pins, [key]: value };
      assert.throws(() => createRuntimeReadiness(f.repository, () => f.initialize(pins)), refused);
    }
  }
  // Even a faulty callback cannot register absent or missing metadata as ready.
  assert.throws(() => createRuntimeReadiness(f.repository, () => ({
    pins: { ...f.pins, publication: digest("absent publication") },
  })), refused);
  assert.throws(() => createRuntimeReadiness(f.repository, () => ({})), refused);
  f.writer.db.exec("DELETE FROM runtime_publications");
  assert.throws(f.start, refused);
  f.writer.db.exec("DROP TABLE runtime_publications");
  assert.throws(f.start, refused);
});

test("startup retains existing publication byte/resource gates and redacts validator failures", t => {
  const f = fixture(t);
  for (const error of [Error("SELECT private_path FROM secret"), "private path", { path: "private" }]) {
    assert.throws(() => createRuntimeReadiness(f.repository, () => { throw error; }), refused);
  }
  assert.throws(() => createRuntimeReadiness(f.repository, () => Promise.resolve(f.initialize())), refused);
  assert.throws(() => createRuntimeReadiness(f.repository), refused);
  f.writer.db.prepare("UPDATE web_resources SET payload=?").run('{"changed":true}');
  assert.throws(f.start, refused);
});

test("closed, unavailable and writable repositories cannot establish readiness", t => {
  const f = fixture(t);
  assert.throws(() => createRuntimeReadiness(undefined, f.initialize), refused);
  f.writer.db.exec("PRAGMA query_only=ON");
  assert.throws(() => createRuntimeReadiness(f.writer, f.initialize), refused);
  const state = f.start();
  f.repository.close();
  assert.deepEqual(state.probe(), restart);
  assert.throws(f.start, refused);
  // Reopening the handle does not undo CatalogueRepository.close() invalidation.
  f.repository.db.open();
  assert.deepEqual(state.probe(), restart);
  assert.throws(f.start, refused);
});

test("replacing the database handle or retaining a transaction cannot reuse readiness", t => {
  const f = fixture(t);
  const state = f.start(), original = f.repository.db;
  const other = f.open(true);
  f.repository.db = other.db;
  assert.deepEqual(state.probe(), restart);
  f.repository.db = original;
  assert.deepEqual(state.probe(), restart);
  const next = f.start();
  f.repository.db.exec("BEGIN");
  assert.deepEqual(next.probe(), restart);
  assert.throws(f.start, refused);
  f.repository.db.exec("ROLLBACK");
  assert.deepEqual(next.probe(), restart);
});

test("exclusive read blockage is fast, redacted and recoverable only at the original revision", t => {
  const f = fixture(t), state = f.start();
  f.writer.db.exec("BEGIN EXCLUSIVE");
  const started = performance.now();
  assert.deepEqual(state.probe(), unavailable);
  const elapsed = performance.now() - started;
  // A generous local regression ceiling distinguishes immediate failure from
  // inheriting the existing 5000ms SQLite busy wait; it is not an I/O deadline.
  assert.ok(elapsed < 1000, `Lock probe took ${elapsed}ms`);
  assert.equal(f.repository.db.prepare("PRAGMA busy_timeout").get().timeout, 5000);
  f.writer.db.exec("ROLLBACK");
  assert.deepEqual(state.probe(), ready);
  t.diagnostic(`Exclusive lock probe: ${elapsed.toFixed(3)}ms`);
  f.writer.db.exec("BEGIN EXCLUSIVE");
  assert.deepEqual(state.probe(), unavailable);
  f.writer.db.prepare("UPDATE runtime_publications SET payload=?").run(JSON.stringify({ ...f.value, summary: { changed: true } }));
  f.writer.db.exec("COMMIT");
  assert.deepEqual(state.probe(), restart);
  assert.throws(f.start, refused);
});

for (const wal of [false, true]) {
  test(`a commit during startup or afterwards requires revalidation (${wal ? "WAL" : "rollback journal"})`, t => {
    const f = fixture(t, { wal });
    assert.throws(() => createRuntimeReadiness(f.repository, () => {
      const checked = f.initialize();
      f.writer.db.prepare("UPDATE runtime_publications SET payload=?")
        .run(JSON.stringify({ ...f.value, summary: { changedDuringStartup: true } }));
      return checked;
    }), refused);
    f.writer.db.prepare("UPDATE runtime_publications SET payload=?").run(JSON.stringify(f.value));
    const state = f.start();
    // A valid second publication under the SAME release is not a replacement pin.
    const nextValue = { ...f.value, summary: { variant: "second" } };
    const nextPin = publishRuntime(f.writer, nextValue, f.pins);
    assert.notEqual(nextPin, f.pins.publication);
    assert.deepEqual(state.probe(), restart);
    assert.deepEqual(state.probe(), restart);
    // Explicit startup can revalidate the original pins; it does not adopt nextPin.
    const fresh = f.start();
    assert.deepEqual(fresh.probe(), ready);
    f.writer.db.prepare("DELETE FROM runtime_publications WHERE hash=?").run(f.pins.publication);
    assert.deepEqual(fresh.probe(), restart);
    assert.throws(f.start, refused);
    publishRuntime(f.writer, f.value, f.pins);
    assert.deepEqual(fresh.probe(), restart);
    assert.deepEqual(f.start().probe(), ready);
  });
}

test("changed resource bytes never recover by updating the baseline or restoring old bytes", t => {
  const f = fixture(t), state = f.start();
  const original = f.writer.db.prepare("SELECT payload FROM web_resources").get().payload;
  f.writer.db.prepare("UPDATE web_resources SET payload=?").run('{"changed":true}');
  assert.deepEqual(state.probe(), restart);
  assert.throws(f.start, refused);
  f.writer.db.prepare("UPDATE web_resources SET payload=?").run(original);
  assert.deepEqual(state.probe(), restart);
  assert.deepEqual(f.start().probe(), ready);
});

test("unexpected probe errors expose no exception data and never reset publication pins", t => {
  const f = fixture(t), state = f.start();
  const original = f.repository.runtimeReadinessSnapshot;
  f.repository.runtimeReadinessSnapshot = () => { throw Error("SELECT secret FROM private_path"); };
  assert.deepEqual(state.probe(), unavailable);
  f.repository.runtimeReadinessSnapshot = original;
  assert.deepEqual(state.probe(), ready);
  f.repository.db.exec("PRAGMA query_only=OFF");
  assert.deepEqual(state.probe(), restart);
  f.repository.db.exec("PRAGMA query_only=ON");
  assert.deepEqual(state.probe(), restart);
});

test("the existing static web startup gate can be bracketed without duplicating its checks", t => {
  const f = fixture(t, { contract: runtimeContractHash });
  const root = join(f.dir, "web");
  mkdirSync(join(root, "assets"), { recursive: true });
  writeFileSync(join(root, "database.html"), "<!doctype html><title>Synthetic fixture</title>");
  const manifest = { schema: 1, ...f.pins };
  writeFileSync(join(root, "omnibus-release.json"), JSON.stringify(manifest));
  const initialize = () => ({ value: createStaticWeb(root, f.repository), pins: manifest });
  const state = createRuntimeReadiness(f.repository, initialize);
  assert.equal(state.value.readScope.release, f.pins.release);
  assert.deepEqual(state.probe(), ready);
  // Build pin changes are checked on startup, not polled/accepted by readiness.
  writeFileSync(join(root, "omnibus-release.json"), JSON.stringify({
    ...manifest, publication: digest("wrong build pin"),
  }));
  assert.throws(() => createRuntimeReadiness(f.repository, initialize), refused);
});
