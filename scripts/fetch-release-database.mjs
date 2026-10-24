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
const DOWNLOAD_MS = 5 * 60 * 1000;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// The first published archive omitted only LEESMIJ.txt from its inner manifest.
// Bind its missing checksum to the exact, independently pinned ZIP bytes. Do not
// exempt filenames globally or carry this receipt forward to another release.
const LEGACY_SUMS = new Map([
  ['b50d77a71aba1b9eb7d78ca58384f0c1fcdcc173f4189c1f144f31bef1858349',
    'fa282a7205b8df53843ee97d488957540e4cc52dc2fdd6b8544ff8812e3c0bf2  LEESMIJ.txt\n'],
]);

// Flat, portable filenames only; Windows aliases must not overwrite an entry.
function bestandsnaam(naam) {
  if (!/^[\w.-]+$/.test(naam) || naam.endsWith('.') ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(naam))
    throw new Error('onverwacht bestand in de zip');
  return naam.toLowerCase();
}

/** Pakt een zip uit naar een lijst { naam, inhoud }. Alleen 'stored' en 'deflate'. */
export function pakUit(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("geen zip-bestand");
  const aantal = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16), totaal = 0;
  const uit = [], namen = new Set();
  for (let n = 0; n < aantal; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("beschadigde zip");
    const methode = buf.readUInt16LE(p + 10), gecomprimeerd = buf.readUInt32LE(p + 20), grootte = buf.readUInt32LE(p + 24);
    const nLen = buf.readUInt16LE(p + 28), xLen = buf.readUInt16LE(p + 30), cLen = buf.readUInt16LE(p + 32), lokaal = buf.readUInt32LE(p + 42);
    const naam = buf.subarray(p + 46, p + 46 + nLen).toString("utf8");
    p += 46 + nLen + xLen + cLen;
    const sleutel = bestandsnaam(naam);
    if (namen.has(sleutel)) throw new Error('dubbele bestandsnaam in de zip');
    namen.add(sleutel);
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
export function controleerSums(bestanden, aanvullendeSums = '') {
  const perNaam = new Map(), namen = new Set();
  for (const bestand of bestanden) {
    const sleutel = bestandsnaam(bestand.naam);
    if (namen.has(sleutel)) throw new Error('dubbele bestandsnaam in de zip');
    namen.add(sleutel); perNaam.set(bestand.naam, bestand);
  }
  const sums = perNaam.get("SHA256SUMS.txt");
  if (!sums) throw new Error("SHA256SUMS.txt ontbreekt in de zip");
  const gecontroleerd = new Set();
  for (const regel of `${sums.inhoud.toString("utf8").trim()}\n${aanvullendeSums}`.trim().split("\n")) {
    const match = /^([0-9a-f]{64})[ \t]+([\w.-]+)\r?$/.exec(regel);
    if (!match) throw new Error('ongeldige regel in SHA256SUMS.txt');
    const [, hash, naam] = match;
    if (naam === 'SHA256SUMS.txt' || gecontroleerd.has(naam))
      throw new Error('dubbele of ongeldige checksumvermelding');
    const b = perNaam.get(naam);
    if (!b || sha256(b.inhoud) !== hash) throw new Error(`controlegetal klopt niet voor ${naam}`);
    gecontroleerd.add(naam);
  }
  if (gecontroleerd.size !== bestanden.length - 1) throw new Error('controlegetal ontbreekt voor een bestand');
}

/** Verify outer bytes before consulting a release-specific compatibility receipt. */
export function controleerArchief(buf, verwacht) {
  if (!/^[0-9a-f]{64}$/.test(verwacht)) throw new Error('verwacht controlegetal moet 64 hextekens zijn');
  const gekregen = sha256(buf);
  if (gekregen !== verwacht) throw new Error(`controlegetal van de zip klopt niet (${gekregen})`);
  const bestanden = pakUit(buf);
  controleerSums(bestanden, LEGACY_SUMS.get(gekregen));
  if (!bestanden.some((b) => b.naam === 'catalogue.sqlite') || !bestanden.some((b) => b.naam === 'local-build.json'))
    throw new Error('database of instellingen ontbreken');
  return bestanden;
}

/** Count actual bytes while streaming. Headers are only an early refusal. */
export async function leesDownload(res, signal, maxBytes = MAX_ZIP) {
  const lengte = res.headers.get('content-length');
  if (lengte !== null && /^\d+$/.test(lengte) && Number(lengte) > maxBytes)
    throw new Error('zip te groot');
  if (!res.body) throw new Error('download zonder inhoud');
  const reader = res.body.getReader(), chunks = [];
  const stop = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  let totaal = 0, klaar = false;
  try {
    for (;;) {
      signal.throwIfAborted();
      const {done, value} = await reader.read();
      signal.throwIfAborted();
      if (done) { klaar = true; break; }
      totaal += value.byteLength;
      if (totaal > maxBytes) throw new Error('zip te groot');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, totaal);
  } finally {
    signal.removeEventListener('abort', stop);
    if (!klaar) stop();
    reader.releaseLock();
  }
}

async function downloadZip(url, haal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('download duurt te lang')), DOWNLOAD_MS);
  timer.unref();
  try {
    const res = await haal(url, { redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`download mislukt (${res.status})`);
    return await leesDownload(res, controller.signal);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function haalDatabase({ url, verwacht, out, haal = fetch }) {
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/download\//.test(url)) throw new Error("alleen GitHub-releases");
  if (!/^[0-9a-f]{64}$/.test(verwacht)) throw new Error("verwacht controlegetal moet 64 hextekens zijn");
  if (existsSync(out)) throw new Error(`de map bestaat al: ${out}`);
  const buf = await downloadZip(url, haal);
  const bestanden = controleerArchief(buf, verwacht);
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
