#!/usr/bin/env node
// Installeert en start Omnibus met één opdracht, op Windows, macOS en Linux.
//
//   node scripts/installeer.mjs            alles: onderdelen, database, controle, bouwen, starten
//   node scripts/installeer.mjs --niet-starten
//
// Elke stap stopt bij een fout met een uitleg in gewone taal. Wat al klaar is (onderdelen,
// database), wordt bij een volgende keer niet opnieuw gedaan.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATABASE_SHA256, DATABASE_URL } from "./database-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HULP = "https://github.com/Robert-Worm/omnibus/blob/main/docs/gebruiken/problemen-oplossen.md";
const RUNTIME = path.join("local-data", "runtime");
const SETTINGS = path.join(RUNTIME, "local-build.json");
const PORT = 4319;

export class Stop extends Error {
  constructor(melding, oplossing, anker = "") { super(melding); this.oplossing = oplossing; this.anker = anker; }
}

/** Controleert de Node-versie tegen .nvmrc. Gooit Stop bij een te oude versie. */
export function controleerNode(huidig, nodig) {
  const deel = (v) => v.replace(/^v/, "").split(".").map(Number);
  const [a, b] = [deel(huidig), deel(nodig)];
  const goed = a[0] === b[0] ? (a[1] > b[1] || (a[1] === b[1] && a[2] >= b[2])) : a[0] > b[0];
  if (!goed) throw new Stop(`Je gebruikt Node.js ${huidig}; Omnibus heeft versie ${nodig} of hoger nodig.`,
    `Installeer Node.js ${nodig} via https://nodejs.org/ en open daarna een nieuwe terminal.`, "#een-verkeerde-versie-van-nodejs");
  return true;
}

/** De opdracht voor npm: op Windows heet die npm.cmd en is een shell nodig. */
export function npmOpdracht(platform = process.platform) {
  return platform === "win32" ? { bestand: "npm.cmd", shell: true } : { bestand: "npm", shell: false };
}

function draai(bestand, args, { shell = false, stil = false } = {}) {
  return new Promise((klaar, fout) => {
    const kind = spawn(bestand, args, { cwd: root, stdio: stil ? "ignore" : "inherit", shell });
    kind.on("error", fout);
    kind.on("exit", (code) => (code === 0 ? klaar() : fout(new Error(`${bestand} ${args[0]} stopte met code ${code}`))));
  });
}

const stap = (nr, tekst) => console.log(`\n[${nr}/5] ${tekst}`);

export async function installeer({ starten = true } = {}) {
  console.log("Omnibus installeren. Dit duurt de eerste keer een paar minuten.");

  stap(1, "Node.js controleren");
  controleerNode(process.version, readFileSync(path.join(root, ".nvmrc"), "utf8").trim());
  console.log(`  Node.js ${process.version}: goed.`);

  const npm = npmOpdracht();
  stap(2, "Onderdelen installeren");
  if (existsSync(path.join(root, "node_modules", ".package-lock.json"))) console.log("  Al geïnstalleerd.");
  else await draai(npm.bestand, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { shell: npm.shell }).catch(() => {
    throw new Stop("De onderdelen konden niet worden geïnstalleerd.", "Controleer je internetverbinding en probeer het opnieuw. Werkt het nog niet? Verwijder de map node_modules en probeer het nog eens.");
  });

  stap(3, "Database ophalen en controleren");
  if (existsSync(path.join(root, SETTINGS))) console.log(`  Er staat al een database in ${RUNTIME}; die wordt gebruikt.`);
  else {
    const { haalDatabase } = await import("./fetch-release-database.mjs");
    const tijdelijk = path.join(root, "local-data", ".runtime-download");
    rmSync(tijdelijk, { recursive: true, force: true });
    await haalDatabase({ url: DATABASE_URL, verwacht: DATABASE_SHA256, out: tijdelijk }).catch((fout) => {
      rmSync(tijdelijk, { recursive: true, force: true });
      throw new Stop(`De database kon niet worden opgehaald: ${fout.message}.`, `Controleer je internetverbinding. Lukt het niet, download dan de zip zelf: ${DATABASE_URL} en pak hem uit in ${RUNTIME}.`, "#de-database-is-beschadigd");
    });
    if (existsSync(path.join(root, RUNTIME))) rmSync(tijdelijk, { recursive: true, force: true });
    else renameSync(tijdelijk, path.join(root, RUNTIME));
    console.log("  Opgehaald; het controlegetal klopt.");
  }
  await draai(process.execPath, ["scripts/check-runtime-database.mjs", "--settings", SETTINGS], { stil: true }).catch(() => {
    throw new Stop("De database haalt de controle niet.", `Verwijder de map ${RUNTIME} en start deze opdracht opnieuw; dan wordt de database opnieuw opgehaald.`, "#de-database-is-beschadigd");
  });
  console.log("  Gecontroleerd: compleet en ongewijzigd.");

  stap(4, "Omnibus bouwen");
  await draai(npm.bestand, ["run", "build", "--", "--settings", SETTINGS], { shell: npm.shell }).catch(() => {
    throw new Stop("Het bouwen is mislukt.", "Kijk naar de melding hierboven. Start daarna deze opdracht opnieuw.");
  });

  if (!starten) { console.log(`\nKlaar. Start Omnibus later met: npm start -- --settings ${SETTINGS} --port ${PORT}`); return; }
  stap(5, "Omnibus starten");
  console.log(`  Open http://127.0.0.1:${PORT}/ in je browser. Stoppen doe je met Ctrl+C.\n`);
  await draai(npm.bestand, ["start", "--", "--settings", SETTINGS, "--port", String(PORT)], { shell: npm.shell }).catch(() => {
    throw new Stop("Omnibus kon niet starten.", `Draait Omnibus al in een ander venster? Sluit dat, of start op een andere poort: npm start -- --settings ${SETTINGS} --port 4320`, "#omnibus-weigert-te-starten");
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  installeer({ starten: !process.argv.includes("--niet-starten") }).catch((fout) => {
    console.error(`\n✗ ${fout.message}`);
    if (fout.oplossing) console.error(`  Wat je doet: ${fout.oplossing}`);
    console.error(`  Meer hulp: ${HULP}${fout.anker || ""}`);
    process.exitCode = 1;
  });
}
