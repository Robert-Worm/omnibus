import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { bestaande, haalNaarRuntime, kiesVersie, RUNTIME } from "./database-ophalen.mjs";
import { DATABASE_SHA256, DATABASE_URL } from "./database-release.mjs";
import { maakZip } from "./prepare-release.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const URL_OK = "https://github.com/x/y/releases/download/database-1/db.zip";
function zip(db = "nieuw") {
  const lijst = [{ naam: "catalogue.sqlite", inhoud: Buffer.from(db) }, { naam: "local-build.json", inhoud: Buffer.from("{}") }];
  const sums = lijst.map((b) => `${sha(b.inhoud)}  ${b.naam}`).join("\n") + "\n";
  return maakZip([...lijst, { naam: "SHA256SUMS.txt", inhoud: Buffer.from(sums) }]);
}
const metMap = async (f) => { const d = mkdtempSync(path.join(tmpdir(), "ophalen-")); try { await f(d); } finally { rmSync(d, { recursive: true, force: true }); } };

test("zonder opties de vastgelegde versie; een andere alleen met adres én controlegetal", () => {
  assert.deepEqual(kiesVersie(), { url: DATABASE_URL, sha256: DATABASE_SHA256, vastgelegd: true });
  assert.throws(() => kiesVersie({ url: URL_OK }), /zowel --url als --sha256/);
  assert.throws(() => kiesVersie({ sha256: "a".repeat(64) }), /zowel --url als --sha256/);
  assert.equal(kiesVersie({ url: URL_OK, sha256: "A".repeat(64) }).vastgelegd, false);
  assert.equal(kiesVersie({ url: URL_OK, sha256: "A".repeat(64) }).sha256, "a".repeat(64));
});

test("haalt op, controleert en zet de database in local-data/runtime", () => metMap(async (d) => {
  const z = zip();
  assert.equal(await haalNaarRuntime({ url: URL_OK, sha256: sha(z), basis: d, haal: async () => new Response(z) }), "opgehaald");
  assert.equal(readFileSync(path.join(d, RUNTIME, "catalogue.sqlite"), "utf8"), "nieuw");
  assert.equal(existsSync(path.join(d, "local-data", ".runtime-download")), false);
}));

test("een bestaande database wordt niet overschreven en niet eens opgehaald", () => metMap(async (d) => {
  mkdirSync(path.join(d, RUNTIME), { recursive: true });
  writeFileSync(path.join(d, RUNTIME, "catalogue.sqlite"), "eigen");
  let opgehaald = false;
  assert.equal(await haalNaarRuntime({ url: URL_OK, sha256: "a".repeat(64), basis: d, haal: async () => { opgehaald = true; return new Response(zip()); } }), "bestaand");
  assert.equal(opgehaald, false);
  assert.equal(readFileSync(path.join(d, RUNTIME, "catalogue.sqlite"), "utf8"), "eigen");
}));

test("andere bestanden in de map: stoppen; een lege map wordt gebruikt", () => metMap(async (d) => {
  const map = path.join(d, RUNTIME);
  mkdirSync(map, { recursive: true });
  assert.equal(bestaande(map), null);
  const z = zip();
  assert.equal(await haalNaarRuntime({ url: URL_OK, sha256: sha(z), basis: d, haal: async () => new Response(z) }), "opgehaald");
  rmSync(map, { recursive: true });
  mkdirSync(map);
  writeFileSync(path.join(map, "notitie.txt"), "van mij");
  await assert.rejects(haalNaarRuntime({ url: URL_OK, sha256: sha(z), basis: d, haal: async () => new Response(z) }), /andere bestanden/);
  assert.equal(readFileSync(path.join(map, "notitie.txt"), "utf8"), "van mij");
}));

test("een afgewezen zip laat geen database en geen tijdelijke map achter", () => metMap(async (d) => {
  await assert.rejects(haalNaarRuntime({ url: URL_OK, sha256: "a".repeat(64), basis: d, haal: async () => new Response(zip()) }), /controlegetal van de zip/);
  assert.equal(existsSync(path.join(d, RUNTIME)), false);
  assert.equal(existsSync(path.join(d, "local-data", ".runtime-download")), false);
}));

test("docs noemen geen losse zip uit de nieuwste release als installatieroute", () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const installeren = readFileSync(path.join(root, "docs/gebruiken/installeren.md"), "utf8");
  assert.match(installeren, /npm run database:ophalen/);
  assert.doesNotMatch(installeren, /nieuwste release/);
});
