#!/usr/bin/env node
// Maakt de bestanden voor een databaserelease: de zip, SHA256SUMS.txt, LEESMIJ.txt en
// een concept van de releasenotities. Weigert een database die de runtimecontrole niet haalt.
//
//   npm run release:prepare -- --settings <local-build.json> --out <nieuwe-map> [--date jjjj-mm-dd]
//     [--claims 12,15] [--rapport <rijksmap-id>=<bron-id> ...]
//
// Maakt ook een voorstel voor .github/voortgang/verwerkt.json en vult 'Nieuw in deze release' in.
//
// Er wordt niets geüpload en niets in de repository gewijzigd.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
export const datumTekst = (iso) => { const [j, m, d] = iso.split("-").map(Number); return `${d} ${MAANDEN[m - 1]} ${j}`; };
export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Een eenvoudige zip-schrijver (deflate), genoeg voor een paar bestanden onder 4 GB. */
export function maakZip(bestanden, datum = new Date()) {
  const dosTijd = ((datum.getHours() << 11) | (datum.getMinutes() << 5) | (datum.getSeconds() >> 1)) & 0xffff;
  const dosDatum = (((datum.getFullYear() - 1980) << 9) | ((datum.getMonth() + 1) << 5) | datum.getDate()) & 0xffff;
  const lokaal = [], centraal = [];
  let offset = 0;
  for (const { naam, inhoud } of bestanden) {
    const n = Buffer.from(naam, "utf8"), ingepakt = deflateRawSync(inhoud, { level: 9 }), crc = crc32(inhoud);
    const kop = (handtekening, lengte) => { const b = Buffer.alloc(lengte); b.writeUInt32LE(handtekening, 0); return b; };
    const l = kop(0x04034b50, 30);
    l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6); l.writeUInt16LE(8, 8); l.writeUInt16LE(dosTijd, 10); l.writeUInt16LE(dosDatum, 12);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(ingepakt.length, 18); l.writeUInt32LE(inhoud.length, 22); l.writeUInt16LE(n.length, 26);
    const c = kop(0x02014b50, 46);
    c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(dosTijd, 12); c.writeUInt16LE(dosDatum, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(ingepakt.length, 20); c.writeUInt32LE(inhoud.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    lokaal.push(l, n, ingepakt); centraal.push(c, n);
    offset += 30 + n.length + ingepakt.length;
  }
  const cd = Buffer.concat(centraal), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(bestanden.length, 8); e.writeUInt16LE(bestanden.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...lokaal, cd, e]);
}

/** Vat de pakketten uit de database samen voor LEESMIJ en releasenotities. */
export function inhoudVan(pakketten) {
  const soort = (k) => pakketten.filter((p) => p.kind === k);
  return { rapporten: soort("report"), kaders: [...soort("law"), ...soort("foundation")], modellen: soort("model") };
}

/** De code uit de werklijst wetten en kaders die bij een pakket hoort, bijvoorbeeld WWKE voor WWKE-20260815-ASTRA-R1. */
export function kaderCode(bronId, codes) {
  return [...codes].sort((x, y) => y.length - x.length).find((c) => bronId === c || bronId.startsWith(c + "-")) ?? null;
}

/**
 * Een voorstel voor .github/voortgang/verwerkt.json bij deze database, plus wat er veranderd is.
 * `koppelingen` geeft per nieuw rapport de Rijksmap-ID: { "2026-onderzoek-x": "X26" }.
 * Een rapport zonder Rijksmap-ID komt in `ontbreekt`: dat vult de beheerder aan.
 */
export function verwerktVoorstel({ huidig, inhoud, datum, koppelingen = {}, kaderCodes = [] }) {
  const inDb = new Set(inhoud.rapporten.map((p) => p.id));
  const rapporten = {};
  for (const [slug, id] of Object.entries({ ...huidig.rapporten, ...koppelingen })) if (inDb.has(id)) rapporten[slug] = id;
  const gekoppeld = new Set(Object.values(rapporten));
  const codes = [...new Set([...(huidig.wettenEnKaders ?? []), ...kaderCodes])];
  const kaders = [...new Set(inhoud.kaders.map((k) => kaderCode(k.id, codes) ?? k.id))];
  // Houd de bestaande volgorde; nieuwe kaders komen achteraan.
  const plek = (k) => { const i = (huidig.wettenEnKaders ?? []).indexOf(k); return i < 0 ? Infinity : i; };
  kaders.sort((x, y) => plek(x) - plek(y));
  const oudeRapporten = new Set(Object.values(huidig.rapporten ?? {})), oudeKaders = new Set(huidig.wettenEnKaders ?? []);
  return {
    verwerkt: { database: datum, toelichting: huidig.toelichting, rapporten: Object.fromEntries(Object.entries(rapporten).sort()), wettenEnKaders: kaders, modellen: inhoud.modellen.length },
    nieuw: { rapporten: inhoud.rapporten.filter((p) => !oudeRapporten.has(p.id)), kaders: kaders.filter((k) => !oudeKaders.has(k)) },
    weg: { rapporten: [...oudeRapporten].filter((id) => !inDb.has(id)), kaders: [...oudeKaders].filter((k) => !kaders.includes(k)) },
    ontbreekt: inhoud.rapporten.filter((p) => !gekoppeld.has(p.id)).map((p) => p.id),
  };
}

export function leesmij({ datum, inhoud, grootteMB }) {
  return [
    `OMNIBUS-DATABASE · ${datumTekst(datum)}`,
    "",
    "Deze zip bevat de database waarmee je Omnibus lokaal in de browser gebruikt",
    "(https://github.com/Robert-Worm/omnibus).",
    "",
    "Inhoud",
    `  catalogue.sqlite   de database (SQLite, ${grootteMB} MB)`,
    "  local-build.json   instellingen met de vastgelegde release- en publicatiehash",
    "  SHA256SUMS.txt     controlegetallen",
    "",
    "Wat erin zit",
    `  - ${inhoud.rapporten.length} onderzoeksrapporten, met normen en toetspunten`,
    `  - ${inhoud.kaders.length} wetten en kaders: ${inhoud.kaders.map((k) => k.title).join("; ")}`,
    `  - ${inhoud.modellen.length} onderzoeksmodellen met eigen interviewuitwerkingen`,
    "",
    "Gebruiken",
    "  1. Clone de repository en installeer de onderdelen (zie README).",
    "  2. Pak deze zip uit in de map local-data/runtime/ van je checkout.",
    "  3. Voer uit vanuit de map van de repository:",
    "       npm run data:check-runtime -- --settings local-data/runtime/local-build.json",
    "       npm run build -- --settings local-data/runtime/local-build.json",
    "       npm start -- --settings local-data/runtime/local-build.json --port 4319",
    "  4. Open http://127.0.0.1:4319/",
    "",
    "Rechten",
    "  De teksten van rapporten, wetten en kaders blijven van hun uitgevers. De licentie",
    "  van de repository geeft daar geen rechten op. Zie NOTICE in de repository.",
    "",
    "Een keuze in Omnibus is geen oordeel dat een norm van toepassing is of dat een",
    "organisatie eraan voldoet. Dat blijft het oordeel van de onderzoeker.",
    "",
  ].join("\n");
}

export function releasenotities({ datum, inhoud, zipNaam, catalogusHash, release, publicatie, grootteMB, wijzigingen, claims = [] }) {
  const nieuw = wijzigingen
    ? [...wijzigingen.nieuw.rapporten.map((p) => `- Rapport: ${p.title}`), ...wijzigingen.nieuw.kaders.map((k) => `- Wet of kader: ${k}`),
      ...wijzigingen.weg.rapporten.map((id) => `- Niet meer in de database: rapport ${id}`), ...wijzigingen.weg.kaders.map((k) => `- Niet meer in de database: ${k}`)]
    : [];
  if (wijzigingen && !nieuw.length) nieuw.push("- Geen nieuwe bronnen; alleen verbeteringen in bestaande inhoud");
  if (claims.length) nieuw.push(`- Claims: ${claims.map((c) => "#" + c).join(", ")}`);
  return [
    `# Database ${datumTekst(datum)}`,
    "",
    "De database waarmee je Omnibus lokaal in de browser gebruikt. Download de zip, pak hem uit in `local-data/runtime/` en volg de stappen in de [installatiehandleiding](https://github.com/Robert-Worm/omnibus/blob/main/docs/gebruiken/installeren.md).",
    "",
    "**Inhoud**",
    `- ${inhoud.rapporten.length} onderzoeksrapporten`,
    `- ${inhoud.kaders.length} wetten en kaders: ${inhoud.kaders.map((k) => k.title).join(", ")}`,
    `- ${inhoud.modellen.length} onderzoeksmodellen`,
    "",
    "**Nieuw in deze release**",
    ...(nieuw.length ? nieuw : ["- *(vul aan: welke bronnen zijn erbij gekomen, met de claimnummers)*"]),
    "",
    "**Controle**",
    `- \`${zipNaam}\` (${grootteMB} MB uitgepakt)`,
    `- \`catalogue.sqlite\` SHA-256: \`${catalogusHash}\``,
    `- release \`${release.slice(0, 8)}…${release.slice(-5)}\` · publicatie \`${publicatie.slice(0, 8)}…${publicatie.slice(-5)}\` (volledig in \`local-build.json\`)`,
    "- Getest met `npm run data:check-runtime`: `VERIFIED_RUNTIME_DATABASE`",
    "",
    "De bronteksten blijven van hun uitgevers; de licentie van de repository geeft daar geen rechten op. Zie `LEESMIJ.txt` in de zip.",
    "",
  ].join("\n");
}

/** Maakt alle releasebestanden. `controleer` is de runtimecontrole (vervangbaar in tests). */
export async function bereidReleaseVoor({ settings, out, datum, controleer, huidig, koppelingen = {}, kaderCodes = [], claims = [] }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Gebruik --date jjjj-mm-dd.");
  if (existsSync(out)) throw new Error(`De uitvoermap bestaat al: ${out}. Kies een nieuwe map.`);
  const resultaat = controleer(settings);
  if (resultaat?.status !== "VERIFIED_RUNTIME_DATABASE") throw new Error("De database haalt de runtimecontrole niet. Er is niets gemaakt.");
  const database = readFileSync(settings.database);
  const instellingen = Buffer.from(JSON.stringify({ database: "catalogue.sqlite", release: settings.release, publication: settings.publication }, null, 2) + "\n");
  const inhoud = inhoudVan(resultaat.packages || []);
  const grootteMB = Math.round(database.length / 1024 / 1024);
  const catalogusHash = sha256(database);
  const tekst = leesmij({ datum, inhoud, grootteMB });
  const sums = [["catalogue.sqlite", database], ["local-build.json", instellingen], ["LEESMIJ.txt", Buffer.from(tekst)]]
    .map(([n, b]) => `${sha256(b)}  ${n}`).join("\n") + "\n";
  const zipNaam = `omnibus-database-${datum}.zip`;
  const zip = maakZip([
    { naam: "catalogue.sqlite", inhoud: database },
    { naam: "local-build.json", inhoud: instellingen },
    { naam: "LEESMIJ.txt", inhoud: Buffer.from(tekst) },
    { naam: "SHA256SUMS.txt", inhoud: Buffer.from(sums) },
  ]);
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, zipNaam), zip);
  writeFileSync(path.join(out, "SHA256SUMS.txt"), `${sha256(zip)}  ${zipNaam}\n${sums}`);
  writeFileSync(path.join(out, "LEESMIJ.txt"), tekst);
  const voorstel = huidig ? verwerktVoorstel({ huidig, inhoud, datum, koppelingen, kaderCodes }) : null;
  if (voorstel) writeFileSync(path.join(out, "verwerkt.json"), JSON.stringify(voorstel.verwerkt, null, 2) + "\n");
  writeFileSync(path.join(out, "releasenotities.md"), releasenotities({ datum, inhoud, zipNaam, catalogusHash, release: settings.release, publicatie: settings.publication, grootteMB, wijzigingen: voorstel, claims }));
  return { zip: zipNaam, zipHash: sha256(zip), catalogusHash, rapporten: inhoud.rapporten.length, kaders: inhoud.kaders.length, modellen: inhoud.modellen.length,
    ...(voorstel ? { nieuw: { rapporten: voorstel.nieuw.rapporten.map((p) => p.id), kaders: voorstel.nieuw.kaders }, ontbreekt: voorstel.ontbreekt } : {}) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const waarde = (naam) => { const i = args.indexOf(naam); return i >= 0 ? args[i + 1] : undefined; };
  try {
    const { parseDatabaseBuildArgs } = await import("./database-build-options.mjs");
    const { checkRuntimeDatabase } = await import("./check-runtime-database.mjs");
    const settingsPad = waarde("--settings"), out = waarde("--out");
    if (!settingsPad || !out) throw new Error("Gebruik: npm run release:prepare -- --settings <local-build.json> --out <nieuwe-map> [--date jjjj-mm-dd]");
    const settings = parseDatabaseBuildArgs(["--settings", settingsPad]);
    const datum = waarde("--date") || new Date().toISOString().slice(0, 10);
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const huidig = JSON.parse(readFileSync(path.join(root, ".github/voortgang/verwerkt.json"), "utf8"));
    const kaderCodes = JSON.parse(readFileSync(path.join(root, ".github/voortgang/wetten-en-kaders.json"), "utf8")).groepen.flatMap((g) => (g.bronnen ?? []).map((b) => b.id));
    // --rapport <rijksmap-id>=<bron-id> koppelt een nieuw rapport aan de Rijksmap; mag vaker.
    const koppelingen = Object.fromEntries(args.flatMap((a, i) => (a === "--rapport" ? [args[i + 1].split("=")] : [])));
    const claims = (waarde("--claims") || "").split(",").map((c) => c.trim().replace(/^#/, "")).filter(Boolean);
    const uit = await bereidReleaseVoor({ settings, out: path.resolve(out), datum, huidig, koppelingen, kaderCodes, claims,
      controleer: (s) => checkRuntimeDatabase(s, { includePackageMetadata: true }) });
    console.log(JSON.stringify(uit, null, 2));
    if (uit.ontbreekt?.length) console.warn(`\nHOLD: geen Rijksmap-ID voor ${uit.ontbreekt.join(", ")}. Geef ze mee met --rapport <rijksmap-id>=<bron-id> en draai opnieuw in een nieuwe map.`);
    console.log(`\nKlaar. Zet ${uit.zip} bij een nieuwe release met tag database-${datum} en gebruik releasenotities.md als beschrijving. Vervang daarna .github/voortgang/verwerkt.json door het voorstel in de uitvoermap.`);
  } catch (fout) {
    console.error(`Release voorbereiden mislukt: ${fout.message}`);
    process.exitCode = 1;
  }
}
