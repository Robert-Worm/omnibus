import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { WorkbenchStore } from "./store.mjs";
import { saveEvidence } from "./evidence-store.mjs";
import { backupWorkbench, restoreWorkbench, runBackup } from "./backup.mjs";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-workbench-backup-"));
  const path = join(dir, "live.sqlite");
  const store = new WorkbenchStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  store.db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;");
  store.importCsv(
    Buffer.from("titel;url;datum\nTest report;https://example.invalid/report;2026\n"),
    { label: "Test", path: "private/test.csv" },
  );
  const id = store.list({}).rows[0].id;
  store.change(id, {
    revision: 0,
    stage: "reviewing",
    disposition: "active",
    priority: "high",
    note: "Keep the review note",
    reference: "private/review",
  });
  saveEvidence(store.db, {
    planHash: "a".repeat(64),
    results: [],
    links: [{ sourceId: id, kind: "review", facts: { type: "review", decision: "APPROVE" } }],
  });
  return { dir, path, store, id, destination: join(dir, "backup") };
}
function allRows(db) {
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  return Object.fromEntries(
    names.map(({ name }) => [name, db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()]),
  );
}

test("live WAL backup and isolated restore preserve every row, note and historical evidence timestamp", async (t) => {
  const { dir, path, store, id, destination } = fixture(t);
  assert.ok(existsSync(path + "-wal"));
  const before = allRows(store.db);
  const result = await backupWorkbench({ from: path, to: destination });
  assert.equal(result.counts.events, 1);
  assert.equal(result.counts.evidence_runs, 1);
  assert.equal(result.activated, false);
  assert.deepEqual(allRows(store.db), before);
  // Later committed work must not leak into the already completed snapshot.
  store.change(id, {
    revision: 1,
    stage: "reviewing",
    disposition: "revision",
    priority: "normal",
    note: "Later change",
    reference: "private/review",
  });
  const restoredPath = join(dir, "restored.sqlite");
  const restored = await restoreWorkbench({
    from: destination,
    to: restoredPath,
    expectSha256: result.receiptSha256,
  });
  assert.equal(restored.activated, false);
  assert.equal(restored.evidenceReverified, false);
  const reopened = new WorkbenchStore(restoredPath);
  try {
    assert.deepEqual(allRows(reopened.db), before);
    assert.equal(reopened.detail(id).history[0].note, "Keep the review note");
    assert.equal(reopened.list({ evidence: "review" }).total, 1);
  } finally {
    reopened.close();
  }
  assert.equal(store.detail(id).revision, 2);
  assert.ok(!readdirSync(dir).some((name) => name.startsWith(".workbench-restore-")));
});

test("backup and restore never overwrite an existing directory, file or SQLite sidecar", async (t) => {
  const { dir, path, store, destination } = fixture(t);
  const result = await backupWorkbench({ from: path, to: destination });
  const bytes = readFileSync(join(destination, "backlog.sqlite"));
  await assert.rejects(backupWorkbench({ from: path, to: destination }));
  assert.deepEqual(readFileSync(join(destination, "backlog.sqlite")), bytes);
  const before = allRows(store.db);
  await assert.rejects(
    restoreWorkbench({ from: destination, to: path, expectSha256: result.receiptSha256 }),
  );
  assert.deepEqual(allRows(store.db), before);
  const target = join(dir, "orphan.sqlite");
  writeFileSync(target + "-wal", "do not change");
  await assert.rejects(
    restoreWorkbench({ from: destination, to: target, expectSha256: result.receiptSha256 }),
  );
  assert.equal(readFileSync(target + "-wal", "utf8"), "do not change");
  assert.equal(existsSync(target), false);
});

test("changed receipt, missing pin, altered database and incomplete backup fail without a restore", async (t) => {
  const { dir, path, destination } = fixture(t);
  const result = await backupWorkbench({ from: path, to: destination });
  const to = join(dir, "restored.sqlite");
  const options = { from: destination, to, expectSha256: result.receiptSha256 };
  await assert.rejects(restoreWorkbench({ ...options, expectSha256: undefined }));
  await assert.rejects(restoreWorkbench({ ...options, expectSha256: "0".repeat(64) }));
  const receiptPath = join(destination, "backup.json"),
    original = readFileSync(receiptPath);
  writeFileSync(receiptPath, original.toString().replace('"version": 1', '"version": 2'));
  await assert.rejects(restoreWorkbench(options), /herstelbewijs/);
  writeFileSync(receiptPath, original);
  const dbPath = join(destination, "backlog.sqlite");
  const db = new DatabaseSync(dbPath);
  db.prepare("UPDATE events SET note=?").run("Changed text");
  db.close();
  await assert.rejects(restoreWorkbench(options), /gewijzigd of beschadigd/);
  await assert.rejects(restoreWorkbench({ ...options, from: dir }));
  assert.equal(existsSync(to), false);
  assert.ok(!readdirSync(dir).some((name) => name.startsWith(".workbench-restore-")));
});

test("wrong database, unsupported version and broken relationships are refused read-only", async (t) => {
  const { dir, path, store, destination } = fixture(t);
  const wrong = join(dir, "catalogue.sqlite"),
    foreign = new DatabaseSync(wrong);
  foreign.exec("CREATE TABLE catalogue(id TEXT)");
  foreign.close();
  const original = readFileSync(wrong);
  await assert.rejects(backupWorkbench({ from: wrong, to: destination }), /geen ondersteunde/);
  assert.deepEqual(readFileSync(wrong), original);
  await assert.rejects(backupWorkbench({ from: join(dir, "missing.sqlite"), to: destination }));
  assert.equal(existsSync(join(dir, "missing.sqlite")), false);
  store.db.exec("PRAGMA ignore_check_constraints=ON; UPDATE workbench_schema SET version=2");
  await assert.rejects(backupWorkbench({ from: path, to: destination }), /versie/);
  store.db.exec(
    "UPDATE workbench_schema SET version=1; PRAGMA foreign_keys=OFF; DELETE FROM sources",
  );
  await assert.rejects(backupWorkbench({ from: path, to: destination }), /integriteitscontrole/);
  assert.equal(existsSync(destination), false);
});

test("operator command validates arguments and exercises backup and restore", async (t) => {
  const { dir, path, destination } = fixture(t);
  for (const args of [
    [],
    ["upload"],
    ["backup", "--from", path, "--from", path],
    ["restore", "--from", path, "--to", destination],
    ["backup", "--from", path, "--force", destination],
  ])
    await assert.rejects(runBackup(args), /Gebruik:/);
  const result = await runBackup(["backup", "--from", path, "--to", destination]);
  const restored = await runBackup([
    "restore",
    "--to",
    join(dir, "restored.sqlite"),
    "--from",
    destination,
    "--expect-sha256",
    result.receiptSha256,
  ]);
  assert.equal(restored.counts.sources, 1);
});
