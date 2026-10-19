import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDatabaseBuildArgs, readDatabaseSettings } from "./database-build-options.mjs";
import { parsePreviewArgs } from "./serve-database-web.mjs";

const release = "a".repeat(64),
  publication = "b".repeat(64);
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-settings-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "local-build.json");
  const settings = { database: "catalogue.sqlite", release, publication };
  writeFileSync(file, JSON.stringify(settings));
  return { dir, file, settings };
}

test("one explicit settings file resolves database relative to itself for build and preview", (t) => {
  const { dir, file } = fixture(t),
    expected = { database: join(dir, "catalogue.sqlite"), release, publication };
  assert.deepEqual(readDatabaseSettings(file), expected);
  assert.deepEqual(parseDatabaseBuildArgs(["--settings", file]), expected);
  assert.deepEqual(parsePreviewArgs(["--port", "4320", "--settings", file]), {
    databasePath: expected.database,
    release,
    publication,
    port: 4320,
  });
  // Moving a publication folder needs no edit to its relative settings.
  const moved = join(dir, "moved");
  mkdirSync(moved);
  writeFileSync(
    join(moved, "local-build.json"),
    JSON.stringify({ database: "catalogue.sqlite", release, publication }),
  );
  assert.equal(
    readDatabaseSettings(join(moved, "local-build.json")).database,
    join(moved, "catalogue.sqlite"),
  );
});

test("configuration rejects incomplete, unknown, malformed and oversized input", (t) => {
  const { file, settings } = fixture(t);
  for (const value of [
    null,
    [],
    {},
    { ...settings, release: "latest" },
    { ...settings, publication: 42 },
    { ...settings, database: "" },
    { ...settings, database: " " },
    { ...settings, database: "bad\0path" },
    { ...settings, apiKey: "not-a-real-secret" },
    { ...settings, host: "0.0.0.0" },
  ]) {
    writeFileSync(file, JSON.stringify(value));
    assert.throws(() => readDatabaseSettings(file), /Invalid database settings/);
  }
  for (const bytes of ["{broken", " ".repeat(16385)]) {
    writeFileSync(file, bytes);
    assert.throws(() => readDatabaseSettings(file), /Invalid database settings/);
  }
});

test("settings cannot be mixed with overrides, discovered implicitly or silently ignored", (t) => {
  const { file } = fixture(t);
  for (const args of [
    [],
    ["--settings"],
    ["--settings", file, "--settings", file],
    ["--settings", file, "--database", "another.sqlite"],
    ["--settings", file, "--release", release],
  ]) {
    assert.throws(() => parseDatabaseBuildArgs(args), /Usage/);
    assert.throws(() => parsePreviewArgs(args), /Usage/);
  }
  assert.throws(() => readDatabaseSettings(file + ".missing"), /ENOENT/);
});

test("Windows UTF-8 settings keep exact pins and paths without accepting other encodings or overrides", (t) => {
  const {file,dir,settings}=fixture(t);
  const value={...settings,database:'gegevens met spaties.sqlite'};
  writeFileSync(file,'\uFEFF'+JSON.stringify(value,null,2)+'\r\n');
  const expected={...value,database:join(dir,value.database)};
  assert.deepEqual(readDatabaseSettings(file),expected);
  assert.deepEqual(parseDatabaseBuildArgs(['--settings',file]),expected);
  assert.equal(parsePreviewArgs(['--settings',file]).databasePath,expected.database);
  for(const bytes of [
    '\uFEFF'+JSON.stringify({...value,publication:'latest'}),
    '\uFEFF'+JSON.stringify({...value,host:'0.0.0.0'}),
    '\uFEFF\uFEFF'+JSON.stringify(value),
    Buffer.from('\uFEFF'+JSON.stringify(value),'utf16le'),
  ]){
    writeFileSync(file,bytes);
    assert.throws(()=>readDatabaseSettings(file),/Invalid database settings/);
  }
});
