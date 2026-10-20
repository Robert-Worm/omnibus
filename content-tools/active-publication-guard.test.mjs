import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { digest } from "./identity.mjs";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { checkRuntimeDatabase } from "../scripts/check-runtime-database.mjs";
import {
  checkActivePublication,
  compareActivePublicationInventory,
} from "./active-publication-guard.mjs";

const options = (f) => ({
  database: f.databasePath,
  release: f.release,
  publication: f.publication,
});
const pack = (id, kind = "report", text = "Synthetic private norm", status = "HOLD") => ({
  id,
  kind,
  title: "Synthetic private title",
  records: [{ id: id + "-1", kind: "norm", status, data: { text } }],
});
const document = (id, text = "Synthetic private passage") => ({
  id,
  title: "Synthetic private source",
  pages: [{ page: 1, text }],
});
// Test-only construction from synthetic inputs, never a production approval generator.
const inventory = (packages = [], documents = []) => ({
  packages: packages.map((p) => ({ kind: p.kind, id: p.id, version: digest(p) })),
  documents: documents.map((d) => ({ id: d.id, version: digest(d) })),
});
const run = (args) =>
  spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./active-publication-guard.mjs", import.meta.url)), ...args],
    { encoding: "utf8" },
  );
const parseOutput = (text) => JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

test("explicit versioned inventory matches independent of ordering/extra metadata", () => {
  const approved = inventory([pack("A"), pack("A", "foundation")], [document("D")]);
  const candidate = structuredClone(approved);
  candidate.packages.reverse();
  candidate.packages[0].title = "Synthetic private title not emitted";
  candidate.documents[0].pages = 10;
  candidate.artifacts = [{ id: "Synthetic private review" }];
  const before = structuredClone(candidate);
  const result = compareActivePublicationInventory(approved, candidate);
  assert.equal(result.status, "ACTIVE_INVENTORY_MATCH");
  assert.equal(result.changes.packages.unchanged, 2);
  assert.equal(result.newContentApproval, false);
  assert.equal(result.redistributionApproval, false);
  assert.equal(result.activated, false);
  assert.equal(
    result.approvedInventoryHash,
    compareActivePublicationInventory(candidate, approved).approvedInventoryHash,
  );
  assert.doesNotMatch(JSON.stringify(result), /Synthetic private|title|pages|artifacts/);
  assert.deepEqual(candidate, before);
});

test("legacy package and document expansion is held even alongside an approved new report", () => {
  const approved = inventory([pack("BASE"), pack("NEW")], [document("BASE"), document("NEW")]);
  const candidate = inventory(
    [pack("BASE"), pack("NEW"), pack("RETIRED", "foundation")],
    [document("BASE"), document("NEW"), document("RETIRED-main")],
  );
  const result = compareActivePublicationInventory(approved, candidate);
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.changes.packages.added, [candidate.packages[2]]);
  assert.deepEqual(result.changes.documents.added, [candidate.documents[2]]);
});

test("document-only expansion and same-count replacements cannot hide behind package counts", () => {
  const approved = inventory([pack("BASE")], [document("BASE")]);
  const candidate = inventory([pack("BASE")], [document("BASE"), document("EXTRA")]);
  assert.equal(compareActivePublicationInventory(approved, candidate).status, "HOLD");
  const replacement = inventory([pack("OTHER", "foundation")], [document("OTHER")]);
  const result = compareActivePublicationInventory(approved, replacement);
  for (const category of ["packages", "documents"]) {
    assert.equal(result.changes[category].added.length, 1);
    assert.equal(result.changes[category].removed.length, 1);
  }
  assert.equal(result.status, "HOLD");
});

test("changed payload/status versions and removals require an explicit inventory revision", () => {
  const approved = inventory([pack("BASE")], [document("BASE")]);
  for (const candidate of [
    inventory([pack("BASE", "report", "Synthetic changed text")], [document("BASE")]),
    inventory([pack("BASE", "report", "Synthetic private norm", "READY")], [document("BASE")]),
    inventory([pack("BASE")], [document("BASE", "Synthetic longer source")]),
    inventory(),
  ]) {
    const result = compareActivePublicationInventory(approved, candidate);
    assert.equal(result.status, "HOLD");
    assert.equal(
      compareActivePublicationInventory(candidate, candidate).status,
      "ACTIVE_INVENTORY_MATCH",
    );
    assert.notEqual(
      result.approvedInventoryHash,
      compareActivePublicationInventory(candidate, candidate).approvedInventoryHash,
    );
  }
});

test("missing arrays, malformed identities, missing versions and duplicate identities fail closed", () => {
  const approved = inventory([pack("BASE")], [document("BASE")]);
  const badValues = [null, [], {}, { packages: [] }, { documents: [] }];
  for (const category of ["packages", "documents"]) {
    for (const row of [
      null,
      [],
      { ...approved[category][0], id: "" },
      { ...approved[category][0], id: " BASE " },
      { ...approved[category][0], id: "BASE\n" },
      { ...approved[category][0], version: undefined },
      { ...approved[category][0], version: "*" },
      { ...approved[category][0], version: "A".repeat(64) },
    ])
      badValues.push({ ...approved, [category]: [row] });
    // A distinct version of the same id is still ambiguous.
    badValues.push({
      ...approved,
      [category]: [approved[category][0], { ...approved[category][0], version: "f".repeat(64) }],
    });
  }
  badValues.push({ ...approved, packages: [{ ...approved.packages[0], kind: "" }] });
  for (const invalid of badValues) {
    assert.throws(() => compareActivePublicationInventory(invalid, approved));
    assert.throws(() => compareActivePublicationInventory(approved, invalid));
  }
});

test("new reports work after explicit approval of both package and document; checks preserve DB bytes", (t) => {
  const baseline = inventory([pack("BASE")], [document("BASE")]);
  const packages = [pack("BASE"), pack("NEW")],
    documents = [document("BASE"), document("NEW")];
  const f = runtimeFixture(t, { packages, documents });
  const before = readFileSync(f.databasePath),
    files = readdirSync(f.dir);
  const candidate = options(f);
  assert.equal(checkActivePublication({ approved: baseline, candidate }).status, "HOLD");
  const partial = inventory(packages, [documents[0]]);
  const held = checkActivePublication({ approved: partial, candidate });
  assert.equal(held.status, "HOLD");
  assert.deepEqual(
    held.changes.documents.added.map((row) => row.id),
    ["NEW"],
  );
  const result = checkActivePublication({ approved: inventory(packages, documents), candidate });
  assert.equal(result.status, "ACTIVE_INVENTORY_MATCH");
  assert.deepEqual(result.candidate, { release: f.release, publication: f.publication });
  // Compatible with the full existing metadata inventory, without emitting its titles.
  const full = checkRuntimeDatabase(candidate, { includeInventory: true }).inventory;
  assert.deepEqual(checkActivePublication({ approved: full, candidate }), result);
  assert.deepEqual(readFileSync(f.databasePath), before);
  assert.deepEqual(readdirSync(f.dir), files);
});

test("corrupt content or a wrong explicit pin cannot pass matching inventory", (t) => {
  const f = runtimeFixture(t, { packages: [pack("BASE")], documents: [document("BASE")] });
  const approved = inventory([pack("BASE")], [document("BASE")]);
  assert.throws(() =>
    checkActivePublication({ approved, candidate: { ...options(f), publication: "f".repeat(64) } }),
  );
  // Only a disposable synthetic fixture is modified to exercise integrity failure.
  const db = new DatabaseSync(f.databasePath);
  try {
    db.prepare("UPDATE web_resources SET payload=?").run("{}");
  } finally {
    db.close();
  }
  const before = readFileSync(f.databasePath);
  assert.throws(
    () => checkActivePublication({ approved, candidate: options(f) }),
    /changed delivery resource/,
  );
  assert.deepEqual(readFileSync(f.databasePath), before);
});

test("CLI uses explicit files, UTF-8 BOM, relative database paths, exit codes and redacted errors", (t) => {
  const f = runtimeFixture(t, { packages: [pack("BASE")], documents: [document("BASE")] });
  const approvedPath = join(f.dir, "approved active inventory.json"),
    settingsPath = join(f.dir, "candidate settings.json");
  const approved = inventory([pack("BASE")], [document("BASE")]);
  writeFileSync(approvedPath, "\uFEFF" + JSON.stringify(approved));
  writeFileSync(settingsPath, JSON.stringify({ ...options(f), database: "synthetic.sqlite" }));
  const args = ["--candidate", settingsPath, "--approved", approvedPath];
  const before = readFileSync(f.databasePath),
    settings = readFileSync(settingsPath),
    approvalBytes = readFileSync(approvedPath),
    files = readdirSync(f.dir);
  const matched = run(args);
  assert.equal(matched.status, 0, matched.stderr);
  assert.equal(parseOutput(matched.stdout).status, "ACTIVE_INVENTORY_MATCH");
  assert.deepEqual(readFileSync(approvedPath), approvalBytes);
  writeFileSync(approvedPath, JSON.stringify(inventory()));
  const held = run(args);
  assert.equal(held.status, 1);
  assert.equal(parseOutput(held.stdout).status, "HOLD");
  writeFileSync(approvedPath, '{"Synthetic private malformed approval":');
  for (const values of [
    args,
    [],
    [...args, "--extra", "x"],
    ["--approved", approvedPath, "--approved", approvedPath],
    ["--approved", approvedPath, "--candidate", ""],
    ["--approved", "Synthetic private missing file", "--candidate", settingsPath],
  ]) {
    const failed = run(values);
    assert.equal(failed.status, 1);
    assert.equal(parseOutput(failed.stderr).reason, "INVALID_INPUT_OR_RUNTIME");
    assert.doesNotMatch(failed.stdout + failed.stderr, /Synthetic private/);
  }
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Read-only/);
  assert.match(help.stdout, /redistribution rights/);
  assert.deepEqual(readFileSync(f.databasePath), before);
  assert.deepEqual(readFileSync(settingsPath), settings);
  assert.deepEqual(readdirSync(f.dir), files);
});
