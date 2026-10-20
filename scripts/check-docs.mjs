#!/usr/bin/env node
// Consistentiecheck voor de documentatie.
// Controleert links en ankers, de Node-versie, de installatieopdracht en het
// vaste paginapatroon. Draait lokaal met `npm run check:docs` en in GitHub Actions.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const INSTALL = "npm ci --ignore-scripts --no-audit --no-fund";

// Pagina's die geen gewone uitlegpagina zijn en daarom geen "Samengevat" hebben.
const ZONDER_SAMENGEVAT = new Set(["docs/README.md", "docs/begrippen.md"]);

const FOOTER = /^\[↑ (Wegwijzer|Terug naar Omnibus)\]\(([^)]+)\)/;

/** GitHub-anker van een kop, zoals GitHub het maakt. */
export function slug(kop) {
  let h = kop.trim().toLowerCase();
  h = h.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  h = h.replace(/[`*_~]/g, "");
  h = [...h].filter((c) => /[\p{L}\p{N}\- ]/u.test(c)).join("");
  return h.replace(/ /g, "-");
}

function zonderCode(tekst) {
  return tekst.replace(/^```[\s\S]*?^```/gm, "");
}

const ankerCache = new Map();
export function ankers(bestand) {
  if (ankerCache.has(bestand)) return ankerCache.get(bestand);
  const set = new Set();
  const gezien = new Map();
  for (const regel of zonderCode(readFileSync(bestand, "utf8")).split("\n")) {
    const m = /^(#{1,6})\s+(.*)$/.exec(regel);
    if (m) {
      const s = slug(m[2]);
      const n = gezien.get(s) ?? 0;
      gezien.set(s, n + 1);
      set.add(n === 0 ? s : `${s}-${n}`);
    }
    for (const a of regel.matchAll(/<a id="([^"]+)"/g)) set.add(a[1]);
  }
  ankerCache.set(bestand, set);
  return set;
}

/** Controleert één markdownbestand; geeft een lijst met meldingen terug. */
export function controleerBestand(root, rel, { nvmrc }) {
  const meldingen = [];
  const vol = path.join(root, rel);
  const tekst = readFileSync(vol, "utf8");
  const meld = (regel, bericht) => meldingen.push(`${rel}${regel ? `:${regel}` : ""}: ${bericht}`);
  const regels = tekst.split("\n");
  const regelVan = (index) => tekst.slice(0, index).split("\n").length;

  // 1. Links en ankers (buiten codeblokken).
  const zonder = tekst.replace(/^```[\s\S]*?^```/gm, (blok) => blok.replace(/[^\n]/g, " "));
  const linkRe = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)|href="([^"]+)"|src="([^"]+)"/g;
  for (const m of zonder.matchAll(linkRe)) {
    const url = m[1] ?? m[2] ?? m[3];
    if (/^(https?:|mailto:)/.test(url)) continue;
    const [doelPad, anker] = url.split("#");
    const doel = doelPad ? path.normalize(path.join(path.dirname(vol), decodeURI(doelPad))) : vol;
    if (doelPad && !existsSync(doel)) {
      meld(regelVan(m.index), `link naar een bestand dat niet bestaat: ${url}`);
      continue;
    }
    if (anker && doel.endsWith(".md") && statSync(doel).isFile() && !ankers(doel).has(decodeURI(anker))) {
      meld(regelVan(m.index), `anker bestaat niet: ${url}`);
    }
  }

  // 2. Node-versie: elke genoemde versie moet passen bij .nvmrc.
  const [major, minor, patch] = nvmrc.split(".");
  for (const m of tekst.matchAll(/\bNode(?:\.js)? v?(\d{2})(?:\.(\d+))?(?:\.(\d+))?\b/g)) {
    const ok = m[1] === major && (m[2] === undefined || m[2] === minor) && (m[3] === undefined || m[3] === patch);
    if (!ok) meld(regelVan(m.index), `Node-versie ${m[0]} past niet bij .nvmrc (${nvmrc})`);
  }

  // 3. Installatieopdracht in codeblokken.
  let inCode = false;
  regels.forEach((regel, i) => {
    if (/^\s*```/.test(regel)) inCode = !inCode;
    if (!inCode) return;
    const r = regel.trim();
    if (/^npm (install|i)\b(?! -g)/.test(r)) meld(i + 1, `gebruik "${INSTALL}" in plaats van "${r}"`);
    if (/^npm ci\b/.test(r) && r !== INSTALL) meld(i + 1, `installatieopdracht wijkt af: "${r}" (verwacht "${INSTALL}")`);
  });

  // 4. Paginapatroon.
  const isReadme = path.basename(rel) === "README.md";
  const isDocs = rel.startsWith("docs/");
  if ((isDocs || (isReadme && rel !== "README.md")) && !/^> \*\*In het kort:\*\*/m.test(tekst)) meld(0, 'mist het blok "> **In het kort:**" bovenaan');
  if (isDocs) {
    if (!ZONDER_SAMENGEVAT.has(rel) && !/^## Samengevat$/m.test(tekst)) meld(0, 'mist de kop "## Samengevat"');
    if (!/^## Volgende stap$/m.test(tekst)) meld(0, 'mist de kop "## Volgende stap"');
    const laatste = regels.filter((r) => r.trim()).at(-1) ?? "";
    const f = FOOTER.exec(laatste);
    if (!f) meld(0, "eindigt niet met de vaste navigatieregel naar de wegwijzer");
    else {
      const doel = path.normalize(path.join(path.dirname(rel), f[2]));
      const verwacht = rel === "docs/README.md" ? "README.md" : path.join("docs", "README.md");
      if (doel !== verwacht) meld(0, `navigatieregel wijst naar ${doel} in plaats van ${verwacht}`);
    }
  }
  return meldingen;
}

export function markdownBestanden(root) {
  const uit = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "*.md"], { cwd: root, encoding: "utf8" });
  return uit.split("\n").filter((f) => f && existsSync(path.join(root, f)));
}

/** Controles buiten de markdown: versies in package.json en workflows. */
export function controleerConfig(root, nvmrc) {
  const meldingen = [];
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (pkg.engines?.node !== `>=${nvmrc}`) meldingen.push(`package.json: engines.node is "${pkg.engines?.node}", verwacht ">=${nvmrc}"`);
  const wfMap = path.join(root, ".github", "workflows");
  if (existsSync(wfMap)) {
    const wf = execFileSync("git", ["ls-files", "-co", "--exclude-standard", ".github/workflows"], { cwd: root, encoding: "utf8" })
      .split("\n").filter((f) => /\.ya?ml$/.test(f));
    for (const f of wf) {
      const tekst = readFileSync(path.join(root, f), "utf8");
      for (const m of tekst.matchAll(/node-version:\s*['"]?([\d.]+)['"]?/g)) {
        if (m[1] !== nvmrc) meldingen.push(`${f}: node-version ${m[1]} past niet bij .nvmrc (${nvmrc})`);
      }
      for (const m of tekst.matchAll(/run:\s*(npm ci[^\n]*)/g)) {
        if (m[1].trim() !== INSTALL) meldingen.push(`${f}: installatieopdracht wijkt af: "${m[1].trim()}"`);
      }
    }
  }
  return meldingen;
}

export function controleer(root) {
  const nvmrc = readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
  const meldingen = controleerConfig(root, nvmrc);
  for (const rel of markdownBestanden(root)) meldingen.push(...controleerBestand(root, rel, { nvmrc }));
  return meldingen;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const meldingen = controleer(root);
  if (meldingen.length) {
    console.error(`Documentatiecheck: ${meldingen.length} ${meldingen.length === 1 ? "probleem" : "problemen"} gevonden.\n`);
    for (const m of meldingen) console.error(`- ${m}`);
    console.error("\nUitleg: docs/bijdragen/ontwikkelen.md#documentatie-controleren");
    process.exit(1);
  }
  console.log("Documentatiecheck: alles in orde.");
}
