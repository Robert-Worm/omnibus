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
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
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
const csvCell = (v) => (/[,;"\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
const writeCsv = (file, rows, cols) =>
  writeFileSync(file, "\uFEFF" + [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n");

const rapporten = readCsv(join(dataDir, "rapporten.csv"));
const verwerkt = JSON.parse(readFileSync(join(dataDir, "verwerkt.json"), "utf8"));
const kaders = JSON.parse(readFileSync(join(dataDir, "wetten-en-kaders.json"), "utf8"));
const modellen = JSON.parse(readFileSync(join(dataDir, "modellen.json"), "utf8"));
const isAanbevolen = (model) => modellen.aanbevolen.some((m) => m.herken.some((h) => model.toLowerCase().includes(h)));
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
  { name: "model-controleren", color: "d4a72c", description: "Het gekozen AI-model staat niet op de lijst met aanbevolen modellen" },
  { name: "toestemming-nodig", color: "cf222e", description: "Voor deze bron is toestemming van de uitgever nodig" },
];
async function ensureLabels() {
  const existing = new Set((await gh("/labels?per_page=100")).map((l) => l.name));
  for (const l of LABELS) if (!existing.has(l.name)) await gh("/labels", { method: "POST", body: JSON.stringify(l) });
}

// Lees een veld uit het claimformulier ("### Label" gevolgd door de waarde).
const formField = (body, label) => {
  const v = (body || "").match(new RegExp("###\\s*" + label + "[^\\n]*\\n+([^\\n]+)", "i"))?.[1]?.trim() || "";
  return v === "_No response_" ? "" : v;
};

// Haal uit de tekst van een claim welke bron het is.
function identify(issue) {
  const text = `${issue.title}\n${issue.body || ""}`;
  const m = text.match(/rijksmap\.nl\/rapport\/([a-z0-9-]+)/i);
  if (m) return rapportById.has(m[1].toLowerCase()) ? { soort: "rapport", id: m[1].toLowerCase() } : { onbekendRapport: m[1] };
  const field = formField(issue.body, "Welke bron");
  for (const candidate of [field, issue.title.replace(/^claim:\s*/i, "")]) {
    for (const token of candidate.split(/[^A-Za-z0-9-]+/)) if (token && kaderById.has(token.toUpperCase())) return { soort: "kader", id: token.toUpperCase() };
    const lower = candidate.trim().toLowerCase();
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
      const found = identify(issue);
      const labels = issue.labels.map((l) => l.name);
      claims.push({
        number: issue.number, url: issue.html_url, user: issue.user.login, open: issue.state === "open",
        created: issue.created_at, since: issue.created_at.slice(0, 10), labels,
        bron: found?.soort ? found : null, onbekendRapport: found?.onbekendRapport,
        model: formField(issue.body, "Welk model precies"),
        heeftModelveld: /###\s*Welk model precies/i.test(issue.body || ""),
        status: labels.includes("ingeleverd") ? "ingeleverd" : "in bewerking",
      });
    }
    if (batch.length < 100) break;
  }
  // Oudste claim eerst: bij een dubbele claim wint wie het eerst was.
  return claims.sort((x, y) => x.number - y.number);
}

// ---------- claims bijhouden ----------
// Elke run loopt alle open claims na (niet alleen de claim van het event), zodat een
// gemiste of geannuleerde run vanzelf wordt ingehaald. Verborgen markeringen in de
// reacties van de bot zorgen dat elke reactie maar één keer wordt geplaatst.
const DAG = 24 * 60 * 60 * 1000;
const mark = (key) => `<!-- omnibus:${key} -->`;
const COMMAND = /^\s*\/(inleveren|vrijgeven)\b/im;
const docs = (pad) => `${repoUrl}/blob/main/docs/bijdragen/${pad}`;

async function reconcile(claims) {
  const now = Date.now();
  const keyOf = (c) => `${c.bron.soort}:${c.bron.id}`;
  for (const claim of claims.filter((c) => c.open)) {
    const n = claim.number;
    const comments = await gh(`/issues/${n}/comments?per_page=100`);
    const bot = comments.filter((c) => c.user.type === "Bot").map((c) => c.body).join("\n");
    const legacy = { welkom: "Deze bron staat nu op jouw naam", afgewezen: "Deze bron is al geclaimd door" };
    const once = async (key, body) => {
      if (bot.includes(mark(key)) || (legacy[key] && bot.includes(legacy[key]))) return;
      await comment(n, `${mark(key)}\n${body}`);
    };
    const label = async (name, on) => {
      const has = claim.labels.includes(name);
      if (on && !has) await addLabels(n, [name]);
      if (!on && has) await gh(`/issues/${n}/labels/${encodeURIComponent(name)}`, { method: "DELETE" });
    };

    // 1. Welke bron?
    if (!claim.bron) {
      await once("onbekend", claim.onbekendRapport
        ? `Het rapport \`${claim.onbekendRapport}\` staat (nog) niet in de werklijst. Kies een rapport uit de [werklijst](${docs("voortgang.md")}), of stel het voor in [Discussions](${repoUrl}/discussions).`
        : `Ik kon niet vinden welke bron je bedoelt. Zet de link naar het rapport op de Rijksmap (\`https://www.rijksmap.nl/rapport/...\`) of de code uit de [werklijst wetten en kaders](${docs("werklijst-wetten-en-kaders.md")}) in je claim. Pas daarvoor je eerste bericht aan; de rest gaat dan vanzelf.`);
      continue;
    }

    // 2. Al geclaimd, al verwerkt, of niet openbaar?
    const eerder = claims.find((c) => c.open && c.number < n && c.bron && !c.labels.includes("dubbel") && keyOf(c) === keyOf(claim));
    const klaar = claim.bron.soort === "rapport" ? verwerkt.rapporten[claim.bron.id] : inDatabaseKaders.has(claim.bron.id);
    const rapport = claim.bron.soort === "rapport" ? rapportById.get(claim.bron.id) : null;
    const kader = claim.bron.soort === "kader" ? kaderById.get(claim.bron.id) : null;
    if (eerder || klaar || rapport?.openbaar === "nee") {
      await label("dubbel", Boolean(eerder || klaar));
      await once("afgewezen", eerder
        ? `Deze bron is al geclaimd door @${eerder.user} in #${eerder.number}. Kies een andere bron uit de [werklijst](${docs("voortgang.md")}), of overleg in #${eerder.number}.`
        : klaar ? `Deze bron zit al in de database. Kies een andere bron uit de [werklijst](${docs("voortgang.md")}).`
        : `Dit rapport is niet openbaar en kan daarom niet in de openbare database. Kies een ander rapport uit de [werklijst](${docs("voortgang.md")}).`);
      await closeIssue(n, "not_planned");
      continue;
    }
    if (kader?.groep.id === "licentie") {
      await label("toestemming-nodig", true);
      await once("toestemming", `Voor **${kader.titel}** is toestemming van de uitgever nodig, of een uitwerking in eigen woorden zonder de oorspronkelijke tekst. Wacht met verwerken tot de beheerder hier heeft gereageerd.`);
      continue;
    }

    // 3. Herinneren en verlopen (alleen claims die nog in bewerking zijn)
    if (claim.status === "in bewerking") {
      const eigen = comments.filter((c) => c.user.login === claim.user).map((c) => Date.parse(c.created_at));
      const stil = (now - Math.max(Date.parse(claim.created), ...eigen)) / DAG;
      const herinnering = comments.find((c) => c.user.type === "Bot" && c.body.includes(mark("herinnering")));
      if (stil >= 30 && !herinnering) {
        await once("herinnering", `@${claim.user}, hoe gaat het met deze bron? Er is al 30 dagen niets gebeurd. Laat even weten of je verdergaat. Zonder reactie komt de bron over 30 dagen automatisch weer vrij.`);
      } else if (herinnering && stil >= 60 && (now - Date.parse(herinnering.created_at)) / DAG >= 14) {
        await once("verlopen", "Deze claim is na 60 dagen zonder reactie automatisch vrijgegeven. De bron staat weer open. Je kunt hem altijd opnieuw claimen.");
        await closeIssue(n, "not_planned"); claim.open = false;
      }
    }
    if (!claim.open) continue;

    // 4. Model
    const modelOk = !claim.heeftModelveld || Boolean(claim.model && isAanbevolen(claim.model));
    await label("model-controleren", !modelOk);

    // 5. Welkom
    await once("welkom", [
      `Dank je, @${claim.user}! Deze bron staat nu op jouw naam in de [voortgang](${docs("voortgang.md")}).`,
      ...(modelOk ? [] : ["", `> [!NOTE]`, `> Het model *${claim.model || "(niet ingevuld)"}* staat niet op de lijst met [aanbevolen modellen](${docs("bron-verwerken.md#welk-ai-model-gebruik-je")}). Gebruik als het kan een aanbevolen model en pas dan je claim aan. Anders beoordeelt de beheerder of het resultaat bruikbaar is.`]),
      "",
      `**Zo ga je verder:** volg [een bron verwerken](${docs("bron-verwerken.md")}).`,
      "",
      "- Klaar? Schrijf `/inleveren` in een reactie, met een korte toelichting.",
      "- Lukt het toch niet? Schrijf `/vrijgeven`. Dan komt de bron weer vrij voor iemand anders.",
    ].join("\n"));
    const andere = claims.filter((c) => c.open && c.user === claim.user && c.number < n && c.status === "in bewerking" && c.bron && !c.labels.includes("dubbel"));
    if (andere.length) await once("tweede", `Je werkt ook nog aan #${andere.map((c) => c.number).join(", #")}. Lever die bij voorkeur eerst in: [één bron tegelijk](${docs("README.md#afspraken")}).`);

    // 6. Opdrachten in reacties: /inleveren en /vrijgeven
    let gesloten = false;
    for (const c of comments) {
      if (c.user.type === "Bot") continue;
      const mag = c.user.login === claim.user || ["OWNER", "MEMBER", "COLLABORATOR"].includes(c.author_association);
      const cmd = (c.body || "").match(COMMAND)?.[1]?.toLowerCase();
      if (!cmd && /^\s*\/\w+/m.test(c.body || "") && c.user.login === claim.user) {
        await once(`hulp-${c.id}`, "Die opdracht ken ik niet. Gebruik `/inleveren` als je klaar bent, of `/vrijgeven` als je stopt.");
      }
      if (!cmd || !mag) continue;
      if (cmd === "inleveren" && !claim.labels.includes("ingeleverd")) {
        await addLabels(n, ["ingeleverd"]); claim.labels.push("ingeleverd"); claim.status = "ingeleverd";
        await once(`inleveren-${c.id}`, "📦 Ingeleverd. De beheerder controleert het pakket en laat hier weten hoe het verdergaat. Zodra de bron in een nieuwe databaserelease zit, wordt deze claim gesloten.");
      }
      if (cmd === "vrijgeven") {
        await once(`vrijgeven-${c.id}`, "De bron is vrijgegeven en staat weer open in de werklijst. Bedankt voor het laten weten.");
        await closeIssue(n, "not_planned"); gesloten = true; break;
      }
    }
    if (gesloten) continue;


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
    return c ? { status: c.status, door: c.user, model: c.model, issue: c.url, sinds: c.since } : { status: "open" };
  };

  // Rapporten
  const rows = rapporten.map((r) => {
    let s = statusOf("rapport", r.id);
    if (s.status === "open" && r.openbaar === "nee") s = { status: "niet openbaar" };
    return { ...r, ...s, omnibus: verwerkt.rapporten[r.id] || "", rijksmap: rijksmapUrl(r.id), claimen: s.status === "open" ? claimLink(r.titel, rijksmapUrl(r.id)) : "" };
  });
  const cols = ["status", "door", "model", "titel", "datum", "ministerie", "onderdeel", "bron", "aanbevolen", "rijksmap", "claimen", "sinds", "issue", "omnibus", "id"];
  mkdirSync(outDir, { recursive: true });
  writeCsv(join(outDir, "werklijst-rapporten.csv"), rows, cols);

  const count = (list, st) => list.filter((r) => r.status === st).length;
  const aanbevolen = rows.filter((r) => r.aanbevolen === "ja");

  // Wetten en kaders
  const kaderRows = kaders.groepen.map((g) => ({ g, items: g.bronnen.map((b) => {
    const st = statusOf("kader", b.id.toUpperCase());
    return { ...b, ...(st.status === "open" && g.id === "licentie" ? { status: "toestemming nodig" } : st) };
  }) }));
  const allKaders = kaderRows.flatMap((k) => k.items);

  const statusLabel = { "in database": "✅ in database", "in bewerking": "🔄 in bewerking", ingeleverd: "📦 ingeleverd", open: "⬜ open", "toestemming nodig": "🔒 toestemming nodig", "niet openbaar": "🔒 niet openbaar" };
  const kaderMd = [
    "# Werklijst wetten en kaders",
    "",
    "> **In het kort:** welke wetten, regels en normenkaders in Omnibus kunnen, wat er al in zit, en welke je kunt claimen.",
    "",
    "## Wat staat hier",
    "",
    "Per groep zie je de bronnen, of ze al in de database zitten, en of iemand eraan werkt. Onder *Rechten* staat per groep waarom je de bron openbaar mag verwerken, of dat je toestemming van de uitgever nodig hebt.",
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
      ...items.map((b) => `| [${esc(b.titel)}](${b.link}) | \`${b.id}\` | ${statusLabel[b.status]}${b.door ? ` · @${b.door}` : ""} | ${b.status === "open" ? `[Claimen](${claimLink(b.titel, b.id)})` : b.issue ? `[Bekijk claim](${b.issue})` : b.status === "toestemming nodig" ? `[Overleg](${repoUrl}/discussions)` : ""} |`),
      "",
    ]),
    "## Samengevat",
    "",
    `${count(allKaders, "in database")} wetten en kaders zitten in de database, ${count(allKaders, "open")} kun je claimen, en voor ${count(allKaders, "toestemming nodig")} is eerst toestemming van de uitgever nodig.`,
    "",
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
    "| | ✅ In database | 🔄 In bewerking | 📦 Ingeleverd | ⬜ Open | 🔒 Niet beschikbaar |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    `| **Aanbevolen rapporten** (Auditdienst Rijk, advies) | ${count(aanbevolen, "in database")} | ${count(aanbevolen, "in bewerking")} | ${count(aanbevolen, "ingeleverd")} | ${count(aanbevolen, "open")} | ${count(aanbevolen, "niet openbaar")} |`,
    `| **Alle rapporten op de Rijksmap** | ${count(rows, "in database")} | ${count(rows, "in bewerking")} | ${count(rows, "ingeleverd")} | ${count(rows, "open")} | ${count(rows, "niet openbaar")} |`,
    `| **Wetten en kaders** | ${count(allKaders, "in database")} | ${count(allKaders, "in bewerking")} | ${count(allKaders, "ingeleverd")} | ${count(allKaders, "open")} | ${count(allKaders, "toestemming nodig")} |`,
    `| **Onderzoeksmodellen** | ${verwerkt.modellen} | | | | |`,
    "",
    "🔒 *Niet beschikbaar*: het rapport is niet openbaar, of voor het kader is toestemming van de uitgever nodig.",
    "",
    `Database van ${verwerkt.database}.`,
    "",
    "## Nu in bewerking",
    "",
    busy.length
      ? ["| Bron | Door | Model | Sinds | Status |", "| --- | --- | --- | --- | --- |", ...busy.map((c) => `| [${esc(short(nameOf(c)))}](${linkOf(c)}) | @${c.user} | ${esc(c.model || "–")}${c.model && !isAanbevolen(c.model) ? " ⚠️" : ""} | ${c.since} | [${statusLabel[c.status]}](${c.url}) |`)].join("\n")
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
    `- [Alle ${aanbevolen.length} aanbevolen rapporten](werklijst-aanbevolen.md), per ministerie, met een claimlink per rapport.`,
    `- [Alle ${rows.length.toLocaleString("nl-NL")} rapporten van de Rijksmap](werklijst-rapporten.csv), als CSV-bestand om te downloaden en te filteren.`,
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
    "## Samengevat",
    "",
    `${count(rows, "in database")} rapporten, ${count(allKaders, "in database")} wetten en kaders en ${verwerkt.modellen} onderzoeksmodellen zitten in de database. ${busy.length === 1 ? "Aan 1 bron" : `Aan ${busy.length} bronnen`} wordt gewerkt.`,
    "",
    "## Volgende stap",
    "",
    "Kies een bron en klik op **Claimen**. Hoe claimen, inleveren en vrijgeven werkt, staat in [meedoen](README.md). Een ⚠️ achter een model betekent dat het niet op de lijst met [aanbevolen modellen](bron-verwerken.md#welk-ai-model-gebruik-je) staat.",
    "",
    "*Automatisch bijgewerkt. De gegevens staan in `.github/voortgang/`; het script in `.github/scripts/voortgang.mjs`.*",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "voortgang.md"), md);

  // Aanbevolen rapporten als leesbare pagina, per ministerie
  const perMin = new Map();
  for (const r of aanbevolen) (perMin.get(r.ministerie) || perMin.set(r.ministerie, []).get(r.ministerie)).push(r);
  const ministeries = [...perMin.keys()].sort((a, b) => perMin.get(b).length - perMin.get(a).length);
  const aanbevolenMd = [
    "# Werklijst aanbevolen rapporten",
    "",
    `> **In het kort:** de ${aanbevolen.length} adviesrapporten van de Auditdienst Rijk op de Rijksmap, per ministerie. Ze leveren veel bruikbare normen en toetspunten op. Klik op **Claimen** om er een op je naam te zetten.`,
    "",
    `**Stand:** ${count(aanbevolen, "in database")} in de database · ${count(aanbevolen, "in bewerking") + count(aanbevolen, "ingeleverd")} in bewerking of ingeleverd · ${count(aanbevolen, "open")} open.`,
    "",
    ...ministeries.flatMap((m) => {
      const list = perMin.get(m).sort((a, b) => b.datum.localeCompare(a.datum));
      return [
        `<details><summary><b>${m}</b> · ${count(list, "open")} open van ${list.length}</summary>`,
        "",
        "| Rapport | Datum | Status |",
        "| --- | --- | --- |",
        ...list.map((r) => `| [${esc(short(r.titel, 100))}](${r.rijksmap}) | ${r.datum} | ${r.status === "open" ? `[Claimen](${r.claimen})` : r.issue ? `[${statusLabel[r.status]}](${r.issue})${r.door ? ` @${r.door}` : ""}` : statusLabel[r.status]} |`),
        "",
        "</details>",
        "",
      ];
    }),
    "## Samengevat",
    "",
    "Kies een open rapport bij een ministerie dat je kent. Een rapport in je eigen vakgebied verwerk je het snelst en het best.",
    "",
    "## Volgende stap",
    "",
    "Na het claimen volg je [een bron verwerken](bron-verwerken.md). Alle 9.116 rapporten staan in [werklijst-rapporten.csv](werklijst-rapporten.csv).",
    "",
    "*Automatisch bijgewerkt.*",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "werklijst-aanbevolen.md"), aanbevolenMd);
  return { rapporten: rows.length, inDatabase: inDb.length, bezig: busy.length };
}

const claims = await loadClaims();
if (token) {
  await ensureLabels();
  await reconcile(claims);
}
const refreshed = token ? await loadClaims() : claims;
console.log(JSON.stringify(build(refreshed)));
