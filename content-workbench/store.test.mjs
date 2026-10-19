import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { WorkbenchStore, parseCsv, safeWebUrl } from "./store.mjs";
import { saveEvidence } from "./evidence-store.mjs";
const csv = 'titel;url;datum;ministerie\r\n"Test; rapport";https://example.invalid/a;2026;Test\r\n';
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-workbench-"));
  const path = join(dir, "workbench.sqlite");
  const store = new WorkbenchStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { store, path, dir };
}
const importFile = (store, text = csv, label = "Volledige lijst") =>
  store.importCsv(Buffer.from(text), { label, path: "/private/export.csv" });
const change = (extra = {}) => ({
  revision: 0,
  stage: "queued",
  disposition: "active",
  priority: "high",
  note: "Relevant voor pilot",
  reference: "",
  ...extra,
});

test("published workflow lane follows verified evidence without rewriting progress or hiding rework", (t) => {
  const { store } = fixture(t);
  importFile(store);
  const id = store.list({}).rows[0].id;
  const batch = {
    planHash: "a".repeat(64),
    results: [],
    links: [{ sourceId: id, kind: "active", facts: { type: "active" } }],
  };
  saveEvidence(store.db, batch);
  assert.equal(store.list({ stage: "published" }).total, 1);
  assert.equal(store.list({ stage: "new" }).total, 0);
  assert.equal(store.list({}).rows[0].workflowStage, "published");
  assert.deepEqual(
    store.list({}).counts.map((r) => ({ ...r })),
    [{ stage: "published", count: 1 }],
  );
  assert.equal(store.detail(id).stage, "new");
  assert.equal(store.detail(id).history.length, 0);
  assert.throws(() => store.change(id, change({ stage: "published" })));
  store.change(id, change({ stage: "reviewing", disposition: "blocked", reference: "rework" }));
  assert.equal(store.list({ stage: "published" }).total, 0);
  assert.equal(store.list({ stage: "reviewing" }).total, 1);
  assert.equal(store.list({ evidence: "active" }).total, 1);
  store.change(id, change({ revision: 1, stage: "candidate", reference: "checked" }));
  assert.equal(store.list({ stage: "published" }).total, 1);
  saveEvidence(store.db, { ...batch, links: [] });
  assert.equal(store.list({ stage: "published" }).total, 0);
  assert.equal(store.list({ stage: "candidate" }).total, 1);
  assert.equal(store.detail(id).history.length, 2);
});
test("CSV preserves quoted separators, escaped quotes and multiline values; rejects damaged imports", () => {
  assert.equal(parseCsv(csv)[0].titel, "Test; rapport");
  assert.equal(
    parseCsv('titel;url\n"Twee\nregels ""tekst""";https://example.invalid')[0].titel,
    'Twee\nregels "tekst"',
  );
  for (const bad of [
    "titel;titel\nx;y",
    "titel;url\nx",
    'titel;url\n"broken;x',
    'titel;url\n"x"z;y',
  ])
    assert.throws(() => parseCsv(bad));
  assert.equal(safeWebUrl("javascript:alert(1)"), "");
  const credentialUrl = new URL("https://example.invalid");
  credentialUrl.username = "synthetic-user";
  credentialUrl.password = "synthetic-password";
  assert.equal(safeWebUrl(credentialUrl.href), "");
});
test("imports are repeatable, retain raw provenance and share identities across collections", (t) => {
  const { store } = fixture(t);
  importFile(store);
  assert.equal(importFile(store).repeated, true);
  importFile(store, csv, "Non-assurance");
  assert.equal(store.overview().sources, 1);
  const row = store.list({ collection: "Non-assurance" }).rows[0];
  const detail = store.detail(row.id);
  assert.equal(detail.origins.length, 2);
  assert.equal(detail.origins[0].row_number, 1);
  assert.equal(detail.origins[0].raw.titel, "Test; rapport");
  store.change(row.id, change());
  importFile(store, csv.replace(";Test\r", ";New ministry\r"));
  assert.equal(store.detail(row.id).priority, "high");
  assert.equal(store.detail(row.id).origins.length, 3);
});
test("same URL with different titles is not silently collapsed; bad rows import nothing", (t) => {
  const { store } = fixture(t);
  importFile(store);
  importFile(store, csv.replace("Test; rapport", "Another report"));
  assert.equal(store.overview().sources, 2);
  assert.equal(store.list({}).rows[0].shared_url_count, 2);
  assert.equal(store.detail(store.list({}).rows[0].id).related.length, 1);
  assert.throws(() => importFile(store, csv + "Broken;file:///secret;2025;x\n"));
  assert.equal(store.overview().imports.length, 2);
});
test("progress changes persist with history and reject stale writes and fake publication", (t) => {
  const { store, path } = fixture(t);
  importFile(store);
  const id = store.list({}).rows[0].id;
  const result = store.change(id, change());
  assert.equal(result.revision, 1);
  assert.throws(
    () => store.change(id, change()),
    (e) => e.status === 409,
  );
  assert.throws(() => store.change(id, change({ revision: 1, stage: "published" })));
  assert.throws(() => store.change(id, change({ revision: 1, stage: "candidate" })));
  store.change(
    id,
    change({
      revision: 1,
      stage: "reviewing",
      reference: "Private review dossier",
      disposition: "blocked",
    }),
  );
  const second = new WorkbenchStore(path);
  try {
    assert.equal(second.detail(id).history.length, 2);
    assert.equal(second.detail(id).disposition, "blocked");
  } finally {
    second.close();
  }
  assert.equal(store.overview().publicationLinked, false);
});
test("filters are bounded and parameterized; counts do not multiply collection memberships", (t) => {
  const { store } = fixture(t);
  importFile(store);
  importFile(store, csv, "Subset");
  assert.equal(store.list({}).total, 1);
  assert.equal(store.list({}).counts[0].count, 1);
  assert.equal(store.list({ q: "' OR 1=1 --" }).total, 0);
  assert.equal(store.list({ q: "rapport" }).total, 1);
  for (const value of [{ limit: 101 }, { offset: -1 }, { stage: "invented" }, { unexpected: true }])
    assert.throws(() => store.list(value));
});
test("opening the source catalogue as a workbench is refused without adding tables", (t) => {
  const { dir } = fixture(t);
  const path = join(dir, "catalogue.sqlite");
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE packages(id TEXT)");
  db.close();
  assert.throws(() => new WorkbenchStore(path), /geen Workbench/);
  const read = new DatabaseSync(path, { readOnly: true });
  assert.deepEqual(
    read
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name),
    ["packages"],
  );
  read.close();
});
