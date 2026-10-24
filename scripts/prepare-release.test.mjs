import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { bereidReleaseVoor, datumTekst, inhoudVan, kaderCode, maakZip, releasenotities, sha256, verwerktVoorstel } from "./prepare-release.mjs";

const pakketten = [
  { kind: "report", title: "Rapport A" }, { kind: "report", title: "Rapport B" },
  { kind: "law", title: "Wet X" }, { kind: "foundation", title: "Kader Y" }, { kind: "model", title: "Model Z" },
];

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
  const db = path.join(dir, "catalogue.sqlite");
  writeFileSync(db, "SQLite format 3\0 fictief");
  return { dir, settings: { database: db, release: "a".repeat(64), publication: "b".repeat(64) } };
}

test("datum in gewone taal", () => {
  assert.equal(datumTekst("2026-11-30"), "30 november 2026");
});

test("de zip bevat database, instellingen, LEESMIJ en controlegetallen die kloppen", async () => {
  const { dir, settings } = werkmap();
  try {
    const out = path.join(dir, "uit");
    const r = await bereidReleaseVoor({ settings, out, datum: "2026-11-30", controleer: () => ({ status: "VERIFIED_RUNTIME_DATABASE", packages: pakketten }) });
    assert.equal(r.zip, "omnibus-database-2026-11-30.zip");
    assert.deepEqual([r.rapporten, r.kaders, r.modellen], [2, 2, 1]);
    const zip = readFileSync(path.join(out, r.zip));
    const inhoud = leesZip(zip);
    assert.deepEqual(Object.keys(inhoud), ["catalogue.sqlite", "local-build.json", "LEESMIJ.txt", "SHA256SUMS.txt"]);
    assert.equal(JSON.parse(inhoud["local-build.json"]).database, "catalogue.sqlite");
    assert.match(inhoud["LEESMIJ.txt"].toString(), /30 november 2026[\s\S]*2 onderzoeksrapporten[\s\S]*Wet X; Kader Y/);
    for (const regel of inhoud["SHA256SUMS.txt"].toString().trim().split("\n")) {
      const [hash, naam] = regel.split(/\s+/);
      assert.equal(sha256(inhoud[naam]), hash, naam);
    }
    assert.match(readFileSync(path.join(out, "SHA256SUMS.txt"), "utf8"), new RegExp(`^${sha256(zip)}  ${r.zip}`));
    assert.match(readFileSync(path.join(out, "releasenotities.md"), "utf8"), /# Database 30 november 2026[\s\S]*Nieuw in deze release/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("een database die de controle niet haalt, levert niets op", async () => {
  const { dir, settings } = werkmap();
  try {
    const out = path.join(dir, "uit");
    await assert.rejects(bereidReleaseVoor({ settings, out, datum: "2026-11-30", controleer: () => ({ status: "HOLD" }) }), /runtimecontrole niet/);
    await assert.rejects(bereidReleaseVoor({ settings, out: dir, datum: "2026-11-30", controleer: () => ({ status: "VERIFIED_RUNTIME_DATABASE" }) }), /bestaat al/);
    await assert.rejects(bereidReleaseVoor({ settings, out, datum: "30-11-2026", controleer: () => ({}) }), /jjjj-mm-dd/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("de zip-schrijver maakt een geldige zip", () => {
  const zip = maakZip([{ naam: "a.txt", inhoud: Buffer.from("hallo") }]);
  assert.equal(leesZip(zip)["a.txt"].toString(), "hallo");
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
});

test("een voorstel voor verwerkt.json: nieuwe en verdwenen bronnen, en wat nog een Rijksmap-ID mist", () => {
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

test("kaderCode kiest de langste passende code", () => {
  assert.equal(kaderCode("CIO2026-REEXTRACT-1", ["CIO2026", "CIO"]), "CIO2026");
  assert.equal(kaderCode("ONBEKEND", ["WWKE"]), null);
});
