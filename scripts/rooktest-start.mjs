#!/usr/bin/env node
// Rooktest na een installatie: start Omnibus, wacht tot het startscherm antwoordt, en stopt weer.
// Werkt op Windows, macOS en Linux. Gebruikt in .github/workflows/installatie.yml.
//
//   node scripts/rooktest-start.mjs [--port 4319] [--seconden 90]
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmOpdracht } from "./installeer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETTINGS = path.join("local-data", "runtime", "local-build.json");

export function leesOpties(args) {
  const waarde = (naam, standaard) => { const i = args.indexOf(naam); return i >= 0 ? Number(args[i + 1]) : standaard; };
  return { port: waarde("--port", 4319), seconden: waarde("--seconden", 90) };
}

/** Is dit antwoord het startscherm van Omnibus? */
export const isOmnibus = (status, html) => status === 200 && /<title>[^<]*Omnibus/i.test(html);

function stop(kind) {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(kind.pid), "/t", "/f"], { stdio: "ignore" });
  else try { process.kill(-kind.pid, "SIGTERM"); } catch { kind.kill("SIGTERM"); }
}

async function main() {
  const { port, seconden } = leesOpties(process.argv.slice(2));
  const npm = npmOpdracht();
  const kind = spawn(npm.bestand, ["start", "--", "--settings", SETTINGS, "--port", String(port)], { cwd: root, shell: npm.shell, stdio: "inherit", detached: process.platform !== "win32" });
  const adres = `http://127.0.0.1:${port}/`;
  const einde = Date.now() + seconden * 1000;
  try {
    while (Date.now() < einde) {
      try {
        const antwoord = await fetch(adres);
        if (isOmnibus(antwoord.status, await antwoord.text())) { console.log(`✓ Omnibus antwoordt op ${adres}`); return; }
      } catch { /* nog niet gestart */ }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Omnibus antwoordde niet binnen ${seconden} seconden op ${adres}.`);
  } finally {
    stop(kind);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`✗ ${fout.message}`); process.exitCode = 1; });
}
