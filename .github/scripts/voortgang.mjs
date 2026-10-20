// Werkt de voortgangspagina's bij op basis van de werklijsten en de claims (issues).
//
// Lokaal draaien (zonder GitHub, dus zonder claims):
//   node .github/scripts/voortgang.mjs
// In GitHub Actions leest het script de issues met het label "claim" en verwerkt het
// de opdrachten /inleveren en /vrijgeven uit reacties.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = join(root, ".github", "voortgang");
const outDir = join(root, "docs", "bijdragen");
const repo = process.env.GITHUB_REPOSITORY || "Robert-Worm/omnibus";
const token = process.env.GITHUB_TOKEN;
const repoUrl = `https://github.com/${repo}`;
const claimTemplate = "bron-claimen.yml";

// ---------- werklijsten lezen ----------
function readCsv(file) {
  const text = readFileSync(file, "utf8").replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ";") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])));
}
const csvCell = (v) => (/[;"\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
const writeCsv = (file, rows, cols) =>
  writeFileSync(file, "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(";"))].join("\n") + "\n");

const rapporten = readCsv(join(dataDir, "rapporten.csv"));
const verwerkt = JSON.parse(readFileSync(join(dataDir, "verwerkt.json"), "utf8"));
const kaders = JSON.parse(readFileSync(join(dataDir, "wetten-en-kaders.json"), "utf8"));
const rapportById = new Map(rapporten.map((r) => [r.id, r]));
const kaderById = new Map(kaders.groepen.flatMap((g) => g.bronnen.map((b) => [b.id.toUpperCase(), { ...b, groep: g }])));
const inDatabaseKaders = new Set(verwerkt.wettenEnKaders);

// ---------- GitHub ----------
async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) },
  });
  if (!res.ok && res.status !== 422) throw new Error(`GitHub ${options.method || "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
const comment = (n, body) => gh(`/issues/${n}/comments`, { method: "POST", body: JSON.stringify({ body }) });
const addLabels = (n, labels) => gh(`/issues/${n}/labels`, { method: "POST", body: JSON.stringify({ labels }) });
const closeIssue = (n, reason = "completed") => gh(`/issues/${n}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: reason }) });

const LABELS = [
  { name: "claim", color: "01689b", description: "Iemand verwerkt deze bron (check-out)" },
  { name: "ingeleverd", color: "1a7f37", description: "Pakket ingeleverd, wacht op controle (check-in)" },
  { name: "verwerkt", color: "15233b", description: "Bron zit in de database" },
  { name: "dubbel", color: "bf8700", description: "Bron was al geclaimd of verwerkt" },
];
async function ensureLabels() {
  const existing = new Set((await gh("/labels?per_page=100")).map((l) => l.name));
  for (const l of LABELS) if (!existing.has(l.name)) await gh("/labels", { method: "POST", body: JSON.stringify(l) });
}

// Haal uit de tekst van een claim welke bron het is.
function identify(issue) {
  const text = `${issue.title}\n${issue.body || ""}`;
  const m = text.match(/rijksmap\.nl\/rapport\/([a-z0-9-]+)/i);
  if (m && rapportById.has(m[1].toLowerCase())) return { soort: "rapport", id: m[1].toLowerCase() };
  const field = (issue.body || "").match(/###\s*Welke bron[^\n]*\n+([^\n]+)/i)?.[1]?.trim() || "";
  for (const candidate of [field, issue.title.replace(/^claim:\s*/i, "")]) {
    const code = candidate.match(/\b([A-Z0-9][A-Z0-9-]{2,})\b/g) || [];
    for (const c of code) if (kaderById.has(c.toUpperCase())) return { soort: "kader", id: c.toUpperCase() };
    const lower = candidate.toLowerCase();
    for (const [id, k] of kaderById) if (lower && k.titel.toLowerCase() === lower) return { soort: "kader", id };
  }
  return null;
}

async function loadClaims() {
  if (!token) return [];
  const claims = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/issues?labels=claim&state=all&per_page=100&page=${page}`);
    for (const issue of batch) {
      if (issue.pull_request) continue;
      const bron = identify(issue);
      const labels = issue.labels.map((l) => l.name);
      claims.push({
        number: issue.number, url: issue.html_url, user: issue.user.login, open: issue.state === "open",
        since: issue.created_at.slice(0, 10), labels, bron,
        status: labels.includes("ingeleverd") ? "ingeleverd" : "in bewerking",
      });
    }
    if (batch.length < 100) break;
  }
  return claims;
}

// Opdrachten in reacties en controle van nieuwe claims.
async function handleEvent(claims) {
  if (!token || !process.env.GITHUB_EVENT_PATH) return;
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const issue = event.issue;
  if (!issue || issue.pull_request || !issue.labels?.some((l) => l.name === "claim")) return;
  const claim = claims.find((c) => c.number === issue.number);
  const isOwner = ["OWNER", "MEMBER", "COLLABORATOR"].includes(event.comment?.author_association || "");

  if (process.env.GITHUB_EVENT_NAME === "issues" && event.action === "opened") {
    if (!claim?.bron) {
      await comment(issue.number, "Ik kon niet vinden welke bron je bedoelt. Zet de link naar het rapport op de Rijksmap (`https://www.rijksmap.nl/rapport/...`) of de code uit de [werklijst wetten en kaders](" + `${repoUrl}/blob/main/docs/bijdragen/werklijst-wetten-en-kaders.md` + ") in je claim. Pas daarvoor je eerste bericht aan; de voortgang werkt zich daarna vanzelf bij.");
      return;
    }
    const key = `${claim.bron.soort}:${claim.bron.id}`;
    const already = claims.find((c) => c.open && c.number !== issue.number && c.bron && `${c.bron.soort}:${c.bron.id}` === key && c.number < issue.number);
    const done = claim.bron.soort === "rapport" ? verwerkt.rapporten[claim.bron.id] : inDatabaseKaders.has(claim.bron.id);
    if (already || done) {
      await addLabels(issue.number, ["dubbel"]);
      await comment(issue.number, already
        ? `Deze bron is al geclaimd door @${already.user} in #${already.number}. Kies een andere bron uit de [werklijst](${repoUrl}/blob/main/docs/bijdragen/voortgang.md), of overleg in #${already.number}.`
        : "Deze bron zit al in de database. Kies een andere bron uit de [werklijst](" + `${repoUrl}/blob/main/docs/bijdragen/voortgang.md` + ").");
      await closeIssue(issue.number, "not_planned");
      return;
    }
    await comment(issue.number, [
      `Dank je, @${issue.user.login}! Deze bron staat nu op jouw naam in de [voortgang](${repoUrl}/blob/main/docs/bijdragen/voortgang.md).`,
      "",
      `**Zo ga je verder:** volg [een bron verwerken](${repoUrl}/blob/main/docs/bijdragen/bron-verwerken.md).`,
      "",
      "- Klaar? Schrijf `/inleveren` in een reactie, met een korte toelichting.",
      "- Lukt het toch niet? Schrijf `/vrijgeven`. Dan komt de bron weer vrij voor iemand anders.",
    ].join("\n"));
    return;
  }

  if (process.env.GITHUB_EVENT_NAME === "issue_comment" && event.action === "created") {
    const text = (event.comment.body || "").trim().toLowerCase();
    const mayAct = event.comment.user.login === issue.user.login || isOwner;
    if (!mayAct || issue.state !== "open") return;
    if (text.startsWith("/inleveren")) {
      await addLabels(issue.number, ["ingeleverd"]);
      await comment(issue.number, "Ingeleverd. De beheerder controleert het pakket en laat hier weten hoe het verdergaat. Zodra de bron in een nieuwe databaserelease zit, wordt deze claim gesloten.");
    } else if (text.startsWith("/vrijgeven")) {
      await comment(issue.number, "De bron is vrijgegeven en staat weer open in de werklijst. Bedankt voor het laten weten.");
      await closeIssue(issue.number, "not_planned");
    }
  }
}

// ---------- pagina's schrijven ----------
const claimLink = (titel, bron) =>
  `${repoUrl}/issues/new?template=${claimTemplate}&title=${encodeURIComponent("Claim: " + titel.slice(0, 120))}&bron=${encodeURIComponent(bron)}`;
const rijksmapUrl = (id) => `https://www.rijksmap.nl/rapport/${id}/`;
const short = (s, n = 90) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const esc = (s) => String(s).replace(/\|/g, "/");

function build(claims) {
  const active = new Map();
  for (const c of claims) if (c.open && c.bron && !c.labels.includes("dubbel")) {
    const key = `${c.bron.soort}:${c.bron.id}`;
    if (!active.has(key)) active.set(key, c);
  }
  const statusOf = (soort, id) => {
    if (soort === "rapport" ? verwerkt.rapporten[id] : inDatabaseKaders.has(id)) return { status: "in database" };
    const c = active.get(`${soort}:${id}`);
    return c ? { status: c.status, door: c.user, issue: c.url, sinds: c.since } : { status: "open" };
  };

  // Rapporten
  const rows = rapporten.map((r) => {
    const s = statusOf("rapport", r.id);
    return { ...r, ...s, omnibus: verwerkt.rapporten[r.id] || "", rijksmap: rijksmapUrl(r.id), claimen: s.status === "open" ? claimLink(r.titel, rijksmapUrl(r.id)) : "" };
  });
  const cols = ["status", "door", "sinds", "titel", "datum", "ministerie", "onderdeel", "bron", "aanbevolen", "omnibus", "rijksmap", "claimen", "issue", "id"];
  mkdirSync(outDir, { recursive: true });
  writeCsv(join(outDir, "werklijst-rapporten.csv"), rows, cols);
  writeCsv(join(outDir, "werklijst-aanbevolen.csv"), rows.filter((r) => r.aanbevolen === "ja"), cols);

  const count = (list, st) => list.filter((r) => r.status === st).length;
  const aanbevolen = rows.filter((r) => r.aanbevolen === "ja");

  // Wetten en kaders
  const kaderRows = kaders.groepen.map((g) => ({ g, items: g.bronnen.map((b) => ({ ...b, ...statusOf("kader", b.id.toUpperCase()) })) }));
  const allKaders = kaderRows.flatMap((k) => k.items);

  const statusLabel = { "in database": "✅ in database", "in bewerking": "🔄 in bewerking", ingeleverd: "📦 ingeleverd", open: "⬜ open" };
  const kaderMd = [
    "# Werklijst wetten en kaders",
    "",
    "> **In het kort:** welke wetten, regels en normenkaders in Omnibus kunnen, wat er al in zit, en welke je kunt claimen.",
    "",
    "## Wat staat hier",
    "",
    "Per groep zie je de bronnen, of ze al in de database zitten, en of iemand eraan werkt. De kolom *Rechten* bij elke groep zegt waarom je de bron openbaar mag verwerken, of dat je toestemming van de uitgever nodig hebt.",
    "",
    "Mis je een bron? Stel hem voor in [Discussions](" + `${repoUrl}/discussions` + ").",
    "",
    ...kaderRows.flatMap(({ g, items }) => [
      `## ${g.titel}`,
      "",
      `**Rechten:** ${g.rechten}`,
      "",
      "| Bron | Code | Status | Actie |",
      "| --- | --- | --- | --- |",
      ...items.map((b) => `| [${esc(b.titel)}](${b.link}) | \`${b.id}\` | ${statusLabel[b.status]}${b.door ? ` · @${b.door}` : ""} | ${b.status === "open" && g.id !== "licentie" ? `[Claimen](${claimLink(b.titel, b.id)})` : b.issue ? `[Bekijk claim](${b.issue})` : ""} |`),
      "",
    ]),
    "## Volgende stap",
    "",
    `Kies een open bron en klik op **Claimen**. Daarna volg je [een bron verwerken](bron-verwerken.md).`,
    "",
    "*Deze pagina wordt automatisch bijgewerkt. Pas haar niet met de hand aan; de gegevens staan in `.github/voortgang/`.*",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "werklijst-wetten-en-kaders.md"), kaderMd);

  // Voortgang
  const busy = [...active.values()].sort((a, b) => a.since.localeCompare(b.since));
  const nameOf = (c) => c.bron.soort === "rapport" ? rapportById.get(c.bron.id).titel : kaderById.get(c.bron.id).titel;
  const linkOf = (c) => c.bron.soort === "rapport" ? rijksmapUrl(c.bron.id) : kaderById.get(c.bron.id).link;
  const inDb = rows.filter((r) => r.status === "in database").sort((a, b) => b.datum.localeCompare(a.datum));
  const suggestions = aanbevolen.filter((r) => r.status === "open" && r.openbaar !== "nee").slice(0, 15);

  const md = [
    "# Voortgang",
    "",
    "> **In het kort:** wat er al in de Omnibus-database zit, wie waaraan werkt, en welke bronnen nog open staan. Deze pagina werkt zichzelf bij.",
    "",
    "## Zo staat het ervoor",
    "",
    "| | In database | In bewerking | Ingeleverd | Open |",
    "| --- | ---: | ---: | ---: | ---: |",
    `| **Aanbevolen rapporten** (ADR, advies) | ${count(aanbevolen, "in database")} | ${count(aanbevolen, "in bewerking")} | ${count(aanbevolen, "ingeleverd")} | ${count(aanbevolen, "open")} |`,
    `| **Alle rapporten op de Rijksmap** | ${count(rows, "in database")} | ${count(rows, "in bewerking")} | ${count(rows, "ingeleverd")} | ${count(rows, "open")} |`,
    `| **Wetten en kaders** | ${count(allKaders, "in database")} | ${count(allKaders, "in bewerking")} | ${count(allKaders, "ingeleverd")} | ${count(allKaders, "open")} |`,
    `| **Onderzoeksmodellen** | ${verwerkt.modellen} | | | |`,
    "",
    `Database van ${verwerkt.database}.`,
    "",
    "## Nu in bewerking",
    "",
    busy.length
      ? ["| Bron | Door | Sinds | Status |", "| --- | --- | --- | --- |", ...busy.map((c) => `| [${esc(short(nameOf(c)))}](${linkOf(c)}) | @${c.user} | ${c.since} | [${statusLabel[c.status]}](${c.url}) |`)].join("\n")
      : "Nog niemand. Wees de eerste: kies hieronder een bron.",
    "",
    "## Waar kun je mee beginnen",
    "",
    "Deze rapporten van de Auditdienst Rijk zijn **aanbevolen**: het zijn adviesrapporten met veel bruikbare normen en toetspunten. Klik op **Claimen** om er een op je naam te zetten.",
    "",
    "| Rapport | Datum | Ministerie | |",
    "| --- | --- | --- | --- |",
    ...suggestions.map((r) => `| [${esc(short(r.titel))}](${r.rijksmap}) | ${r.datum} | ${esc(r.ministerie)} | [Claimen](${r.claimen}) |`),
    "",
    "Meer kiezen:",
    "",
    `- [Alle ${aanbevolen.length} aanbevolen rapporten](werklijst-aanbevolen.csv): doorzoekbaar, met een claimlink per rapport.`,
    `- [Alle ${rows.length.toLocaleString("nl-NL")} rapporten van de Rijksmap](werklijst-rapporten.csv): als download, opent in Excel.`,
    "- [Wetten en kaders](werklijst-wetten-en-kaders.md): per bron of je hem openbaar mag verwerken.",
    "",
    "## Al in de database",
    "",
    "<details><summary><b>" + inDb.length + " rapporten</b></summary>",
    "",
    "| Rapport | Datum | Ministerie |",
    "| --- | --- | --- |",
    ...inDb.map((r) => `| [${esc(short(r.titel))}](${r.rijksmap}) | ${r.datum} | ${esc(r.ministerie)} |`),
    "",
    "</details>",
    "",
    "<details><summary><b>" + count(allKaders, "in database") + " wetten en kaders</b></summary>",
    "",
    ...allKaders.filter((k) => k.status === "in database").map((k) => `- ${k.titel}`),
    "",
    "</details>",
    "",
    "## Zo werkt claimen",
    "",
    "```mermaid",
    "flowchart LR",
    "  A[\"⬜ Open\"] -->|Claimen| B[\"🔄 In bewerking<br/>op jouw naam\"]",
    "  B -->|/inleveren| C[\"📦 Ingeleverd\"]",
    "  C -->|Controle en nieuwe database| D[\"✅ In database\"]",
    "  B -->|/vrijgeven| A",
    "```",
    "",
    "1. **Claimen (check-out):** klik op *Claimen* bij een bron. Er opent een kort formulier; na verzenden staat de bron op jouw naam.",
    "2. **Verwerken:** volg [een bron verwerken](bron-verwerken.md).",
    "3. **Inleveren (check-in):** schrijf `/inleveren` in een reactie op je claim.",
    "4. **Controle:** de beheerder controleert het pakket. In de volgende databaserelease staat de bron op ✅.",
    "",
    "Lukt het niet? Schrijf `/vrijgeven`, dan komt de bron weer vrij. Vragen stel je in [Discussions](" + `${repoUrl}/discussions` + ").",
    "",
    "*Automatisch bijgewerkt. De gegevens staan in `.github/voortgang/`; het script in `.github/scripts/voortgang.mjs`.*",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "voortgang.md"), md);
  return { rapporten: rows.length, inDatabase: inDb.length, bezig: busy.length };
}

const claims = await loadClaims();
if (token) {
  await ensureLabels();
  await handleEvent(claims);
}
const refreshed = token ? await loadClaims() : claims;
console.log(JSON.stringify(build(refreshed)));
