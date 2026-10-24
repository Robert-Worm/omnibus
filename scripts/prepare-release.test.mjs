import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { bereidReleaseVoor, datumTekst, inhoudVan, kaderCode, maakZip, releasenotities, sha256, verwerktVoorstel } from "./prepare-release.mjs";
import { createReleaseFixture } from "./prepare-release-fixture.mjs";
import { checkRuntimeDatabase } from "./check-runtime-database.mjs";
import { readDatabaseSettings } from "./database-build-options.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { publishRuntime } from "../local-data/runtime-publication.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";

function leesZip(buf) {
  const uit = {};
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const methode = buf.readUInt16LE(p + 8), grootte = buf.readUInt32LE(p + 18), nLen = buf.readUInt16LE(p + 26), xLen = buf.readUInt16LE(p + 28);
    const naam = buf.subarray(p + 30, p + 30 + nLen).toString();
    const data = buf.subarray(p + 30 + nLen + xLen, p + 30 + nLen + xLen + grootte);
    uit[naam] = methode === 8 ? inflateRawSync(data) : data;
    p += 30 + nLen + xLen + grootte;
  }
  return uit;
}

function werkmap() {
  const dir = mkdtempSync(path.join(tmpdir(), "release-"));
  const { settings } = createReleaseFixture(path.join(dir, "fictief"));
  return { dir, settings };
}

function pakUit(zip, destination) {
  mkdirSync(destination);
  const inhoud = leesZip(zip);
  for (const [name, bytes] of Object.entries(inhoud)) writeFileSync(path.join(destination, name), bytes);
  return readDatabaseSettings(path.join(destination, "local-build.json"));
}

await test("datum in gewone taal", () => {
  assert.equal(datumTekst("2026-11-30"), "30 november 2026");
});

await test("de zip bevat database, instellingen, LEESMIJ en controlegetallen die kloppen", async () => {
  const { dir, settings } = werkmap();
  try {
    const out = path.join(dir, "uit");
    const before = readFileSync(settings.database);
    const r = await bereidReleaseVoor({ settings, out, datum: "2026-11-30" });
    assert.equal(r.zip, "omnibus-database-2026-11-30.zip");
    assert.deepEqual([r.rapporten, r.kaders, r.modellen], [1, 2, 1]);
    const zip = readFileSync(path.join(out, r.zip));
    const inhoud = leesZip(zip);
    assert.deepEqual(Object.keys(inhoud), ["catalogue.sqlite", "local-build.json", "LEESMIJ.txt", "SHA256SUMS.txt"]);
    assert.equal(JSON.parse(inhoud["local-build.json"]).database, "catalogue.sqlite");
    assert.match(inhoud["LEESMIJ.txt"].toString(), /30 november 2026[\s\S]*1 onderzoeksrapporten[\s\S]*Fictief wet; Fictief kader/);
    for (const regel of inhoud["SHA256SUMS.txt"].toString().trim().split("\n")) {
      const [hash, naam] = regel.split(/\s+/);
      assert.equal(sha256(inhoud[naam]), hash, naam);
    }
    assert.match(readFileSync(path.join(out, "SHA256SUMS.txt"), "utf8"), new RegExp(`^${sha256(zip)}  ${r.zip}`));
    assert.match(readFileSync(path.join(out, "releasenotities.md"), "utf8"), /# Database 30 november 2026[\s\S]*Nieuw in deze release/);
    const received = pakUit(zip, path.join(dir, "ontvangen"));
    const checked = checkRuntimeDatabase(received);
    assert.equal(checked.status, "VERIFIED_RUNTIME_DATABASE");
    assert.deepEqual([checked.packages, checked.records, checked.documents, checked.sourcePages, checked.sourceArtifacts], [4, 5, 1, 2, 1]);
    assert.equal(checked.newContentApproval, false);
    const reader = new CatalogueRepository(received.database, { readOnly: true });
    try {
      assert.equal(reader.db.prepare("SELECT count(*) AS n FROM records WHERE status='HOLD'").get().n, 5);
    } finally { reader.close(); }
    assert.deepEqual(readFileSync(settings.database), before);
    assert.equal(readdirSync(dir).some((name) => name.startsWith(".omnibus-release-")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test("een database die de controle niet haalt, levert niets op", async () => {
  const { dir, settings } = werkmap();
  try {
    const out = path.join(dir, "uit");
    await assert.rejects(bereidReleaseVoor({ settings: { ...settings, publication: "f".repeat(64) }, out, datum: "2026-11-30" }), /changed publication/);
    assert.equal(existsSync(out), false);
    await assert.rejects(bereidReleaseVoor({ settings, out: dir, datum: "2026-11-30" }), /bestaat al/);
    await assert.rejects(bereidReleaseVoor({ settings, out, datum: "30-11-2026" }), /jjjj-mm-dd/);
    const writer = new CatalogueRepository(settings.database);
    try { writer.db.exec("UPDATE records SET status='APPROVED'"); } finally { writer.close(); }
    await assert.rejects(bereidReleaseVoor({ settings, out, datum: "2026-11-30" }), /Release content verification failed/);
    assert.equal(existsSync(out), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test("de zip bevat ook de gecommitte publicatie die nog in het WAL staat", async () => {
  const { dir, settings } = werkmap();
  const writer = new CatalogueRepository(settings.database);
  try {
    writer.db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0");
    const value = JSON.parse(writer.db.prepare("SELECT payload FROM runtime_publications").get().payload);
    value.summary.walRehearsal = true;
    settings.publication = publishRuntime(writer, value, { release: settings.release, contract: runtimeContractHash });
    assert.equal(checkRuntimeDatabase(settings).status, "VERIFIED_RUNTIME_DATABASE");
    const mainOnly = path.join(dir, "main-only.sqlite");
    writeFileSync(mainOnly, readFileSync(settings.database));
    assert.throws(() => checkRuntimeDatabase({ ...settings, database: mainOnly }), /changed publication/);
    const out = path.join(dir, "uit");
    const r = await bereidReleaseVoor({ settings, out, datum: "2026-11-30" });
    const received = pakUit(readFileSync(path.join(out, r.zip)), path.join(dir, "ontvangen"));
    assert.equal(checkRuntimeDatabase(received).publication, settings.publication);
  } finally {
    writer.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

await test("de echte CLI houdt ontbrekende koppelingen tegen en maakt daarna een controleerbare bundel", () => {
  const { dir, settings } = werkmap();
  try {
    const cli = fileURLToPath(new URL("prepare-release.mjs", import.meta.url));
    const args = [cli, "--settings", path.join(path.dirname(settings.database), "local-build.json"), "--date", "2026-11-30"];
    const run = (out, extra = []) => spawnSync(process.execPath, [...args, "--out", out, ...extra], { encoding: "utf8", windowsHide: true });
    const held = run(path.join(dir, "hold"));
    assert.equal(held.status, 1, held.stderr);
    assert.match(held.stderr, /HOLD: geen Rijksmap-ID voor FICTIEF-RAPPORT/);
    assert.doesNotMatch(held.stdout, /Klaar|Lokaal voorbereid/);
    const out = path.join(dir, "gereed");
    const ready = run(out, ["--rapport", "fictief-oefenrapport=FICTIEF-RAPPORT"]);
    assert.equal(ready.status, 0, ready.stderr);
    assert.match(ready.stdout, /Lokaal voorbereid/);
    const received = pakUit(readFileSync(path.join(out, "omnibus-database-2026-11-30.zip")), path.join(dir, "ontvangen"));
    assert.equal(checkRuntimeDatabase(received).status, "VERIFIED_RUNTIME_DATABASE");
    assert.deepEqual(JSON.parse(readFileSync(path.join(out, "verwerkt.json"))).rapporten, { "fictief-oefenrapport": "FICTIEF-RAPPORT" });
    const originalZip = readFileSync(path.join(out, "omnibus-database-2026-11-30.zip"));
    assert.equal(run(out).status, 1);
    assert.deepEqual(readFileSync(path.join(out, "omnibus-database-2026-11-30.zip")), originalZip);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

await test("de zip-schrijver maakt een geldige zip", () => {
  const zip = maakZip([{ naam: "a.txt", inhoud: Buffer.from("hallo") }]);
  assert.equal(leesZip(zip)["a.txt"].toString(), "hallo");
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
});

await test("een voorstel voor verwerkt.json: nieuwe en verdwenen bronnen, en wat nog een Rijksmap-ID mist", () => {
  const huidig = { database: "2026-10-19", toelichting: "t", rapporten: { "2025-oud": "OUD25", "2025-weg": "WEG25" }, wettenEnKaders: ["WWKE", "TR-CYBER"], modellen: 1 };
  const inhoud = inhoudVan([
    { id: "OUD25", kind: "report", title: "Oud rapport" }, { id: "NIEUW26", kind: "report", title: "Nieuw rapport" }, { id: "LOS26", kind: "report", title: "Los rapport" },
    { id: "WWKE-20260815-ASTRA-R1", kind: "law", title: "Wwke" }, { id: "TR-CYBER", kind: "foundation", title: "Cyber" }, { id: "TR-THIRD", kind: "foundation", title: "Third" },
    { id: "M1", kind: "model", title: "M" }, { id: "M2", kind: "model", title: "M2" },
  ]);
  const v = verwerktVoorstel({ huidig, inhoud, datum: "2026-11-30", koppelingen: { "2026-nieuw": "NIEUW26" }, kaderCodes: ["TR-THIRD"] });
  assert.deepEqual(v.verwerkt, { database: "2026-11-30", toelichting: "t", rapporten: { "2025-oud": "OUD25", "2026-nieuw": "NIEUW26" }, wettenEnKaders: ["WWKE", "TR-CYBER", "TR-THIRD"], modellen: 2 });
  assert.deepEqual(v.nieuw.rapporten.map((p) => p.id), ["NIEUW26", "LOS26"]);
  assert.deepEqual(v.nieuw.kaders, ["TR-THIRD"]);
  assert.deepEqual(v.weg, { rapporten: ["WEG25"], kaders: [] });
  assert.deepEqual(v.ontbreekt, ["LOS26"]);
  const notities = releasenotities({ datum: "2026-11-30", inhoud, zipNaam: "z.zip", catalogusHash: "c", release: "a".repeat(64), publicatie: "b".repeat(64), grootteMB: 1, wijzigingen: v, claims: ["12", "15"] });
  assert.match(notities, /Rapport: Nieuw rapport[\s\S]*Wet of kader: TR-THIRD[\s\S]*Niet meer in de database: rapport WEG25[\s\S]*Claims: #12, #15/);
  assert.doesNotMatch(notities, /vul aan/);
});

await test("kaderCode kiest de langste passende code", () => {
  assert.equal(kaderCode("CIO2026-REEXTRACT-1", ["CIO2026", "CIO"]), "CIO2026");
  assert.equal(kaderCode("ONBEKEND", ["WWKE"]), null);
});
