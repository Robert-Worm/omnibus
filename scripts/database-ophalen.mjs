#!/usr/bin/env node
// Haalt de database op die bij deze versie van de code hoort, controleert hem en zet hem in
// local-data/runtime/ (#270). Dezelfde vastgelegde versie als Docker en de installatieopdracht:
// scripts/database-release.mjs.
//
//   npm run database:ophalen
//   npm run database:ophalen -- --url <zip-url uit een GitHub-release> --sha256 <controlegetal>
//
// Een andere versie kan alleen met een adres én een controlegetal samen. Een bestaande
// database wordt nooit overschreven.
import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATABASE_SHA256, DATABASE_URL } from "./database-release.mjs";
import { haalDatabase } from "./fetch-release-database.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RUNTIME = path.join("local-data", "runtime");

/** Welke database: de vastgelegde, of een andere met adres én controlegetal. */
export function kiesVersie({ url, sha256 } = {}) {
  if (!url && !sha256) return { url: DATABASE_URL, sha256: DATABASE_SHA256, vastgelegd: true };
  if (!url || !sha256) throw new Error("Een andere versie vraagt zowel --url als --sha256. Laat beide weg voor de versie die bij deze code hoort.");
  return { url, sha256: sha256.toLowerCase(), vastgelegd: url === DATABASE_URL && sha256.toLowerCase() === DATABASE_SHA256 };
}

/** Staat er al een database (of iets anders) in de map? Dan blijft die staan. */
export function bestaande(map) {
  if (!existsSync(map)) return null;
  const inhoud = readdirSync(map);
  if (inhoud.includes("local-build.json") || inhoud.includes("catalogue.sqlite")) return "database";
  return inhoud.length ? "andere bestanden" : null;
}

/**
 * Haalt de gekozen versie op in een tijdelijke map en zet hem pas na de controle op zijn plek.
 * Geeft 'bestaand' terug als er al een database staat; die wordt dan niet aangeraakt.
 */
export async function haalNaarRuntime({ url, sha256, basis = root, haal } = {}) {
  const doel = path.join(basis, RUNTIME);
  const staat = bestaande(doel);
  if (staat === "database") return "bestaand";
  if (staat) throw new Error(`In ${RUNTIME} staan andere bestanden. Verplaats ze eerst; Omnibus overschrijft niets.`);
  const tijdelijk = path.join(basis, "local-data", ".runtime-download");
  rmSync(tijdelijk, { recursive: true, force: true });
  try {
    await haalDatabase({ url, verwacht: sha256, out: tijdelijk, ...(haal ? { haal } : {}) });
  } catch (fout) {
    rmSync(tijdelijk, { recursive: true, force: true });
    throw fout;
  }
  // Een lege map mag weg; is er intussen iets verschenen, dan blijft dat staan.
  if (existsSync(doel)) {
    if (bestaande(doel)) { rmSync(tijdelijk, { recursive: true, force: true }); return "bestaand"; }
    rmSync(doel, { recursive: true });
  }
  renameSync(tijdelijk, doel);
  return "opgehaald";
}

async function main() {
  const a = process.argv.slice(2), w = (n) => (a.includes(n) ? a[a.indexOf(n) + 1] : undefined);
  const versie = kiesVersie({ url: w("--url"), sha256: w("--sha256") });
  if (!versie.vastgelegd) console.log("Let op: je kiest een andere database dan de versie die bij deze code hoort.");
  const uitkomst = await haalNaarRuntime(versie);
  if (uitkomst === "bestaand") {
    console.log(`Er staat al een database in ${RUNTIME}. Die blijft staan en wordt niet overschreven.`);
    console.log(`Wil je een andere? Verplaats of verwijder eerst de map ${RUNTIME}.`);
  } else console.log(`Database opgehaald en gecontroleerd in ${RUNTIME}.`);
  console.log(`Controleer hem met: npm run data:check-runtime -- --settings ${path.join(RUNTIME, "local-build.json")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Database ophalen mislukt: ${fout.message}`); process.exitCode = 1; });
}
