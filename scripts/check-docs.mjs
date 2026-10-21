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
export function controleerBestand(root, rel, { nvmrc, scripts }) {
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

  // 4. Elke "npm run …" bestaat in package.json. Skills verwijzen soms naar de
  //    private verwerkingsomgeving; die tellen niet mee.
  if (scripts && !/^skills\/[^/]+\/(SKILL\.md|references\/)/.test(rel)) {
    for (const m of tekst.matchAll(/npm run ([a-z0-9:_-]+)/g)) {
      if (!(m[1] in scripts)) meld(regelVan(m.index), `opdracht "npm run ${m[1]}" bestaat niet in package.json`);
    }
  }

  // 5. Paginapatroon.
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

// Woorden en codes waarvoor een gewoon Nederlands alternatief bestaat (zie de stijlgids).
// Dit zijn waarschuwingen: ze laten de controle niet mislukken.
export const TE_VERMIJDEN = [
  [/\bEP\d{2}(?:-S\d{2})?\b/g, "interne projectcode; noem wat er bedoeld wordt"],
  [/\bK\d{2}\b/g, "code van een acceptatiecontract; noem wat er bedoeld wordt of link naar de afspraak"],
  [/(?<!GitHub-)\bworkflows?\b/gi, "werkwijze (of: GitHub-workflow)"],
  [/\bhandoffs?\b/gi, "overdracht"],
  [/\bdeploy\w*/gi, "online zetten of uitrollen"],
  [/\bfixtures?\b/gi, "testgegevens"],
  [/\bevidence\b/gi, "bewijs"],
  [/\bgates?\b/gi, "controle"],
  [/\bmaintainers?\b/gi, "beheerder"],
  [/\bintegrator\b/gi, "beheerder of ontwikkelaar"],
  [/\bbundles?\b/gi, "pakket"],
  [/\brollback\b/gi, "terugzetten"],
  [/\b(?:toetsingskader|auditkader|onderzoekskader)s?\b/gi, "referentiekader (het vaste woord in Omnibus)"],
  [/\b(?:middels|door middel van)\b/gi, "met of via"],
  [/\bteneinde\b/gi, "om"],
  [/\balsmede\b/gi, "en of ook"],
  [/\b(?:derhalve|dientengevolge)\b/gi, "daarom"],
  [/\bindien\b/gi, "als of wanneer"],
  [/\bdien(?:t|en) te\b/gi, "moet of moeten"],
];
const ZONDER_WOORDCONTROLE = "<!-- check-docs: geen-woordcontrole -->";
// Een pagina die zelf codes uitlegt (zoals de acceptatiecontracten), krijgt geen codewaarschuwingen.
const CODES_UITGELEGD = "<!-- check-docs: codes-uitgelegd -->";

export function woordWaarschuwingen(rel, tekst) {
  if (tekst.includes(ZONDER_WOORDCONTROLE) || rel === "CHANGELOG.md" || rel.startsWith(".github/") || /^skills\/[^/]+\/(SKILL\.md|references\/)/.test(rel)) return [];
  // Alleen lopende tekst: geen codeblokken, inline code, link-adressen of HTML.
  const schoon = tekst
    .replace(/^```[\s\S]*?^```/gm, (b) => b.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]*`/g, (b) => " ".repeat(b.length))
    .replace(/\]\([^)]*\)/g, (b) => " ".repeat(b.length))
    .replace(/<[^>\n]+>/g, (b) => " ".repeat(b.length));
  const uit = [];
  for (const [re, alternatief] of TE_VERMIJDEN) {
    if (alternatief.startsWith("interne projectcode") || alternatief.startsWith("code van")) {
      if (tekst.includes(CODES_UITGELEGD)) continue;
    }
    for (const m of schoon.matchAll(re)) {
      // Bestandsnamen zoals app/workflow-patterns.tsx tellen niet mee.
      const voor = schoon.slice(0, m.index).match(/\S*$/)[0];
      const na = schoon.slice(m.index + m[0].length).match(/^\S*/)[0];
      if (/[/.]\w/.test(voor + m[0] + na)) continue;
      uit.push(`${rel}:${schoon.slice(0, m.index).split("\n").length}: "${m[0]}" → ${alternatief}`);
    }
  }
  return uit;
}

// Leesbaarheid: zinnen van meer dan MAX_WOORDEN woorden in docs/ (zie de stijlgids).
export const MAX_WOORDEN = 25;

/** Splitst lopende tekst in zinnen, met het regelnummer waar elke zin begint. */
export function zinnen(tekst) {
  const schoon = tekst
    .replace(/<!--[\s\S]*?-->/g, (b) => b.replace(/[^\n]/g, " "))
    .replace(/^```[\s\S]*?^```/gm, (b) => b.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]*`/g, "Code")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>\n]+>/g, " ");
  // Blokken: een tabelcel, een opsommingspunt of een alinea (opeenvolgende gewone regels).
  const blokken = [];
  let alinea = null;
  schoon.split("\n").forEach((ruw, i) => {
    const regel = ruw.replace(/^\s*>\s?/, "").trim();
    const nr = i + 1;
    if (!regel || /^#{1,6}\s/.test(regel) || /^\|?\s*:?-{3,}/.test(regel)) { alinea = null; return; }
    if (regel.startsWith("|")) {
      alinea = null;
      for (const cel of regel.split("|")) if (cel.trim()) blokken.push({ nr, tekst: cel });
      return;
    }
    if (/^([-*+]|\d+\.)\s/.test(regel)) { alinea = { nr, tekst: regel.replace(/^([-*+]|\d+\.)\s/, "") }; blokken.push(alinea); return; }
    if (alinea) alinea.tekst += " " + regel;
    else { alinea = { nr, tekst: regel }; blokken.push(alinea); }
  });
  const uit = [];
  for (const b of blokken) {
    for (const zin of b.tekst.split(/(?<=[.!?:;][*"'”)]*)\s+(?=[A-Z0-9ÀÉÈËÏÖÜ*"'(])/u)) {
      const woorden = zin.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
      if (woorden.length) uit.push({ nr: b.nr, zin: zin.trim(), woorden: woorden.length });
    }
  }
  return uit;
}

export function zinWaarschuwingen(rel, tekst) {
  if (!rel.startsWith("docs/") || tekst.includes(ZONDER_WOORDCONTROLE)) return [];
  return zinnen(tekst).filter((z) => z.woorden > MAX_WOORDEN)
    .map((z) => `${rel}:${z.nr}: zin van ${z.woorden} woorden: "${z.zin.slice(0, 60)}…"`);
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
  const { scripts = {} } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const meldingen = controleerConfig(root, nvmrc);
  const waarschuwingen = [], lang = [];
  for (const rel of markdownBestanden(root)) {
    meldingen.push(...controleerBestand(root, rel, { nvmrc, scripts }));
    const tekst = readFileSync(path.join(root, rel), "utf8");
    waarschuwingen.push(...woordWaarschuwingen(rel, tekst));
    lang.push(...zinWaarschuwingen(rel, tekst));
  }
  return { meldingen, waarschuwingen, lang };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { meldingen, waarschuwingen, lang } = controleer(root);
  if (lang.length) {
    console.warn(`Leesbaarheid: ${lang.length} ${lang.length === 1 ? "lange zin" : "lange zinnen"} (meer dan ${MAX_WOORDEN} woorden; zie docs/bijdragen/stijlgids.md).`);
    for (const w of lang) console.warn(`  · ${w}`);
    console.warn("");
  }
  if (waarschuwingen.length) {
    console.warn(`Woordkeuze: ${waarschuwingen.length} ${waarschuwingen.length === 1 ? "waarschuwing" : "waarschuwingen"} (zie docs/bijdragen/stijlgids.md).`);
    for (const w of waarschuwingen) console.warn(`  · ${w}`);
    console.warn("");
  }
  if (meldingen.length) {
    console.error(`Documentatiecheck: ${meldingen.length} ${meldingen.length === 1 ? "probleem" : "problemen"} gevonden.\n`);
    for (const m of meldingen) console.error(`- ${m}`);
    console.error("\nUitleg: docs/bijdragen/ontwikkelen.md#documentatie-controleren");
    process.exit(1);
  }
  console.log("Documentatiecheck: alles in orde.");
}
