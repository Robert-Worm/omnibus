#!/usr/bin/env node
// Controleert externe links in de documentatie (README.md en docs/, met de werklijsten).
//
//   node scripts/check-links.mjs            toont kapotte links; afsluitcode 1 als er zijn
//   node scripts/check-links.mjs --issue    houdt één issue met label 'kapotte-links' bij
//
// Alleen 404, 410, een onbekend domein of een blijvende serverfout telt als kapot.
// 401, 403, 429 en time-outs betekenen meestal dat een site robots weert; die tellen niet mee.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LABEL = "kapotte-links";
const TIMEOUT_MS = 20_000;
const GELIJKTIJDIG = 4;

/** Herhaalt een vervanging tot de tekst niet meer verandert, zodat een verwijderd stuk geen nieuw stuk achterlaat. */
function totStabiel(tekst, patroon, vervanging = "") {
  let vorige;
  do { vorige = tekst; tekst = tekst.replace(patroon, vervanging); } while (tekst !== vorige);
  return tekst;
}

/** Haalt externe links uit markdown, zonder codeblokken, inline code en voorbeeldadressen. */
export function verzamelLinks(tekst) {
  const zonderCode = tekst
    .replace(/^ *```[\s\S]*?^ *```/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const schoon = totStabiel(zonderCode, /<!--[\s\S]*?-->/g);
  const uit = new Set();
  for (const m of schoon.matchAll(/\]\((https?:\/\/[^)\s]+)\)|<(https?:\/\/[^>\s]+)>|\bhref="(https?:\/\/[^"]+)"|\bsrc="(https?:\/\/[^"]+)"/g)) {
    const url = (m[1] || m[2] || m[3] || m[4]).replace(/[.,;]$/, "");
    if (/[<>{}]/.test(url) || !URL.canParse(url)) continue;
    const host = new URL(url).hostname;
    if (/^(localhost|127\.0\.0\.1)$/.test(host) || /\.(example|invalid|test)$/.test(host)) continue;
    // Claimlinks naar een nieuw issue verschillen alleen in hun vooringevulde tekst: één keer controleren.
    uit.add(/^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|discussions)\/new\?/.test(url) ? url.split("?")[0] : url);
  }
  return [...uit];
}

/** Beslist of een uitkomst kapot is. `status` is een HTTP-code of een foutcode als tekst. */
export function isKapot(status) {
  // Time-outs en verbroken verbindingen zeggen niets zeker: sommige sites weren cloudservers.
  if (typeof status === "string") return !/^(TIMEOUT|ETIMEDOUT|ECONNRESET|EAI_AGAIN|UND_ERR_SOCKET|UND_ERR_CONNECT_TIMEOUT)$/.test(status);
  return status === 404 || status === 410 || status >= 500;
}

async function probeer(url, methode) {
  const res = await fetch(url, {
    method: methode, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "Omnibus-linkcontrole (+https://github.com/Robert-Worm/omnibus)" },
  });
  res.body?.cancel().catch(() => {});
  return res.status;
}

/** Controleert één link: eerst HEAD, dan GET; bij een kapotte uitkomst nog één keer. */
export async function controleerLink(url, haal = probeer) {
  let status;
  for (let poging = 0; poging < 2; poging++) {
    try {
      status = await haal(url, "HEAD");
      if (status === 405 || status === 403 || status === 404 || status >= 500) status = await haal(url, "GET");
    } catch (fout) {
      status = fout.name === "TimeoutError" ? "TIMEOUT" : (fout.cause?.code || fout.code || "FOUT");
    }
    if (!isKapot(status)) return status;
  }
  return status;
}

/** Maakt de tekst van het issue. `kapot` is een lijst { url, status, bestanden }. */
export function issueTekst(kapot, datum) {
  const regels = kapot
    .sort((a, b) => a.url.localeCompare(b.url))
    .map((k) => `| ${k.url} | ${k.status} | ${k.bestanden.map((b) => `\`${b}\``).join(", ")} |`);
  return [
    `De wekelijkse linkcontrole van ${datum} vond ${kapot.length} ${kapot.length === 1 ? "link" : "links"} die niet meer ${kapot.length === 1 ? "werkt" : "werken"}.`,
    "",
    "| Link | Uitkomst | Staat in |",
    "| --- | --- | --- |",
    ...regels,
    "",
    "**Wat je doet:** zoek het nieuwe adres op en pas de link aan. Staat de link in een werklijst? Pas dan het bronbestand in `.github/voortgang/` aan; de werklijst wordt opnieuw gemaakt.",
    "",
    "Dit issue wordt elke week bijgewerkt en sluit vanzelf als alle links weer werken.",
  ].join("\n");
}

export function documentatieBestanden(root) {
  return execFileSync("git", ["ls-files", "README.md", "docs/*.md", "docs/**/*.md"], { cwd: root, encoding: "utf8" })
    .split("\n").filter(Boolean)
    // De werklijsten per soort bron bevatten ruim 9.000 Rijksmap-links uit de bronlijst. Die wekelijks
    // allemaal opvragen belast de Rijksmap; de aanbevolen werklijst blijft wel gecontroleerd.
    .filter((rel) => !rel.startsWith("docs/bijdragen/werklijst/"));
}

async function controleerAlles(root) {
  const waar = new Map();
  for (const rel of documentatieBestanden(root)) {
    for (const url of verzamelLinks(readFileSync(path.join(root, rel), "utf8"))) {
      if (!waar.has(url)) waar.set(url, new Set());
      waar.get(url).add(rel);
    }
  }
  const urls = [...waar.keys()], kapot = [];
  let volgende = 0;
  await Promise.all(Array.from({ length: GELIJKTIJDIG }, async () => {
    while (volgende < urls.length) {
      const url = urls[volgende++];
      const status = await controleerLink(url);
      if (isKapot(status)) kapot.push({ url, status, bestanden: [...waar.get(url)].sort() });
    }
  }));
  return { aantal: urls.length, kapot };
}

async function werkIssueBij(kapot) {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error("GITHUB_REPOSITORY en GITHUB_TOKEN zijn nodig voor --issue.");
  const gh = async (p, options = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${p}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} bij ${p}`);
    return res.json();
  };
  const open = (await gh(`/issues?labels=${LABEL}&state=open&per_page=10`)).filter((i) => !i.pull_request);
  const [bestaand, ...dubbel] = open;
  for (const i of dubbel) await gh(`/issues/${i.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "not_planned" }) });
  if (!kapot.length) {
    if (bestaand) {
      await gh(`/issues/${bestaand.number}/comments`, { method: "POST", body: JSON.stringify({ body: "Alle links werken weer. Dit issue sluit vanzelf." }) });
      await gh(`/issues/${bestaand.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
    }
    return;
  }
  const body = issueTekst(kapot, new Date().toISOString().slice(0, 10));
  const title = `Kapotte externe links (${kapot.length})`;
  if (bestaand) await gh(`/issues/${bestaand.number}`, { method: "PATCH", body: JSON.stringify({ title, body }) });
  else await gh("/issues", { method: "POST", body: JSON.stringify({ title, body, labels: [LABEL] }) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { aantal, kapot } = await controleerAlles(root);
  console.log(`Linkcontrole: ${aantal} externe links gecontroleerd, ${kapot.length} kapot.`);
  for (const k of kapot) console.log(`  · ${k.status}  ${k.url}  (${k.bestanden.join(", ")})`);
  if (process.argv.includes("--issue")) await werkIssueBij(kapot);
  else if (kapot.length) process.exitCode = 1;
}
