import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { digest } from "../local-data/repository.mjs";
import { comparePublicationInventories } from "../local-data/publication-inventory.mjs";
import {
  compareRuntimePublications,
  parseComparisonArgs,
} from "./compare-runtime-publications.mjs";

const options = (f) => ({
  database: f.databasePath,
  release: f.release,
  publication: f.publication,
});
const pack = (id, kind, text = "Private norm text", status = "HOLD") => ({
  id,
  kind,
  title: "Synthetic " + id,
  records: [{ id: id + "-1", kind: "norm", title: "Synthetic norm", status, data: { text } }],
});
const document = (text) => ({ id: "DOC", title: "Synthetic source", pages: [{ page: 1, text }] });
const empty = () =>
  Object.fromEntries(
    ["packages", "documents", "artifacts", "modules", "resources", "metadata"].map((key) => [
      key,
      [],
    ]),
  );

test("same publication comparison is read-only and never approves or activates content", (t) => {
  const f = runtimeFixture(t),
    bytes = readFileSync(f.databasePath);
  const result = compareRuntimePublications({ before: options(f), after: options(f) });
  assert.equal(result.newContentApproval, false);
  assert.equal(result.activated, false);
  for (const change of Object.values(result.changes)) {
    assert.deepEqual(change.added, []);
    assert.deepEqual(change.removed, []);
    assert.deepEqual(change.changed, []);
  }
  assert.deepEqual(readFileSync(f.databasePath), bytes);
});

test("pilot comparison exposes additions, removals and same-count edits without source text", (t) => {
  const before = runtimeFixture(t, {
    packages: [pack("FRAME", "framework"), pack("OLD", "report")],
    documents: [document("Private original passage")],
    artifacts: [{ name: "review", data: { text: "Private review" } }],
  });
  const after = runtimeFixture(t, {
    packages: [pack("FRAME", "framework", "Private improved norm"), pack("NEW", "report")],
    documents: [document("Private changed passage")],
    artifacts: [{ name: "review", data: { text: "Private updated review" } }],
  });
  const bytes = [before, after].map((f) => readFileSync(f.databasePath));
  const result = compareRuntimePublications({ before: options(before), after: options(after) });
  assert.deepEqual(
    result.changes.packages.added.map((row) => row.id),
    ["NEW"],
  );
  assert.deepEqual(
    result.changes.packages.removed.map((row) => row.id),
    ["OLD"],
  );
  assert.equal(result.changes.packages.changed[0].before.id, "FRAME");
  assert.equal(result.changes.packages.changed[0].before.records, 1);
  assert.equal(result.changes.packages.changed[0].after.records, 1);
  assert.equal(result.changes.documents.changed.length, 1);
  assert.equal(result.changes.artifacts.changed.length, 1);
  assert.equal(result.changes.resources.unchanged, 1); // Different release does not imply different resource content.
  assert.doesNotMatch(JSON.stringify(result), /Private/);
  [before, after].forEach((f, i) => assert.deepEqual(readFileSync(f.databasePath), bytes[i]));
});

test("status-only package changes are visible", (t) => {
  const before = runtimeFixture(t, { packages: [pack("A", "framework")] });
  const after = runtimeFixture(t, {
    packages: [pack("A", "framework", "Private norm text", "READY")],
  });
  const result = compareRuntimePublications({ before: options(before), after: options(after) });
  assert.equal(result.changes.packages.changed.length, 1);
});

test("runtime-only metadata and module changes are visible even with identical source packages", (t) => {
  const f = runtimeFixture(t),
    before = options(f);
  const db = new DatabaseSync(f.databasePath);
  let publication;
  try {
    const value = JSON.parse(db.prepare("SELECT payload FROM runtime_publications").get().payload);
    value.routing = { synthetic: "changed" };
    value.modules["lib/model-choice-guide.mjs"].guides = {
      synthetic: { use: "Test", concepts: "Synthetic", boundary: "Fixture only" },
    };
    const payload = JSON.stringify(value);
    publication = digest(payload);
    db.prepare(
      "INSERT INTO runtime_publications SELECT release_id,?,? FROM runtime_publications",
    ).run(publication, payload);
  } finally {
    db.close();
  }
  const result = compareRuntimePublications({ before, after: { ...before, publication } });
  assert.equal(result.changes.packages.changed.length, 0);
  assert.deepEqual(
    result.changes.metadata.changed.map((row) => row.after.id),
    ["routing"],
  );
  assert.deepEqual(
    result.changes.modules.changed.map((row) => row.after.id),
    ["lib/model-choice-guide.mjs"],
  );
});

test("identity comparison is order independent, distinguishes kinds and rejects duplicates", () => {
  const before = empty(),
    after = empty();
  before.packages = [
    { kind: "report", id: "A", version: "1" },
    { kind: "framework", id: "A", version: "2" },
  ];
  after.packages = [...before.packages].reverse();
  assert.equal(comparePublicationInventories(before, after).packages.unchanged, 2);
  after.packages.push(after.packages[0]);
  assert.throws(() => comparePublicationInventories(before, after), /duplicate packages/);
  const docs = empty();
  docs.documents = [
    { id: "A", version: "1" },
    { id: "A", version: "2" },
  ];
  assert.throws(() => comparePublicationInventories(docs, empty()), /duplicate documents/);
});

test("either damaged publication fails closed without database writes", (t) => {
  const good = runtimeFixture(t),
    bad = runtimeFixture(t);
  const db = new DatabaseSync(bad.databasePath);
  try {
    db.prepare("UPDATE web_resources SET payload=?").run("{}");
  } finally {
    db.close();
  }
  const bytes = readFileSync(bad.databasePath);
  for (const pair of [
    [good, bad],
    [bad, good],
  ]) {
    assert.throws(
      () => compareRuntimePublications({ before: options(pair[0]), after: options(pair[1]) }),
      /changed delivery resource/,
    );
  }
  assert.deepEqual(readFileSync(bad.databasePath), bytes);
});

test("CLI uses explicit settings, handles spaces, and reports failures without activation", (t) => {
  const f = runtimeFixture(t),
    path = join(f.dir, "local build.json");
  writeFileSync(path, JSON.stringify({ ...options(f), database: "synthetic.sqlite" }));
  const args = ["--before", path, "--after", path];
  assert.deepEqual(parseComparisonArgs(args), { before: options(f), after: options(f) });
  for (const invalid of [
    [],
    ["--before", path, "--before", path],
    ["--before", path, "--after", ""],
    [...args, "--extra", "x"],
  ]) {
    assert.throws(() => parseComparisonArgs(invalid), /Usage/);
  }
  const cli = new URL("./compare-runtime-publications.mjs", import.meta.url);
  const run = (values) =>
    spawnSync(process.execPath, [fileURLToPath(cli), ...values], { encoding: "utf8" });
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).activated, false);
  const failed = run([]);
  assert.equal(failed.status, 1);
  assert.equal(
    JSON.parse(failed.stderr.slice(failed.stderr.indexOf("{"), failed.stderr.lastIndexOf("}") + 1))
      .status,
    "HOLD",
  );
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /read-only/);
});

test("addition-only comparison accepts exactly the planned report, framework and model without approval", (t) => {
  const existing = pack("BASE", "framework");
  const before = runtimeFixture(t, { packages: [existing], documents: [document("Original")] });
  const after = runtimeFixture(t, {
    packages: [
      existing,
      pack("REPORT", "report"),
      pack("FRAME", "framework"),
      pack("MODEL", "model"),
    ],
    documents: [document("Original"), { ...document("New passage"), id: "NEW" }],
    artifacts: [{ name: "review", data: { text: "Private new review" } }],
  });
  const snapshots = [before, after].map((f) => readFileSync(f.databasePath));
  const result = compareRuntimePublications({
    before: options(before),
    after: options(after),
    expectedAdditions: ["model:MODEL", "framework:FRAME", "report:REPORT"],
  });
  assert.equal(result.status, "RUNTIME_DIFFERENCES_REVIEW_REQUIRED");
  assert.equal(result.additionCheck.status, "MATCH");
  assert.deepEqual(result.additionCheck.issues, []);
  assert.equal(result.newContentApproval, false);
  assert.equal(result.activated, false);
  // New documents and review artifacts remain visible, not automatically accepted.
  assert.equal(result.changes.documents.added.length, 1);
  assert.equal(result.changes.artifacts.added.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /Private|New passage/);
  [before, after].forEach((f, i) => assert.deepEqual(readFileSync(f.databasePath), snapshots[i]));
});

test("addition-only comparison blocks missing, unexpected and wrong-kind package additions", (t) => {
  const before = runtimeFixture(t);
  const after = runtimeFixture(t, {
    packages: [pack("NEW", "report"), pack("EXTRA", "framework")],
  });
  const result = compareRuntimePublications({
    before: options(before),
    after: options(after),
    expectedAdditions: ["framework:NEW"],
  });
  assert.equal(result.status, "HOLD");
  assert.equal(result.additionCheck.status, "MISMATCH");
  assert.deepEqual(result.additionCheck.issues, [
    { reason: "EXPECTED_PACKAGE_NOT_ADDED", id: "framework:NEW" },
    { reason: "UNEXPECTED_PACKAGE_ADDED", id: "framework:EXTRA" },
    { reason: "UNEXPECTED_PACKAGE_ADDED", id: "report:NEW" },
  ]);
  const unchanged = compareRuntimePublications({
    before: options(after),
    after: options(after),
    expectedAdditions: ["report:NEW"],
  });
  assert.equal(unchanged.status, "HOLD");
  assert.equal(unchanged.additionCheck.issues[0].reason, "EXPECTED_PACKAGE_NOT_ADDED");
});

test("addition-only comparison blocks same-count edits and removals of existing packages and documents", (t) => {
  const before = runtimeFixture(t, {
    packages: [pack("EDIT", "report"), pack("REMOVE", "framework")],
    documents: [document("Old private passage"), { ...document("Retained source"), id: "REMOVE" }],
  });
  const after = runtimeFixture(t, {
    packages: [pack("EDIT", "report", "Improved private text", "READY"), pack("NEW", "model")],
    documents: [document("Changed private passage")],
  });
  const snapshots = [before, after].map((f) => readFileSync(f.databasePath));
  const result = compareRuntimePublications({
    before: options(before),
    after: options(after),
    expectedAdditions: ["model:NEW"],
  });
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.additionCheck.issues, [
    { reason: "EXISTING_CONTENT_CHANGED", category: "packages", id: "report:EDIT" },
    { reason: "EXISTING_CONTENT_REMOVED", category: "packages", id: "framework:REMOVE" },
    { reason: "EXISTING_CONTENT_CHANGED", category: "documents", id: "DOC" },
    { reason: "EXISTING_CONTENT_REMOVED", category: "documents", id: "REMOVE" },
  ]);
  assert.equal(
    result.changes.packages.changed[0].before.records,
    result.changes.packages.changed[0].after.records,
  );
  assert.equal(result.newContentApproval, false);
  assert.equal(result.activated, false);
  [before, after].forEach((f, i) => assert.deepEqual(readFileSync(f.databasePath), snapshots[i]));
});

test("addition identities are explicit, bounded, unique and validated before database access", () => {
  for (const expectedAdditions of [
    [],
    null,
    "report:NEW",
    ["report:*"],
    ["report:"],
    [" report:NEW"],
    ["report:A", "report:A"],
    ["report:NEW\n"],
    ["x".repeat(65) + ":A"],
    Array.from({ length: 101 }, (_, i) => "report:A" + i),
  ])
    assert.throws(
      () => compareRuntimePublications({ before: {}, after: {}, expectedAdditions }),
      /Expected additions/,
    );
  for (const args of [
    ["--expect-addition", "report:A", "--expect-addition", "report:B"],
    [
      "--before",
      "missing",
      "--after",
      "missing",
      "--expect-addition",
      "report:A",
      "--expect-addition",
      "report:A",
    ],
    ["--before", "missing", "--after", "missing", "--expect-addition"],
  ])
    assert.throws(() => parseComparisonArgs(args), /Usage:/);
});

test("addition CLI keeps differences on HOLD and uses a failure exit code without writes", (t) => {
  const before = runtimeFixture(t),
    after = runtimeFixture(t, { packages: [pack("NEW", "report")] });
  const paths = [before, after].map((f) => {
    const path = join(f.dir, "local build.json");
    writeFileSync(path, JSON.stringify({ ...options(f), database: "synthetic.sqlite" }));
    return path;
  });
  const cli = fileURLToPath(new URL("./compare-runtime-publications.mjs", import.meta.url));
  const run = (expected) =>
    spawnSync(
      process.execPath,
      [cli, "--expect-addition", expected, "--after", paths[1], "--before", paths[0]],
      { encoding: "utf8" },
    );
  const good = run("report:NEW");
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).additionCheck.status, "MATCH");
  const bad = run("framework:NEW");
  assert.equal(bad.status, 1, bad.stderr);
  const result = JSON.parse(bad.stdout);
  assert.equal(result.status, "HOLD");
  assert.equal(result.changes.packages.added[0].id, "NEW");
  assert.equal(result.activated, false);
  // Optional mode does not change the existing review-only comparison contract.
  const ordinary = compareRuntimePublications({ before: options(before), after: options(after) });
  assert.equal(Object.hasOwn(ordinary, "additionCheck"), false);
});
