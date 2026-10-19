import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { digest } from "../local-data/repository.mjs";
import { checkRuntimeDatabase } from "./check-runtime-database.mjs";

test("preflight verifies the pinned publication without modifying files or approving content", (t) => {
  const f = runtimeFixture(t),
    before = readFileSync(f.databasePath);
  const result = checkRuntimeDatabase({ ...f, database: f.databasePath });
  assert.equal(result.status, "VERIFIED_RUNTIME_DATABASE");
  assert.equal(result.newContentApproval, false);
  assert.equal(result.resources, 1);
  assert.equal(result.packages, 0);
  assert.deepEqual(readFileSync(f.databasePath), before);
  const missing = join(f.dir, "missing.sqlite");
  assert.throws(() => checkRuntimeDatabase({ ...f, database: missing }));
  assert.equal(existsSync(missing), false);
});

test("preflight rejects wrong pins and tampered delivery data", (t) => {
  const f = runtimeFixture(t),
    options = { ...f, database: f.databasePath };
  assert.throws(
    () => checkRuntimeDatabase({ ...options, publication: "f".repeat(64) }),
    /changed publication/,
  );
  assert.throws(
    () => checkRuntimeDatabase({ ...options, release: "f".repeat(64) }),
    /unknown release/,
  );
  const db = new DatabaseSync(f.databasePath);
  try {
    db.prepare("UPDATE web_resources SET payload=?").run('{"changed":true}');
  } finally {
    db.close();
  }
  assert.throws(() => checkRuntimeDatabase(options), /changed delivery resource/);
});

test("preflight rejects a correctly hashed publication that lacks required application modules", (t) => {
  const f = runtimeFixture(t),
    db = new DatabaseSync(f.databasePath);
  let publication;
  try {
    const value = JSON.parse(db.prepare("SELECT payload FROM runtime_publications").get().payload);
    delete value.modules[Object.keys(value.modules)[0]];
    const payload = JSON.stringify(value);
    publication = digest(payload);
    db.prepare("UPDATE runtime_publications SET hash=?,payload=?").run(publication, payload);
  } finally {
    db.close();
  }
  assert.throws(
    () => checkRuntimeDatabase({ ...f, database: f.databasePath, publication }),
    /module contract/,
  );
});

test("preflight rejects broken relational references even if the publication is unchanged", (t) => {
  const f = runtimeFixture(t),
    db = new DatabaseSync(f.databasePath, { enableForeignKeyConstraints: false });
  try {
    db.prepare("INSERT INTO release_packages VALUES(?,?)").run(f.release, "missing-package");
  } finally {
    db.close();
  }
  assert.throws(
    () => checkRuntimeDatabase({ ...f, database: f.databasePath }),
    /broken references/,
  );
});

const sourceFixture = {
  packages: [
    {
      id: "TEST",
      kind: "framework",
      title: "Synthetic",
      records: [
        {
          id: "TEST-1",
          kind: "norm",
          title: "Synthetic norm",
          status: "HOLD",
          data: { text: "Fixture only" },
        },
      ],
    },
  ],
  documents: [
    {
      id: "TEST-DOC",
      title: "Synthetic source",
      pages: [
        { page: 1, text: "A😀" },
        { page: 2, text: "é B" },
      ],
    },
  ],
  artifacts: [{ name: "synthetic-review", data: { approved: false } }],
};

test("preflight rejects source, index and inventory tampering even when SQLite and delivery files are intact", (t) => {
  const f = runtimeFixture(t, sourceFixture),
    before = readFileSync(f.databasePath);
  for (const sql of [
    "UPDATE packages SET title='Changed indexed title'",
    "UPDATE records SET status='APPROVED'",
    "UPDATE records SET payload=json_set(payload,'$.data.text','Changed norm')",
    "UPDATE documents SET metadata=json_set(metadata,'$.title','Changed source')",
    "UPDATE documents SET page_count=99",
    "UPDATE pages SET payload=json_set(payload,'$.text','Changed page') WHERE number=1",
    "UPDATE pages SET start_cp=1 WHERE number=1",
    "UPDATE pages SET sha256='changed' WHERE number=1",
    "UPDATE artifacts SET payload='{}'",
    "UPDATE releases SET manifest=json_set(manifest,'$.baselineVersion','Changed')",
    "DELETE FROM release_documents",
  ]) {
    // Each case starts from identical synthetic bytes. Avoid publishing the same
    // fixture eleven times; every SQLite handle is closed before restoring it.
    writeFileSync(f.databasePath, before);
    const db = new DatabaseSync(f.databasePath);
    try {
      db.exec(sql);
    } finally {
      db.close();
    }
    assert.throws(
      () => checkRuntimeDatabase({ ...f, database: f.databasePath }),
      /Release content verification failed/,
      sql,
    );
  }
});

test("preflight verifies real record and Unicode page inventories without approving or rewriting them", (t) => {
  const f = runtimeFixture(t, sourceFixture),
    before = readFileSync(f.databasePath);
  const result = checkRuntimeDatabase({ ...f, database: f.databasePath });
  assert.equal(result.packages, 1);
  assert.equal(result.records, 1);
  assert.equal(result.documents, 1);
  assert.equal(result.sourcePages, 2);
  assert.equal(result.sourceArtifacts, 1);
  assert.equal(result.newContentApproval, false);
  assert.deepEqual(readFileSync(f.databasePath), before);
});
