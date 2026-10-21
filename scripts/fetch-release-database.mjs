#!/usr/bin/env node
// Haalt de openbare database op uit een GitHub-release, controleert het controlegetal en
// pakt hem uit. Bedoeld voor het bouwen van de image voor de online versie.
//
//   node scripts/fetch-release-database.mjs --url <zip-url> --sha256 <hash> --out <nieuwe-map>
//
// Weigert bij een afwijkend controlegetal, vreemde paden in de zip of een bestaande map.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const MAX_ZIP = 200 * 1024 * 1024;
const MAX_UITGEPAKT = 1024 * 1024 * 1024;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

/** Pakt een zip uit naar een lijst { naam, inhoud }. Alleen 'stored' en 'deflate'. */
export function pakUit(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("geen zip-bestand");
  const aantal = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16), totaal = 0;
  const uit = [];
  for (let n = 0; n < aantal; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("beschadigde zip");
    const methode = buf.readUInt16LE(p + 10), gecomprimeerd = buf.readUInt32LE(p + 20), grootte = buf.readUInt32LE(p + 24);
    const nLen = buf.readUInt16LE(p + 28), xLen = buf.readUInt16LE(p + 30), cLen = buf.readUInt16LE(p + 32), lokaal = buf.readUInt32LE(p + 42);
    const naam = buf.subarray(p + 46, p + 46 + nLen).toString("utf8");
    p += 46 + nLen + xLen + cLen;
    if (naam.endsWith("/")) continue;
    if (!/^[\w.-]+$/.test(naam)) throw new Error(`onverwacht bestand in de zip: ${naam}`);
    totaal += grootte;
    if (totaal > MAX_UITGEPAKT) throw new Error("uitgepakt te groot");
    const start = lokaal + 30 + buf.readUInt16LE(lokaal + 26) + buf.readUInt16LE(lokaal + 28);
    const data = buf.subarray(start, start + gecomprimeerd);
    const inhoud = methode === 0 ? Buffer.from(data) : methode === 8 ? inflateRawSync(data, { maxOutputLength: grootte }) : null;
    if (!inhoud || inhoud.length !== grootte) throw new Error(`kan ${naam} niet uitpakken`);
    uit.push({ naam, inhoud });
  }
  return uit;
}

/** Controleert de controlegetallen uit SHA256SUMS.txt in de zip zelf. */
export function controleerSums(bestanden) {
  const sums = bestanden.find((b) => b.naam === "SHA256SUMS.txt");
  if (!sums) throw new Error("SHA256SUMS.txt ontbreekt in de zip");
  for (const regel of sums.inhoud.toString("utf8").trim().split("\n")) {
    const [hash, naam] = regel.trim().split(/\s+/);
    const b = bestanden.find((x) => x.naam === naam);
    if (!b || sha256(b.inhoud) !== hash) throw new Error(`controlegetal klopt niet voor ${naam}`);
  }
}

export async function haalDatabase({ url, verwacht, out, haal = fetch }) {
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/download\//.test(url)) throw new Error("alleen GitHub-releases");
  if (!/^[0-9a-f]{64}$/.test(verwacht)) throw new Error("verwacht controlegetal moet 64 hextekens zijn");
  if (existsSync(out)) throw new Error(`de map bestaat al: ${out}`);
  const res = await haal(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download mislukt (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_ZIP) throw new Error("zip te groot");
  const gekregen = sha256(buf);
  if (gekregen !== verwacht) throw new Error(`controlegetal van de zip klopt niet (${gekregen})`);
  const bestanden = pakUit(buf);
  controleerSums(bestanden);
  if (!bestanden.some((b) => b.naam === "catalogue.sqlite") || !bestanden.some((b) => b.naam === "local-build.json")) throw new Error("database of instellingen ontbreken");
  mkdirSync(out, { recursive: true });
  for (const b of bestanden) writeFileSync(path.join(out, b.naam), b.inhoud);
  return bestanden.map((b) => b.naam);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), w = (n) => a[a.indexOf(n) + 1];
  try {
    const namen = await haalDatabase({ url: w("--url"), verwacht: w("--sha256"), out: path.resolve(w("--out")) });
    console.log(`Database opgehaald en gecontroleerd: ${namen.join(", ")}`);
  } catch (fout) {
    console.error(`Database ophalen mislukt: ${fout.message}`);
    process.exitCode = 1;
  }
}
