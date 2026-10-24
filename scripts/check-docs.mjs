#!/usr/bin/env node
// Consistentiecheck voor de documentatie.
// Controleert links en ankers, de Node-versie, de installatieopdracht en het
// vaste paginapatroon. Draait lokaal met `npm run check:docs` en in GitHub Actions.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatProductVersion } from "../lib/product-release.mjs";

export const INSTALL = "npm ci --ignore-scripts --no-audit --no-fund";

/**
 * Horen de schermafbeeldingen bij de huidige versie van de applicatie? `stand` is de inhoud
 * van docs/images/schermafbeeldingen.txt (of null), `versie` de huidige productversie.
 */
export function schermWaarschuwingen(stand, versie) {
  const opdracht = "vernieuw ze met npm run docs:screenshots -- --settings <local-build.json>";
  if (stand === null) return [`docs/images: er is nog niet vastgelegd bij welke versie de schermafbeeldingen horen; ${opdracht}`];
  const regels = stand.split("\n").map((r) => r.trim()).filter((r) => r && !r.startsWith("#")).map((r) => r.split(/\s+/));
  const oud = regels.filter(([, v]) => v !== versie).map(([b, v]) => `${b} (${v})`);
  return oud.length ? [`docs/images: ${oud.length} ${oud.length === 1 ? "afbeelding hoort" : "afbeeldingen horen"} bij een oudere versie dan ${versie}: ${oud.join(", ")}; ${opdracht}`] : [];
}

// Paginatypen (zie docs/bijdragen/bouwstenen.md#paginatypen). Elke pagina in docs/ noemt haar
// type in een verborgen regel: <!-- paginatype: taak -->.
export const PAGINATYPEN = ["start", "taak", "naslag", "data", "logboek"];
export const KORTE_PAGINA = 60;

/** Meldingen voor de verplichte onderdelen van het paginatype. */
export function paginatypeMeldingen(ruw) {
  const tekst = ruw.replace(/^ *```[\s\S]*?^ *```/gm, "");
  const types = [...tekst.matchAll(/<!-- paginatype: ([\w-]+) -->/g)].map((m) => m[1]);
  if (types.length !== 1) return [types.length ? "noemt meer dan één paginatype" : `mist het paginatype (<!-- paginatype: ${PAGINATYPEN.join(" | ")} -->)`];
  const [type] = types;
  if (!PAGINATYPEN.includes(type)) return [`onbekend paginatype "${type}"; kies uit ${PAGINATYPEN.join(", ")}`];
  const heeftSamengevat = /^## Samengevat$/m.test(tekst);
  const uit = [];
  if (type === "start" && heeftSamengevat) uit.push('startpagina zonder "## Samengevat" (zie de bouwstenen)');
  const lang = ruw.split("\n").length >= KORTE_PAGINA;
  if (type === "taak" && lang && !heeftSamengevat) uit.push('mist de kop "## Samengevat"');
  if (heeftSamengevat && !lang) uit.push(`korte pagina (minder dan ${KORTE_PAGINA} regels): laat "## Samengevat" weg`);
  const volgende = tekst.match(/^## Volgende stap\n+([^\n]+)/m)?.[1] ?? "";
  if (/^Terug\b/.test(volgende)) uit.push('"Volgende stap" wijst vooruit; begin niet met "Terug naar…"');
  if (type === "taak" && !/^(#{2,3} \d+\. |\d+\. )/m.test(tekst)) uit.push("taakpagina zonder genummerde stappen");
  if (type === "data" && !/automatisch bijgewerkt/i.test(tekst.split("\n").slice(0, 12).join("\n"))) uit.push('datapagina zonder de regel "Automatisch bijgewerkt" bovenaan');
  if (type === "logboek" && !/^\|.+\|\s*$/m.test(tekst)) uit.push("logboek zonder tabel");
  return uit;
}

/** Welke pagina's eindigen met de vaste voetregel: alles voor lezers, niet de instructies voor AI-assistenten. */
export const heeftVoetregel = (rel) =>
  rel !== "README.md" && rel !== "AGENTS.md" && rel !== "CHANGELOG.md" && !rel.startsWith(".github/") &&
  !/^skills\/[^/]+\/(SKILL\.md|references\/)/.test(rel) && !rel.startsWith("work/") && !rel.startsWith("local-data/runtime");

/** De vaste voetregel: [↑ ouder] · Wegwijzer · Begrippen · Routekaart, met paden vanaf de pagina zelf. */
export function voetregel(rel, titelVan) {
  const map = path.posix.dirname(rel), isIndex = path.posix.basename(rel) === "README.md";
  const ouder = isIndex ? (map === "." ? null : path.posix.join(path.posix.dirname(map), "README.md")) : path.posix.join(map, "README.md");
  const naar = (doel) => path.posix.relative(map, doel) || path.posix.basename(doel);
  const naam = ouder === "README.md" ? "Omnibus" : ouder === "docs/README.md" ? "Wegwijzer" : titelVan(ouder);
  const delen = [`[↑ ${naam}](${naar(ouder)})`];
  for (const [label, doel] of [["Wegwijzer", "docs/README.md"], ["Begrippen", "docs/begrippen.md"], ["Routekaart", "docs/routekaart.md"]])
    if (doel !== rel && doel !== ouder) delen.push(`[${label}](${naar(doel)})`);
  return delen.join(" · ");
}

/** De korte naam van een pagina: de titel, zonder toevoeging tussen haakjes. */
export function korteTitel(root, rel) {
  const pad = path.join(root, rel);
  const kop = (existsSync(pad) ? readFileSync(pad, "utf8").match(/^# (.+)$/m)?.[1] : null) ?? path.posix.basename(path.posix.dirname(rel));
  return kop.replace(/\s*\(.*\)\s*$/, "").replace(/`/g, "").trim();
}

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
    for (const m of paginatypeMeldingen(tekst)) meld(0, m);
    if (!/^## Volgende stap$/m.test(tekst)) meld(0, 'mist de kop "## Volgende stap"');
  }
  if (heeftVoetregel(rel)) {
    const gevuld = regels.filter((r) => r.trim());
    const verwacht = voetregel(rel, (r) => korteTitel(root, r));
    if (gevuld.at(-1) !== verwacht) meld(0, `eindigt niet met de vaste voetregel: ${verwacht}`);
    else if (gevuld.at(-2) !== "---") meld(0, 'zet "---" direct boven de voetregel');
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

/** Opdrachten in docs/ die een npm-script hebben, horen als `npm run …` te staan. */
export function opdrachtWaarschuwingen(rel, tekst, scripts) {
  if (!rel.startsWith("docs/")) return [];
  const alias = new Map();
  for (const [naam, opdracht] of Object.entries(scripts)) {
    const m = opdracht.match(/^node ((?:scripts|local-data|content-tools|agent-tools)\/[\w.-]+\.mjs)$/);
    if (m) alias.set(m[1], naam);
  }
  const uit = [];
  tekst.split("\n").forEach((regel, i) => {
    for (const m of regel.matchAll(/\bnode ((?:scripts|local-data|content-tools|agent-tools)\/[\w.-]+\.mjs)/g)) {
      if (alias.has(m[1])) uit.push(`${rel}:${i + 1}: gebruik "npm run ${alias.get(m[1])}" in plaats van "node ${m[1]}"`);
    }
  });
  return uit;
}

/** Meldingen (GitHub-alerts) volgens de bouwstenen: vaste typen, een vet Nederlands woord vooraan, niet gestapeld. */
export function meldingWaarschuwingen(rel, ruw) {
  if (rel === "CHANGELOG.md" || /^skills\/[^/]+\/(SKILL\.md|references\/)/.test(rel)) return [];
  const regels = ruw.replace(/^ *```[\s\S]*?^ *```/gm, (b) => b.replace(/[^\n]/g, "")).split("\n");
  const uit = [], waar = (i) => `${rel}:${i + 1}`;
  let vorigeEinde = -10;
  regels.forEach((regel, i) => {
    if (/^#{1,6} Let op\b/.test(regel)) uit.push(`${waar(i)}: kop "Let op"; maak er een melding van of gebruik "Goed om te weten"`);
    if (/^(Let op:|\*\*Nooit doen:\*\*)/.test(regel)) uit.push(`${waar(i)}: losse waarschuwing; maak er een melding ([!WARNING]) van`);
    const m = regel.match(/^> \[!(\w+)\]\s*$/);
    if (!m) return;
    if (!["NOTE", "TIP", "IMPORTANT", "WARNING"].includes(m[1])) uit.push(`${waar(i)}: melding [!${m[1]}] wordt niet gebruikt`);
    if (!/^> \*\*[^*]+:\*\* /.test(regels[i + 1] || "")) uit.push(`${waar(i)}: begin een melding met een vet Nederlands woord, zoals **Let op:**`);
    if (i - vorigeEinde <= 2) uit.push(`${waar(i)}: twee meldingen direct onder elkaar`);
    let j = i + 1; while (j < regels.length && regels[j].startsWith(">")) j++;
    vorigeEinde = j - 1;
  });
  return uit;
}

/** Nette tekst (docs/bijdragen/bouwstenen.md): geen emoji in koppen, geen afgebroken alinea's, alleen toegestane HTML, en geen gelijke linktekst naar verschillende pagina's. */
export const TOEGESTANE_HTML = ["a", "b", "br", "details", "h1", "img", "p", "picture", "source", "strong", "summary", "sub", "sup", "kbd"];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
export function tekstWaarschuwingen(rel, ruw) {
  if (!heeftVoetregel(rel) && rel !== "README.md") return [];
  const uit = [], waar = (i) => `${rel}:${i + 1}`;
  const regels = ruw.replace(/^ *```[\s\S]*?^ *```/gm, (b) => b.replace(/[^\n]/g, "")).split("\n");
  const gewoon = (r) => r.trim() && !/^\s*([-*+] |\d+\. |\||>|#|<|!\[|\[↑|---)/.test(r) && !/^ {4}/.test(r) && !/<\/?\w+[^>]*>\s*$/.test(r);
  const links = new Map(), data = /<!-- paginatype: data -->/.test(ruw);
  regels.forEach((r, i) => {
    if (/^#{1,6} /.test(r) && EMOJI.test(r)) uit.push(`${waar(i)}: emoji in een kop; het anker wordt dan onleesbaar`);
    if (i && gewoon(r) && gewoon(regels[i - 1]) && !/( {2}|\\)$/.test(regels[i - 1])) uit.push(`${waar(i)}: alinea over meerdere regels afgebroken; zet hem op één regel`);
    const zonderCode = r.replace(/`[^`]*`/g, "");
    for (const [, tag] of zonderCode.matchAll(/<\/?([a-zA-Z][\w-]*)\b(?!:)[^>]*>/g)) if (!TOEGESTANE_HTML.includes(tag.toLowerCase())) uit.push(`${waar(i)}: HTML-element <${tag}> is niet toegestaan; zie de bouwstenen`);
    if (data) return;
    for (const [, tekst, doel, titel] of zonderCode.matchAll(/(?<!!)\[([^\]]+)\]\(([^)\s]+)( "[^"]*")?\)/g)) {
      if (titel) continue;
      const sleutel = tekst.trim().toLowerCase(), pagina = doel.split("#")[0] || rel;
      const eerder = links.get(sleutel);
      if (eerder && eerder.pagina !== pagina) uit.push(`${waar(i)}: linktekst "${tekst}" wijst ook naar ${eerder.doel} (regel ${eerder.regel + 1}); maak de tekst verschillend`);
      else if (!eerder) links.set(sleutel, { pagina, doel, regel: i });
    }
  });
  return uit;
}

/** Schema's (docs/bijdragen/bouwstenen.md#schemas): vaste kleuren, en van boven naar beneden bij meer dan vier vakken. */
export const SCHEMAKLEUREN = {
  default: "fill:#eaf2f8,stroke:#01689b,color:#15233b;",
  groep: "fill:#f6f8fb,stroke:#9fb3c8,color:#15233b;",
  klaar: "fill:#e8f5ec,stroke:#2e7d4f,color:#15233b;",
  open: "fill:#ffffff,stroke:#8a97a6,color:#15233b,stroke-dasharray:4 3;",
};
export function schemaWaarschuwingen(rel, ruw) {
  if (rel === "CHANGELOG.md") return [];
  const uit = [];
  for (const m of ruw.matchAll(/^```mermaid\n([\s\S]*?)^```/gm)) {
    const plek = `${rel}:${ruw.slice(0, m.index).split("\n").length}`, body = m[1];
    const groepen = new Set([...body.matchAll(/subgraph (\w+)/g)].map((g) => g[1]));
    const vakken = new Set([...body.matchAll(/\b([A-Z]\w*)[[(]/g)].map((v) => v[1]).filter((v) => !groepen.has(v)));
    if (vakken.size > 4 && /^\s*(flowchart|graph) (LR|RL)\b/m.test(body)) uit.push(`${plek}: schema met ${vakken.size} vakken van links naar rechts; gebruik flowchart TD`);
    if (!body.includes(`classDef default ${SCHEMAKLEUREN.default}`)) uit.push(`${plek}: schema zonder de vaste kleur (classDef default ${SCHEMAKLEUREN.default})`);
    for (const [, naam, stijl] of body.matchAll(/classDef (\w+) ([^\n]+)/g)) {
      if (SCHEMAKLEUREN[naam] !== stijl.trim()) uit.push(`${plek}: classDef ${naam} volgt de vaste kleurset niet`);
    }
    if (/^\s*style \w+/m.test(body)) uit.push(`${plek}: losse style-regel; gebruik een klasse uit de vaste kleurset`);
  }
  return uit;
}

/** Afbeeldingen (docs/bijdragen/bouwstenen.md#afbeeldingen): licht en donker, alt-tekst en een bijschrift. */
export function afbeeldingWaarschuwingen(rel, ruw) {
  if (rel === "CHANGELOG.md" || rel.startsWith("skills/")) return [];
  const uit = [], tekst = ruw.replace(/^ *```[\s\S]*?^ *```/gm, (b) => b.replace(/[^\n]/g, ""));
  const regel = (i) => tekst.slice(0, i).split("\n").length;
  for (const m of tekst.matchAll(/!\[[^\]]*\]\(([^)]*images\/[^)]+\.png)\)/g)) uit.push(`${rel}:${regel(m.index)}: afbeelding als ![…](…); gebruik <picture> met een donkere variant`);
  for (const m of tekst.matchAll(/<img\b[^>]*>/g)) {
    const src = m[0].match(/src="([^"]+)"/)?.[1] || "";
    if (/^https?:/.test(src)) continue; // badges
    const plek = `${rel}:${regel(m.index)}`, alt = m[0].match(/alt="([^"]*)"/)?.[1] ?? "";
    if (alt.length < 10 || alt.length > 150) uit.push(`${plek}: alt-tekst van ${alt.length} tekens; houd hem tussen 10 en 150`);
    const voor = tekst.slice(Math.max(0, m.index - 200), m.index);
    if (/\.png$/.test(src) && !/<source media="\(prefers-color-scheme: dark\)" srcset="[^"]+-donker\.png">\s*$/.test(voor)) uit.push(`${plek}: afbeelding zonder donkere variant in <picture>`);
    if (/<h1\b[^>]*>\s*(<picture>\s*<source[^>]*>\s*)?$/.test(voor)) continue; // de banner
    const na = tekst.slice(m.index + m[0].length).replace(/^\s*<\/picture>/, "").replace(/^\s*<\/a>/, "");
    if (!/^\s*\n\s*\n\*[^*\n]+\*\s*(\n|$)/.test(na)) uit.push(`${plek}: zet een kort bijschrift *zo* direct onder de afbeelding`);
  }
  return uit;
}

/** Beeldbestanden in docs/images: niet te groot, en bij elke PNG een donkere variant. */
export function beeldbestandWaarschuwingen(bestanden) {
  const uit = [], namen = new Set(bestanden.map((b) => b.naam));
  for (const { naam, grootte } of bestanden) {
    if (naam.endsWith(".png") && grootte > 300 * 1024) uit.push(`docs/images/${naam}: ${Math.round(grootte / 1024)} KB; een PNG is hooguit 300 KB`);
    if (naam.endsWith(".gif") && grootte > 1024 * 1024) uit.push(`docs/images/${naam}: ${Math.round(grootte / 1024)} KB; een GIF is hooguit 1 MB`);
    if (naam.endsWith(".png") && !naam.endsWith("-donker.png") && !namen.has(naam.replace(/\.png$/, "-donker.png"))) uit.push(`docs/images/${naam}: geen donkere variant; maak hem met npm run docs:screenshots`);
  }
  return uit;
}

/** Vaste blokken (docs/bijdragen/bouwstenen.md): vaste namen, uitklapblokken zonder koppen, kaarten in vaste volgorde, geen dubbele koppen. */
export const BLOKNAMEN = new Map([["technische referentie", "Technische details"], ["waar staat het?", "Waar staat dit?"], ["wat je nodig hebt", "Wat heb je nodig?"], ["benodigdheden", "Wat heb je nodig?"], ["vereisten", "Wat heb je nodig?"], ["tips", "Goed om te weten"], ["opmerkingen", "Goed om te weten"]]);
export const KAARTWOORDEN = ["Herkennen", "Oorzaak", "Eerst doen", "Herstellen", "Nazorg"];
export function blokWaarschuwingen(rel, ruw) {
  if (!rel.startsWith("docs/")) return [];
  const uit = [], waar = (i) => `${rel}:${i + 1}`;
  const regels = ruw.replace(/^ *```[\s\S]*?^ *```/gm, (b) => b.replace(/[^\n]/g, "")).split("\n");
  const gezien = new Map();
  let inDetails = false, kaart = -1;
  regels.forEach((regel, i) => {
    if (/<details>/.test(regel)) {
      inDetails = true;
      const s = regel.match(/<summary>(.*?)<\/summary>/)?.[1];
      if (s !== undefined && !/^<b>[^<]+<\/b>( · .+)?$/.test(s)) uit.push(`${waar(i)}: kop van een uitklapblok als <b>Naam</b> · aanvulling`);
    }
    if (/<\/details>/.test(regel)) inDetails = false;
    const kop = regel.match(/^(#{1,6}) (.+?)\s*$/);
    if (kop) {
      kaart = -1;
      if (inDetails) uit.push(`${waar(i)}: kop in een uitklapblok; GitHub toont hem niet in de inhoudsopgave. Gebruik een vet woord`);
      const naam = kop[2].toLowerCase();
      if (BLOKNAMEN.has(naam)) uit.push(`${waar(i)}: kop "${kop[2]}"; noem dit blok "${BLOKNAMEN.get(naam)}"`);
      if (naam === "vaste regels" && !rel.startsWith("docs/beheer/")) uit.push(`${waar(i)}: "Vaste regels" alleen op beheerpagina's`);
      const sleutel = `${kop[1]} ${naam}`;
      if (gezien.has(sleutel)) uit.push(`${waar(i)}: dubbele kop "${kop[2]}" (ook op regel ${gezien.get(sleutel) + 1})`);
      else gezien.set(sleutel, i);
      return;
    }
    if (/^\*\*(Wat het betekent|Wat je doet):\*\*/.test(regel)) uit.push(`${waar(i)}: oude kaartvorm; gebruik ${KAARTWOORDEN.join(" · ")}`);
    const woord = regel.match(/^- \*\*([^*:]+):\*\*/)?.[1];
    const plek = KAARTWOORDEN.indexOf(woord);
    if (plek >= 0) {
      if (plek <= kaart) uit.push(`${waar(i)}: "${woord}" staat niet op zijn plek; volgorde ${KAARTWOORDEN.join(" · ")}`);
      kaart = plek;
    }
  });
  return uit;
}

/** Vorm van taakpagina's (docs/bijdragen/bouwstenen.md#stappen en #opdrachten): stapkoppen, codeblokken, plaatshouders en systeemlabels. */
export const CODETALEN = ["text", "bash", "powershell", "json", "mermaid"];
export const SYSTEEMLABELS = ["**Windows (PowerShell)**", "**macOS en Linux (bash)**"];
export function vormWaarschuwingen(rel, ruw) {
  if (rel === "CHANGELOG.md" || rel.startsWith("skills/")) return [];
  const docs = rel.startsWith("docs/"), type = ruw.match(/<!-- paginatype: (\w+) -->/)?.[1];
  const uit = [], waar = (i) => `${rel}:${i + 1}`;
  let inCode = false;
  ruw.split("\n").forEach((regel, i) => {
    const hek = regel.match(/^\s*```\s*([\w-]*)/);
    if (hek) {
      if (!inCode && !CODETALEN.includes(hek[1])) uit.push(`${waar(i)}: codeblok ${hek[1] ? `in "${hek[1]}"` : "zonder taal"}; gebruik ${CODETALEN.join(", ")}`);
      inCode = !inCode;
      return;
    }
    if (!docs) return;
    if (inCode) {
      if (/(["'])<[^>\s]+>\1/.test(regel)) uit.push(`${waar(i)}: plaatshouder tussen aanhalingstekens; schrijf <zo-een-plaatshouder>`);
      return;
    }
    if (/^## \d+\. /.test(regel)) uit.push(`${waar(i)}: stap als ##-kop; zet stappen als ### onder ## Stap voor stap`);
    else if (type !== "taak" && /^#{3,4} \d+\. /.test(regel)) uit.push(`${waar(i)}: genummerde kop buiten een taakpagina; situaties nummer je niet`);
    if (/^(\*\*)?(Windows|macOS)\b.{0,30}(:|\*\*)\s*$/.test(regel) && !SYSTEEMLABELS.includes(regel.trim())) uit.push(`${waar(i)}: systeemlabel "${regel.trim()}"; gebruik ${SYSTEEMLABELS.join(" of ")}`);
  });
  return uit;
}

// Statuslabels uit de bouwstenen (docs/bijdragen/bouwstenen.md#statuslabels).
export const STATUSLABELS = ["✅ Klaar", "✅ In database", "🔄 Bezig", "🔄 In bewerking", "📦 Ingeleverd", "⬜ Open", "⬜ Gepland",
  "🔒 Niet beschikbaar", "🔒 Niet openbaar", "🔒 Toestemming nodig", "🔁 Mogelijk dubbel", "➖ Niet van toepassing"];

/** Leest de tabellen uit markdown: kop, uitlijning, rijen en het regelnummer van de kop. */
export function tabellen(ruw) {
  const regels = ruw.replace(/^ *```[\s\S]*?^ *```/gm, (b) => b.replace(/[^\n]/g, "")).split("\n");
  const cellen = (r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim());
  const uit = [];
  for (let i = 0; i + 1 < regels.length; i++) {
    if (!/^\s*\|/.test(regels[i]) || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(regels[i + 1])) continue;
    const kop = cellen(regels[i]), uitlijning = cellen(regels[i + 1]);
    const rijen = [];
    let j = i + 2;
    while (j < regels.length && /^\s*\|/.test(regels[j])) rijen.push({ nr: j + 1, cellen: cellen(regels[j]) }), j++;
    uit.push({ nr: i + 1, kop, uitlijning, rijen });
    i = j - 1;
  }
  return uit;
}

/** Tabelregels uit de bouwstenen. Fouten: lege kopcellen. Waarschuwingen: de rest. */
export function tabelControle(rel, tekst) {
  const fouten = [], waarschuwingen = [];
  if (rel === "CHANGELOG.md" || /^skills\/[^/]+\/(SKILL\.md|references\/)/.test(rel)) return { fouten, waarschuwingen };
  const woorden = (c) => c.replace(/\]\([^)]*\)/g, "]").replace(/`[^`]*`/g, "x").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  for (const t of tabellen(tekst)) {
    const plek = `${rel}:${t.nr}`;
    if (t.kop.some((c) => !c)) fouten.push(`${plek}: tabel met een lege kopcel; geef elke kolom een kop (zie de bouwstenen)`);
    if (t.kop.length > 4 && t.kop.join("|") !== "ID|Datum|Besluit|Reden|Gevolg") waarschuwingen.push(`${plek}: tabel met ${t.kop.length} kolommen; hooguit vier`);
    const status = t.kop.findIndex((c) => /^status$/i.test(c));
    t.kop.forEach((_, k) => {
      const waarden = t.rijen.map((r) => (r.cellen[k] || "").replace(/<!--[^>]*-->/g, "").trim()).filter((c) => c && c !== "–");
      if (!/^(stap|#|nr\.?)$/i.test(t.kop[k]) && waarden.length && waarden.every((c) => /^[\d.,]+$/.test(c)) && !/-:\s*$/.test(t.uitlijning[k] || ""))
        waarschuwingen.push(`${plek}: kolom "${t.kop[k]}" bevat getallen; lijn rechts uit (---:)`);
    });
    for (const r of t.rijen) {
      r.cellen.forEach((c, k) => {
        if (!c) waarschuwingen.push(`${rel}:${r.nr}: lege cel; schrijf "–"`);
        if (k === 0 && /^\*\*[^*]+\*\*$/.test(c)) waarschuwingen.push(`${rel}:${r.nr}: eerste kolom vet; maak hem gewone tekst`);
        if (/\b\d{1,2}-\d{1,2}-\d{4}\b/.test(c)) waarschuwingen.push(`${rel}:${r.nr}: datum in een tabel als JJJJ-MM-DD schrijven`);
        else if (woorden(c) > 25) waarschuwingen.push(`${rel}:${r.nr}: cel van ${woorden(c)} woorden; maak er een lijst of kaart van`);
        if (k === status && c && c !== "–" && !STATUSLABELS.includes(c.replace(/\u00a0/g, " "))) waarschuwingen.push(`${rel}:${r.nr}: statuscel "${c.slice(0, 40)}" volgt de statuslabels niet`);
        if (k === status && c === "⬜ Gepland" && !r.cellen.some((x) => /\/issues\/\d+/.test(x))) waarschuwingen.push(`${rel}:${r.nr}: geplande stap zonder issue; leg hem vast in een epic of user story en link ernaar`);
      });
    }
  }
  return { fouten, waarschuwingen };
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
    waarschuwingen.push(...opdrachtWaarschuwingen(rel, tekst, scripts));
    waarschuwingen.push(...meldingWaarschuwingen(rel, tekst));
    waarschuwingen.push(...vormWaarschuwingen(rel, tekst));
    waarschuwingen.push(...blokWaarschuwingen(rel, tekst));
    waarschuwingen.push(...afbeeldingWaarschuwingen(rel, tekst));
    waarschuwingen.push(...schemaWaarschuwingen(rel, tekst));
    waarschuwingen.push(...tekstWaarschuwingen(rel, tekst));
    const tabel = tabelControle(rel, tekst);
    meldingen.push(...tabel.fouten);
    waarschuwingen.push(...tabel.waarschuwingen);
    lang.push(...zinWaarschuwingen(rel, tekst));
  }
  const beelden = path.join(root, "docs", "images");
  if (existsSync(beelden)) waarschuwingen.push(...beeldbestandWaarschuwingen(readdirSync(beelden).filter((n) => /\.(png|gif)$/.test(n)).map((naam) => ({ naam, grootte: statSync(path.join(beelden, naam)).size }))));
  const release = path.join(root, "lib", "product-release.mjs");
  const nummer = existsSync(release) && readFileSync(release, "utf8").match(/PRODUCT_RELEASE_NUMBER\s*=\s*(\d+)/)?.[1];
  if (nummer) {
    const stand = path.join(root, "docs", "images", "schermafbeeldingen.txt");
    waarschuwingen.push(...schermWaarschuwingen(existsSync(stand) ? readFileSync(stand, "utf8") : null, formatProductVersion(Number(nummer))));
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
