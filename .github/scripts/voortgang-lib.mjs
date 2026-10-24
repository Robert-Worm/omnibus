// De logica achter de voortgang: claims herkennen en bijhouden, dubbele rapporten
// opsporen en de voortgangspagina's maken. Zonder bestands- of netwerktoegang, zodat
// alles te testen is (zie voortgang.test.mjs). voortgang.mjs koppelt dit aan GitHub.

export const VOET = "[↑ Meedoen](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)";
const DAG = 24 * 60 * 60 * 1000;
// Lange woorden (zoals "Cyberweerbaarheidsverordening") maken een tabel op een telefoon te breed.
// Een zacht afbreekstreepje is onzichtbaar, behalve als het woord echt moet afbreken.
export const afbreekbaar = (tekst) => String(tekst)
  .replace(/\//g, "/\u200b")
  .replace(/[^\s/\u200b]{19,}/g, (woord) => woord.match(/.{1,12}/gu).join("\u00ad"));
export const MAX_CLAIMS = 5;
export const KORTE_PAGINA = 60; // gelijk aan scripts/check-docs.mjs
const CLAIM_TEMPLATE = "bron-claimen.yml";
const COMMAND = /^\s*\/(inleveren|vrijgeven)\b/im;
const mark = (key) => `<!-- omnibus:${key} -->`;

// ---------- CSV ----------
export function readCsv(text) {
  text = text.replace(/^﻿/, "");
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
export const csvText = (rows, cols) => "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";

// ---------- dubbele rapporten ----------
const STOP = new Set("de het een van en in op voor naar met bij te ter over om aan door als of is tot uit".split(" "));
const REACTIE = ["managementreactie", "beleidsreactie", "kabinetsreactie"];
export function titelWoorden(titel) {
  const t = titel.toLowerCase().replace(/\b(adr[- ]?rapport|adr|rapport|eindrapport|rapportage)\b/g, " ");
  return new Set((t.match(/[a-z0-9à-ÿ]+/g) || []).filter((w) => !STOP.has(w)));
}

/**
 * Zoekt rapporten die vermoedelijk hetzelfde zijn: zelfde ministerie, dezelfde
 * titelwoorden en binnen 92 dagen gepubliceerd. Geeft een Map id → id van het
 * rapport dat claimbaar blijft (het oudste, of het rapport dat al in de database zit).
 */
export function zoekDubbelingen(rapporten, { beoordeeld = [], inDatabase = () => false } = {}) {
  const verschillend = beoordeeld.filter((b) => b.oordeel === "verschillend").map((b) => new Set(b.ids));
  const zelfde = (a, b) => !verschillend.some((s) => s.has(a.id) && s.has(b.id));
  const groepen = new Map();
  for (const r of rapporten) {
    const w = titelWoorden(r.titel);
    if (w.size < 3 || REACTIE.some((x) => w.has(x))) continue;
    const key = `${r.ministerie}|${[...w].sort().join(" ")}`;
    (groepen.get(key) || groepen.set(key, []).get(key)).push(r);
  }
  const clusters = [];
  for (const lijst of groepen.values()) {
    if (lijst.length < 2) continue;
    lijst.sort((a, b) => a.datum.localeCompare(b.datum) || a.id.localeCompare(b.id));
    let cluster = [lijst[0]];
    for (const r of lijst.slice(1)) {
      const vorige = cluster.at(-1);
      if ((Date.parse(r.datum) - Date.parse(vorige.datum)) / DAG <= 92 && cluster.every((c) => zelfde(c, r))) cluster.push(r);
      else { if (cluster.length > 1) clusters.push(cluster); cluster = [r]; }
    }
    if (cluster.length > 1) clusters.push(cluster);
  }
  // Handmatig bevestigde dubbelingen, ook als de titels net te veel verschillen.
  const byId = new Map(rapporten.map((r) => [r.id, r]));
  for (const b of beoordeeld.filter((x) => x.oordeel === "dubbel")) {
    const leden = b.ids.map((id) => byId.get(id)).filter(Boolean);
    if (leden.length > 1 && !clusters.some((c) => leden.every((l) => c.includes(l)))) {
      clusters.push(leden.sort((a, b) => a.datum.localeCompare(b.datum) || a.id.localeCompare(b.id)));
    }
  }
  const dubbelVan = new Map();
  for (const c of clusters) {
    const houder = c.find((r) => inDatabase(r.id)) || c[0];
    for (const r of c) if (r !== houder && !inDatabase(r.id)) dubbelVan.set(r.id, houder.id);
  }
  return dubbelVan;
}

// ---------- tellingen in andere pagina's ----------
/** Vervangt <!--n:sleutel-->waarde<!--/n--> en het blok <!--badge:database-->…<!--/badge-->. */
export function werkTellingenBij(tekst, t, repoUrl) {
  let uit = tekst.replace(/<!--n:([a-zA-Z]+)-->[^<]*<!--\/n-->/g, (heel, key) => (key in t ? `<!--n:${key}-->${t[key]}<!--/n-->` : heel));
  uit = uit.replace(/(<!--badge:database-->\n)[\s\S]*?(\n\s*<!--\/badge-->)/, (_, a, b) =>
    `${a}  <a href="${repoUrl}/releases/latest"><img alt="Database: ${t.rapporten} rapporten" src="https://img.shields.io/badge/database-${t.rapporten}%20rapporten-01689b?style=flat-square&labelColor=15233b"></a>${b}`);
  return uit;
}

// ---------- de voortgang ----------
export function maakVoortgang({ data, repo = "Robert-Worm/omnibus", gh, now = () => Date.now(), download = null }) {
  const { rapporten, verwerkt, kaders, modellen, dubbelingen = { beoordeeld: [] } } = data;
  const repoUrl = `https://github.com/${repo}`;
  const docs = (pad) => `${repoUrl}/blob/main/docs/bijdragen/${pad}`;
  const isAanbevolen = (model) => modellen.aanbevolen.some((m) => m.herken.some((h) => model.toLowerCase().includes(h)));
  const rapportById = new Map(rapporten.map((r) => [r.id, r]));
  const kaderById = new Map(kaders.groepen.flatMap((g) => g.bronnen.map((b) => [b.id.toUpperCase(), { ...b, groep: g }])));
  const inDatabaseKaders = new Set(verwerkt.wettenEnKaders);
  const dubbelVan = zoekDubbelingen(rapporten, { beoordeeld: dubbelingen.beoordeeld, inDatabase: (id) => Boolean(verwerkt.rapporten[id]) });
  const rijksmapUrl = (id) => `https://www.rijksmap.nl/rapport/${id}/`;

  // Wanneer een claim is ingeleverd (datum van de eerste /inleveren), per issuenummer.
  const ingeleverdOp = new Map();
  const beheer = (c) => ["OWNER", "MEMBER", "COLLABORATOR"].includes(c.author_association);
  const eigenaar = repo.split("/")[0];

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
    { name: "release", color: "0e8a16", description: "Checklist voor een nieuwe databaserelease" },
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
    const claims = [];
    for (let page = 1; ; page++) {
      const batch = await gh(`/issues?labels=claim&state=all&per_page=100&page=${page}`);
      for (const issue of batch) {
        if (issue.pull_request) continue;
        const found = identify(issue);
        const labels = issue.labels.map((l) => l.name);
        claims.push({
          number: issue.number, url: issue.html_url, user: issue.user.login, open: issue.state === "open",
          created: issue.created_at, since: issue.created_at.slice(0, 10), closed: issue.closed_at || null, labels,
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

  // Elke run loopt alle open claims na (niet alleen de claim van het event), zodat een
  // gemiste of geannuleerde run vanzelf wordt ingehaald. Verborgen markeringen in de
  // reacties van de bot zorgen dat elke reactie maar één keer wordt geplaatst.
  async function reconcile(claims) {
    const keyOf = (c) => `${c.bron.soort}:${c.bron.id}`;
    const actiefOp = (soort, id) => claims.find((c) => c.open && c.bron && !c.labels.includes("dubbel") && c.bron.soort === soort && c.bron.id === id);
    for (const claim of claims.filter((c) => c.open)) {
      const n = claim.number;
      const comments = await gh(`/issues/${n}/comments?per_page=100`);
      const bot = comments.filter((c) => c.user.type === "Bot").map((c) => c.body).join("\n");
      const legacy = { welkom: "Deze bron staat nu op jouw naam", afgewezen: "Deze bron is al geclaimd door" };
      const heeft = (key) => bot.includes(mark(key)) || Boolean(legacy[key] && bot.includes(legacy[key]));
      const once = async (key, body) => {
        if (heeft(key)) return;
        await comment(n, `${mark(key)}\n${typeof body === "function" ? await body() : body}`);
      };
      const label = async (name, on) => {
        const has = claim.labels.includes(name);
        if (on && !has) { await addLabels(n, [name]); claim.labels.push(name); }
        if (!on && has) { await gh(`/issues/${n}/labels/${encodeURIComponent(name)}`, { method: "DELETE" }); claim.labels = claim.labels.filter((l) => l !== name); }
      };

      // 1. Welke bron?
      if (!claim.bron) {
        await once("onbekend", claim.onbekendRapport
          ? `Het rapport \`${claim.onbekendRapport}\` staat (nog) niet in de werklijst. Kies een rapport uit de [werklijst](${docs("voortgang.md")}), of stel het voor in [Discussions](${repoUrl}/discussions).`
          : `Ik kon niet vinden welke bron je bedoelt. Zet de link naar het rapport op de Rijksmap (\`https://www.rijksmap.nl/rapport/...\`) of de code uit de [werklijst wetten en kaders](${docs("werklijst-wetten-en-kaders.md")}) in je claim. Pas daarvoor je eerste bericht aan; de rest gaat dan vanzelf.`);
        continue;
      }

      // 2. Al geclaimd, al verwerkt, dubbel of niet openbaar?
      const eerder = claims.find((c) => c.open && c.number < n && c.bron && !c.labels.includes("dubbel") && keyOf(c) === keyOf(claim));
      const klaar = claim.bron.soort === "rapport" ? verwerkt.rapporten[claim.bron.id] : inDatabaseKaders.has(claim.bron.id);
      const rapport = claim.bron.soort === "rapport" ? rapportById.get(claim.bron.id) : null;
      const kader = claim.bron.soort === "kader" ? kaderById.get(claim.bron.id) : null;
      const origineel = rapport && dubbelVan.get(rapport.id);
      const origineelBezet = origineel && (verwerkt.rapporten[origineel] || actiefOp("rapport", origineel));
      if (eerder || klaar || origineelBezet || rapport?.openbaar === "nee") {
        await label("dubbel", Boolean(eerder || klaar || origineelBezet));
        const o = origineel && rapportById.get(origineel);
        await once("afgewezen", eerder
          ? `Deze bron is al geclaimd door @${eerder.user} in #${eerder.number}. Kies een andere bron uit de [werklijst](${docs("voortgang.md")}), of overleg in #${eerder.number}.`
          : klaar ? `Deze bron zit al in de database. Kies een andere bron uit de [werklijst](${docs("voortgang.md")}).`
          : origineelBezet ? `Dit rapport lijkt hetzelfde als [${o.titel}](${rijksmapUrl(o.id)}), dat al ${verwerkt.rapporten[origineel] ? "in de database zit" : "geclaimd is"}. Kies een andere bron uit de [werklijst](${docs("voortgang.md")}). Denk je dat het toch een ander rapport is? Zeg het hier, dan kijkt de beheerder ernaar.`
          : `Dit rapport is niet openbaar en kan daarom niet in de openbare database. Kies een ander rapport uit de [werklijst](${docs("voortgang.md")}).`);
        await closeIssue(n, "not_planned"); claim.open = false;
        continue;
      }
      if (kader?.groep.id === "licentie") {
        await label("toestemming-nodig", true);
        await once("toestemming", `Voor **${kader.titel}** is toestemming van de uitgever nodig, of een uitwerking in eigen woorden zonder de oorspronkelijke tekst. Wacht met verwerken tot de beheerder hier heeft gereageerd.`);
        continue;
      }
      if (origineel) {
        const o = rapportById.get(origineel);
        await once("mogelijk-dubbel", `Let op: dit rapport lijkt hetzelfde als [${o.titel}](${rijksmapUrl(o.id)}) (${o.datum}). Verwerk bij voorkeur dat rapport en noem het in je toelichting. De beheerder kijkt mee.`);
      }

      // Hooguit MAX_CLAIMS bronnen tegelijk in bewerking per persoon.
      const andere = claims.filter((c) => c.open && c.user === claim.user && c.number < n && c.status === "in bewerking" && c.bron && !c.labels.includes("dubbel"));
      if (andere.length >= MAX_CLAIMS && !heeft("welkom")) {
        await once("te-veel", `Je werkt al aan ${andere.length} bronnen (#${andere.map((c) => c.number).join(", #")}). Je kunt er [hooguit ${MAX_CLAIMS} tegelijk](${docs("README.md#afspraken")}) op je naam hebben. Lever er eerst een in, of geef er een vrij met \`/vrijgeven\`, en claim deze bron daarna opnieuw.`);
        await closeIssue(n, "not_planned"); claim.open = false;
        continue;
      }

      // 3. Herinneren en verlopen (alleen claims die nog in bewerking zijn)
      if (claim.status === "in bewerking") {
        const eigen = comments.filter((c) => c.user.login === claim.user).map((c) => Date.parse(c.created_at));
        const stil = (now() - Math.max(Date.parse(claim.created), ...eigen)) / DAG;
        const herinnering = comments.find((c) => c.user.type === "Bot" && c.body.includes(mark("herinnering")));
        if (stil >= 30 && !herinnering) {
          await once("herinnering", `@${claim.user}, hoe gaat het met deze bron? Er is al 30 dagen niets gebeurd. Laat even weten of je verdergaat. Zonder reactie komt de bron over 30 dagen automatisch weer vrij.`);
        } else if (herinnering && stil >= 60 && (now() - Date.parse(herinnering.created_at)) / DAG >= 14) {
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

      // 6. Opdrachten in reacties: /inleveren en /vrijgeven
      for (const c of comments) {
        if (c.user.type === "Bot") continue;
        const mag = c.user.login === claim.user || ["OWNER", "MEMBER", "COLLABORATOR"].includes(c.author_association);
        const cmd = (c.body || "").match(COMMAND)?.[1]?.toLowerCase();
        if (!cmd && /^\s*\/\w+/m.test(c.body || "") && c.user.login === claim.user) {
          await once(`hulp-${c.id}`, "Die opdracht ken ik niet. Gebruik `/inleveren` als je klaar bent, of `/vrijgeven` als je stopt.");
        }
        if (!cmd || !mag) continue;
        if (cmd === "inleveren" && !ingeleverdOp.has(n)) ingeleverdOp.set(n, c.created_at);
        if (cmd === "inleveren" && !claim.labels.includes("ingeleverd")) {
          await addLabels(n, ["ingeleverd"]); claim.labels.push("ingeleverd"); claim.status = "ingeleverd";
          await once(`inleveren-${c.id}`, "📦 Ingeleverd. De beheerder controleert het pakket en laat hier weten hoe het verdergaat. Zodra de bron in een nieuwe databaserelease zit, wordt deze claim gesloten.");
        }
        if (cmd === "inleveren" && download) await once(`pakket-${c.id}`, () => pakketBericht(c.body));
        if (cmd === "vrijgeven") {
          await once(`vrijgeven-${c.id}`, "De bron is vrijgegeven en staat weer open in de werklijst. Bedankt voor het laten weten.");
          await closeIssue(n, "not_planned"); claim.open = false; break;
        }
      }

      // 7. Wacht een ingeleverde claim al zeven dagen op de beheerder? Eén herinnering.
      const sinds = ingeleverdOp.get(n);
      if (claim.open && claim.labels.includes("ingeleverd") && sinds && claim.user !== eigenaar) {
        const gereageerd = comments.some((c) => c.user.type !== "Bot" && c.user.login !== claim.user && beheer(c) && c.created_at > sinds);
        if (!gereageerd && (now() - Date.parse(sinds)) / DAG >= 7) {
          await once("wacht-op-beheerder", `@${eigenaar}, dit pakket wacht al 7 dagen op een controle. Wil je ernaar kijken, of hier laten weten wanneer dat lukt? Zie [pakket controleren](${repoUrl}/blob/main/docs/beheer/pakket-controleren.md).`);
        }
      }
    }
  }

  async function pakketBericht(tekst) {
    const { github, extern } = zipLinks(tekst);
    const kop = "**Automatische eerste controle van je pakket**";
    const slot = "Dit is alleen een eerste blik op de bestandsnamen; de beheerder controleert het pakket nog volledig.";
    if (!github.length) {
      return extern.length
        ? `${kop}\n\nJe pakket staat op een externe plek. Dat controleer ik niet automatisch; de beheerder kijkt ernaar.`
        : `${kop}\n\n⚠️ Ik zie geen zip bij je reactie. Sleep de zip in een nieuwe reactie, met \`/inleveren\` op een eigen regel. Is hij groter dan 25 MB? Zet hem dan online en deel de link.`;
    }
    const url = github[0];
    const naam = decodeURIComponent(url.split("/").pop());
    try {
      const buf = await download(url, PAKKET_GRENZEN.maxBytes);
      const { ok, regels } = beoordeelPakket(zipInhoud(buf), buf.length);
      return [`${kop} (\`${naam}\`)`, "", ...regels.map((r) => `- ${r}`), "",
        ok ? slot : `${slot} Pas het pakket aan en lever opnieuw in: zet de nieuwe zip in een reactie, met \`/inleveren\` op een eigen regel.`].join("\n");
    } catch (fout) {
      return `${kop} (\`${naam}\`)\n\n⚠️ Ik kon de zip niet lezen (${String(fout.message).slice(0, 80)}). Controleer of het een gewone zip is, of wacht op de beheerder.`;
    }
  }

  // ---------- pagina's ----------
  const claimLink = (titel, bron) =>
    `${repoUrl}/issues/new?template=${CLAIM_TEMPLATE}&title=${encodeURIComponent("Claim: " + titel.slice(0, 120)).replace(/[()]/g, (c) => (c === "(" ? "%28" : "%29"))}&bron=${encodeURIComponent(bron)}`;
  // Afkorten op een woordgrens, met … erachter.
  const short = (s, n = 90) => {
    if (s.length <= n) return s;
    const kort = s.slice(0, n - 1), spatie = kort.lastIndexOf(" ");
    return (spatie > n / 2 ? kort.slice(0, spatie) : kort).replace(/[\s,;:.–-]+$/, "") + "…";
  };
  // Anker zoals GitHub het van een kop maakt (zelfde regels als scripts/check-docs.mjs).
  // In smalle tabelkolommen mogen een statuslabel en een datum niet over twee regels breken.
const heel = (tekst) => tekst.replace(" ", "\u00a0"); // icoon en eerste woord blijven bij elkaar; de rest mag afbreken
const datumCel = (datum) => String(datum).replace(/-/g, "\u2011");
const anker = (kop) => [...kop.trim().toLowerCase()].filter((c) => /[\p{L}\p{N}\- ]/u.test(c)).join("").replace(/ /g, "-");
  // Claimlink met een titel die de bron noemt, zodat elke link herkenbaar is (ook voor een schermlezer).
  const claimActie = (titel, url) => `[Claimen](${url} "Claimen: ${String(titel).replace(/"/g, "”")}")`;
  const AUTOMATISCH = "*Automatisch bijgewerkt door het voortgangsscript. Pas deze pagina niet met de hand aan; de gegevens staan in `.github/voortgang/`.*";
  const esc = (s) => String(s).replace(/\|/g, "/");
  const nl = (n) => n.toLocaleString("nl-NL");

  function build(claims) {
    const active = new Map();
    for (const c of claims) if (c.open && c.bron && !c.labels.includes("dubbel")) {
      const key = `${c.bron.soort}:${c.bron.id}`;
      if (!active.has(key)) active.set(key, c);
    }
    // Status zonder claims: verandert alleen bij een nieuwe database of werklijst.
    const vasteStatus = (r) =>
      verwerkt.rapporten[r.id] ? "in database" : r.openbaar === "nee" ? "niet openbaar" : dubbelVan.has(r.id) ? "mogelijk dubbel" : "open";
    const statusOf = (soort, id) => {
      if (soort === "rapport" ? verwerkt.rapporten[id] : inDatabaseKaders.has(id)) return { status: "in database" };
      const c = active.get(`${soort}:${id}`);
      return c ? { status: c.status, door: c.user, model: c.model, issue: c.url, sinds: c.since } : { status: "open" };
    };

    // Rapporten
    const rows = rapporten.map((r) => {
      const vast = vasteStatus(r);
      const s = vast === "open" ? statusOf("rapport", r.id) : { status: vast };
      const origineel = dubbelVan.get(r.id);
      return {
        ...r, ...s, vast, omnibus: verwerkt.rapporten[r.id] || "", rijksmap: rijksmapUrl(r.id),
        dubbel_van: origineel ? rijksmapUrl(origineel) : "", origineel,
        claimen: vast === "open" ? claimLink(r.titel, rijksmapUrl(r.id)) : "",
      };
    });
    const bestanden = {};
    // De CSV hangt niet af van claims, zodat hij niet bij elke claim opnieuw in Git komt.
    const csvRows = rows.map((r) => ({ ...r, status: r.vast }));
    bestanden["docs/bijdragen/werklijst-rapporten.csv"] = csvText(csvRows,
      ["status", "titel", "datum", "ministerie", "onderdeel", "bron", "aanbevolen", "rijksmap", "claimen", "dubbel_van", "omnibus", "id"]);

    const count = (list, st) => list.filter((r) => r.status === st).length;
    const nietBeschikbaar = (list) => count(list, "niet openbaar") + count(list, "mogelijk dubbel") + count(list, "toestemming nodig");
    const aanbevolen = rows.filter((r) => r.aanbevolen === "ja");

    // Wetten en kaders
    const kaderRows = kaders.groepen.map((g) => ({ g, items: g.bronnen.map((b) => {
      const st = statusOf("kader", b.id.toUpperCase());
      return { ...b, ...(st.status === "open" && g.id === "licentie" ? { status: "toestemming nodig" } : st) };
    }) }));
    const allKaders = kaderRows.flatMap((k) => k.items);

    const statusLabel = Object.fromEntries(Object.entries({ "in database": "✅ In database", "in bewerking": "🔄 In bewerking", ingeleverd: "📦 Ingeleverd", open: "⬜ Open", "toestemming nodig": "🔒 Toestemming nodig", "niet openbaar": "🔒 Niet openbaar", "mogelijk dubbel": "🔁 Mogelijk dubbel" }).map(([k, v]) => [k, heel(v)]));
    const legenda = (extra = []) => [
      "**Legenda**",
      "",
      "- ✅ In database: zit in de huidige database",
      "- 🔄 In bewerking: iemand heeft de bron geclaimd",
      "- 📦 Ingeleverd: wacht op controle door de beheerder",
      "- ⬜ Open: je kunt hem claimen",
      "- 🔒 Niet beschikbaar: niet openbaar, of eerst toestemming van de uitgever nodig",
      "- 🔁 Mogelijk dubbel: lijkt hetzelfde als een ander rapport",
      ...extra.map((e) => `- ${e}`),
    ].join("\n");
    // Actie bij een bron: claimen, de lopende claim, overleg of niets.
    const actie = (b, titel, url) =>
      b.status === "open" ? claimActie(titel, url)
        : b.issue ? `[Claim van @${b.door}](${b.issue})`
        : b.status === "toestemming nodig" ? `[Overleg](${repoUrl}/discussions)`
        : b.status === "mogelijk dubbel" && b.dubbel_van ? `[Ander rapport](${b.dubbel_van} "Ander rapport dan: ${String(titel).replace(/"/g, "”")}")`
        : "–";
    bestanden["docs/bijdragen/werklijst-wetten-en-kaders.md"] = [
      "# Werklijst wetten en kaders",
      "",
      "<!-- paginatype: data -->",
      "",
      "> **In het kort:** welke wetten, regels en normenkaders in Omnibus kunnen, wat er al in zit, en welke je kunt claimen.",
      "",
      AUTOMATISCH,
      "",
      "## Wat staat hier",
      "",
      "Per groep zie je de bronnen, of ze al in de database zitten, en of iemand eraan werkt. Onder *Rechten* staat per groep waarom je de bron openbaar mag verwerken, of dat je toestemming van de uitgever nodig hebt.",
      "",
      "Mis je een bron? Stel hem voor in [Discussions](" + `${repoUrl}/discussions` + ").",
      "",
      legenda(),
      "",
      ...kaderRows.flatMap(({ g, items }) => [
        `## ${g.titel}`,
        "",
        `**Rechten:** ${g.rechten}`,
        "",
        "| Bron | Status | Actie |",
        "| --- | --- | --- |",
        ...items.map((b) => `| [${afbreekbaar(esc(b.titel))}](${b.link})<br>\`${b.id}\` | ${statusLabel[b.status]} | ${actie(b, b.titel, claimLink(b.titel, b.id))} |`),
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
      "---",
      "",
      VOET,
      "",
    ].join("\n");

    // Tempo en bijdragers: claims die zijn ingeleverd of verwerkt.
    const bijdragen = claims.filter((c) => c.bron && (c.labels.includes("verwerkt") || c.labels.includes("ingeleverd")));
    const perMaand = new Map();
    for (const c of bijdragen) {
      const maand = (c.labels.includes("verwerkt") && c.closed ? c.closed : c.created).slice(0, 7);
      const m = perMaand.get(maand) || perMaand.set(maand, { verwerkt: 0, ingeleverd: 0 }).get(maand);
      m[c.labels.includes("verwerkt") ? "verwerkt" : "ingeleverd"]++;
    }
    const bijdragers = new Map();
    for (const c of bijdragen) bijdragers.set(c.user, (bijdragers.get(c.user) || 0) + 1);
    const maandNaam = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
    const tempo = bijdragen.length
      ? [
          "| Maand | Verwerkt | Ingeleverd |",
          "| --- | ---: | ---: |",
          ...[...perMaand.keys()].sort().reverse().slice(0, 12).map((m) => {
            const v = perMaand.get(m);
            return `| ${maandNaam(m)} | ${v.verwerkt} | ${v.ingeleverd} |`;
          }),
          "",
          `**Bijdragers:** ${[...bijdragers].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([u, n]) => `@${u} (${n})`).join(" · ")}`,
        ].join("\n")
      : "Nog geen bijdragen via claims. De bronnen die nu in de database zitten, zijn door de beheerder verwerkt. Jouw bijdrage kan de eerste zijn.";

    // Voortgang
    const busy = [...active.values()].sort((a, b) => a.since.localeCompare(b.since));
    const wachtend = busy.filter((c) => c.status === "ingeleverd").map((c) => {
      const ingeleverd = ingeleverdOp.get(c.number) || c.created;
      return { ...c, ingeleverd, dagen: Math.max(0, Math.floor((now() - Date.parse(ingeleverd)) / DAG)) };
    }).sort((a, b) => a.ingeleverd.localeCompare(b.ingeleverd));
    const nameOf = (c) => c.bron.soort === "rapport" ? rapportById.get(c.bron.id).titel : kaderById.get(c.bron.id).titel;
    const linkOf = (c) => c.bron.soort === "rapport" ? rijksmapUrl(c.bron.id) : kaderById.get(c.bron.id).link;
    const inDb = rows.filter((r) => r.status === "in database").sort((a, b) => b.datum.localeCompare(a.datum));
    const suggestions = aanbevolen.filter((r) => r.status === "open").slice(0, 15);
    const tellingen = {
      rapporten: inDb.length, kaders: count(allKaders, "in database"), modellen: verwerkt.modellen,
      alle: nl(rows.length), aanbevolen: nl(aanbevolen.length), aanbevolenInDatabase: count(aanbevolen, "in database"),
    };

    bestanden["docs/bijdragen/voortgang.md"] = [
      "# Voortgang",
      "",
      "<!-- paginatype: data -->",
      "",
      "> **In het kort:** wat er al in de Omnibus-database zit, wat je kunt claimen en wie waaraan werkt.",
      "",
      AUTOMATISCH,
      "",
      "## Zo staat het ervoor",
      "",
      `Database van ${verwerkt.database}. Daarnaast zitten er ${verwerkt.modellen} onderzoeksmodellen in. In de tabel: *aanbevolen* zijn de aanbevolen rapporten, *alle* zijn alle rapporten van de Rijksmap, en *kaders* zijn de wetten en kaders.`,
      "",
      "| Status | Aanbevolen | Alle | Kaders |",
      "| --- | ---: | ---: | ---: |",
      ...[["✅ In database", "in database"], ["🔄 In bewerking", "in bewerking"], ["📦 Ingeleverd", "ingeleverd"], ["⬜ Open", "open"]]
        .map(([label, st]) => `| ${label} | ${count(aanbevolen, st)} | ${count(rows, st)} | ${count(allKaders, st)} |`),
      `| 🔒 Niet beschikbaar | ${nietBeschikbaar(aanbevolen)} | ${nietBeschikbaar(rows)} | ${nietBeschikbaar(allKaders)} |`,
      "",
      legenda(["⚠️ achter een model: niet op de lijst met [aanbevolen modellen](bron-verwerken.md#welk-ai-model-gebruik-je)", "⏰ wacht langer dan 7 dagen op de beheerder"]),
      "",
      "## Waar kun je mee beginnen",
      "",
      "Deze rapporten van de Auditdienst Rijk zijn **aanbevolen**: het zijn adviesrapporten met veel bruikbare normen en toetspunten. Klik op **Claimen** om er een op je naam te zetten.",
      "",
      "| Bron | Status | Actie |",
      "| --- | --- | --- |",
      ...suggestions.map((r) => `| [${afbreekbaar(esc(short(r.titel)))}](${r.rijksmap})<br>${datumCel(r.datum)} · ${esc(r.ministerie)} | ${statusLabel[r.status]} | ${claimActie(r.titel, r.claimen)} |`),
      "",
      "Meer kiezen:",
      "",
      `- [Alle ${aanbevolen.length} aanbevolen rapporten](werklijst-aanbevolen.md), per ministerie, met een claimlink per rapport.`,
      `- [Alle ${nl(rows.length)} rapporten van de Rijksmap](werklijst-rapporten.csv), als CSV-bestand om te downloaden en te filteren. Dit bestand toont de stand van de database; wie waaraan werkt, staat alleen op deze pagina.`,
      "- [Wetten en kaders](werklijst-wetten-en-kaders.md): per bron of je hem openbaar mag verwerken.",
      "",
      "## Nu in bewerking",
      "",
      busy.length
        ? ["| Bron | Claim | Status |", "| --- | --- | --- |", ...busy.map((c) => `| [${esc(short(nameOf(c)))}](${linkOf(c)}) | [#${c.number}](${c.url}) · @${c.user} · ${esc(c.model || "–")}${c.model && !isAanbevolen(c.model) ? " ⚠️" : ""}<br>sinds ${datumCel(c.since)} | ${statusLabel[c.status]} |`)].join("\n")
        : "Nog niemand. Kies hierboven een bron.",
      "",
      "## Wacht op de beheerder",
      "",
      wachtend.length
        ? ["Deze pakketten zijn ingeleverd en wachten op een controle. Na 7 dagen krijgt de beheerder een herinnering.", "", "| Bron | Door | Wacht |", "| --- | --- | --- |",
            ...wachtend.map((c) => `| [${esc(short(nameOf(c)))}](${c.url}) | @${c.user}<br>ingeleverd ${datumCel(c.ingeleverd.slice(0, 10))} | ${c.dagen} ${c.dagen === 1 ? "dag" : "dagen"}${c.dagen >= 7 ? " ⏰" : ""} |`)].join("\n")
        : "Er wacht nu niets op de beheerder.",
      "",
      "## Al in de database",
      "",
      "<details><summary><b>Rapporten</b> · " + inDb.length + "</summary>",
      "",
      ...inDb.map((r) => `- [${esc(short(r.titel))}](${r.rijksmap}) · ${esc(r.ministerie)} · ${datumCel(r.datum)}`),
      "",
      "</details>",
      "",
      "<details><summary><b>Wetten en kaders</b> · " + count(allKaders, "in database") + "</summary>",
      "",
      ...allKaders.filter((k) => k.status === "in database").map((k) => `- ${k.titel}`),
      "",
      "</details>",
      "",
      "## Tempo en bijdragers",
      "",
      tempo,
      "",
      "## Samengevat",
      "",
      `${count(rows, "in database")} rapporten, ${count(allKaders, "in database")} wetten en kaders en ${verwerkt.modellen} onderzoeksmodellen zitten in de database. ${busy.length === 0 ? "Op dit moment werkt niemand aan een bron." : busy.length === 1 ? "Aan 1 bron wordt gewerkt." : `Aan ${busy.length} bronnen wordt gewerkt.`}`,
      "",
      "## Volgende stap",
      "",
      "Kies een bron en klik op **Claimen**. Hoe claimen, inleveren en vrijgeven werkt, staat in [meedoen](README.md).",
      "",
      "---",
      "",
      VOET,
      "",
    ].join("\n");

    // Aanbevolen rapporten als leesbare pagina, per ministerie
    const perMin = new Map();
    for (const r of aanbevolen) (perMin.get(r.ministerie) || perMin.set(r.ministerie, []).get(r.ministerie)).push(r);
    const ministeries = [...perMin.keys()].sort((a, b) => perMin.get(b).length - perMin.get(a).length || a.localeCompare(b));
    const ministerieKop = (m) => `${m} · ${count(perMin.get(m), "open")} open`;
    bestanden["docs/bijdragen/werklijst-aanbevolen.md"] = [
      "# Werklijst aanbevolen rapporten",
      "",
      "<!-- paginatype: data -->",
      "",
      `> **In het kort:** de ${aanbevolen.length} adviesrapporten van de Auditdienst Rijk op de Rijksmap, per ministerie. Ze leveren veel bruikbare normen en toetspunten op. Klik op **Claimen** om er een op je naam te zetten.`,
      "",
      AUTOMATISCH,
      "",
      `**Stand:** ${count(aanbevolen, "in database")} in de database · ${count(aanbevolen, "in bewerking") + count(aanbevolen, "ingeleverd")} in bewerking of ingeleverd · ${count(aanbevolen, "open")} open.`,
      "",
      legenda(),
      "",
      "## Per ministerie",
      "",
      "Kies een ministerie dat je kent. Een rapport uit je eigen vakgebied verwerk je het snelst en het best.",
      "",
      "| Ministerie | Open | Totaal |",
      "| --- | ---: | ---: |",
      ...ministeries.map((m) => `| [${esc(m)}](#${anker(ministerieKop(m))}) | ${count(perMin.get(m), "open")} | ${perMin.get(m).length} |`),
      "",
      ...ministeries.flatMap((m) => {
        const list = perMin.get(m).sort((a, b) => b.datum.localeCompare(a.datum));
        return [
          `### ${ministerieKop(m)}`,
          "",
          `<details><summary><b>Rapporten</b> · ${count(list, "open")} open van ${list.length}</summary>`,
          "",
          "| Bron | Status | Actie |",
          "| --- | --- | --- |",
          ...list.map((r) => `| [${afbreekbaar(esc(short(r.titel, 100)))}](${r.rijksmap})<br>${datumCel(r.datum)} | ${statusLabel[r.status]} | ${actie(r, r.titel, r.claimen)} |`),
          "",
          "</details>",
          "",
        ];
      }),
      "## Samengevat",
      "",
      "Kies een open rapport bij een ministerie dat je kent. Staat er 🔁 Mogelijk dubbel? Claim dan het andere rapport.",
      "",
      "## Volgende stap",
      "",
      `Na het claimen volg je [een bron verwerken](bron-verwerken.md). Alle ${nl(rows.length)} rapporten staan in [werklijst-rapporten.csv](werklijst-rapporten.csv).`,
      "",
      "---",
      "",
      VOET,
      "",
    ].join("\n");

    // Een korte pagina krijgt geen "Samengevat" (zie de bouwstenen).
    for (const [pad, tekst] of Object.entries(bestanden))
      if (pad.endsWith(".md") && tekst.split("\n").length < KORTE_PAGINA) bestanden[pad] = tekst.replace(/## Samengevat\n\n[^\n]*\n\n/, "");
    return { bestanden, tellingen, stats: { rapporten: rows.length, inDatabase: inDb.length, bezig: busy.length, dubbel: dubbelVan.size } };
  }

  /** Wekelijkse samenvatting: wat er de afgelopen zeven dagen gebeurde. Null als er niets gebeurde. */
  function samenvatting(claims) {
    const tot = now(), van = tot - 7 * DAG;
    const binnen = (iso) => Boolean(iso) && Date.parse(iso) > van && Date.parse(iso) <= tot;
    const naam = (c) => c.bron.soort === "rapport" ? rapportById.get(c.bron.id)?.titel : kaderById.get(c.bron.id)?.titel;
    const geldig = claims.filter((c) => c.bron && !c.labels.includes("dubbel") && naam(c));
    const geclaimd = geldig.filter((c) => binnen(c.created));
    const ingeleverd = geldig.filter((c) => binnen(ingeleverdOp.get(c.number)));
    const verwerktDezeWeek = geldig.filter((c) => c.labels.includes("verwerkt") && binnen(c.closed));
    if (!geclaimd.length && !ingeleverd.length && !verwerktDezeWeek.length) return null;
    const week = new Date(tot).toISOString().slice(0, 10);
    const lijst = (titel, items) => items.length ? [`### ${titel} (${items.length})`, "", ...items.map((c) => `- ${naam(c)} · @${c.user} · #${c.number}`), ""] : [];
    return {
      sleutel: `week-${week}`,
      titel: `Weekoverzicht tot ${new Date(tot).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`,
      tekst: [
        mark(`week-${week}`),
        "Wat er de afgelopen week in Omnibus gebeurde.",
        "",
        ...lijst("✅ Verwerkt in de database", verwerktDezeWeek),
        ...lijst("📦 Ingeleverd", ingeleverd),
        ...lijst("🔄 Nieuw geclaimd", geclaimd),
        `Zelf meedoen? Kies een bron in de [voortgang](${docs("voortgang.md")}).`,
        "",
        "*Automatisch gemaakt door het claimsysteem.*",
      ].join("\n"),
    };
  }

  return { identify, loadClaims, ensureLabels, reconcile, build, samenvatting, dubbelVan, repoUrl };
}

// ---------- ingeleverd pakket controleren ----------
// Leest alleen de inhoudsopgave van een zip (de "central directory"). Er wordt niets
// uitgepakt of uitgevoerd.
export const PAKKET_GRENZEN = { maxBytes: 25 * 1024 * 1024, maxUitgepakt: 250 * 1024 * 1024, maxBestanden: 2000 };

export function zipInhoud(buf) {
  if (buf.length < 22) throw new Error("geen zip-bestand");
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("geen zip-bestand");
  const aantal = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const bestanden = [];
  for (let n = 0; n < aantal; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error("beschadigde zip");
    const gecomprimeerd = buf.readUInt32LE(p + 20), grootte = buf.readUInt32LE(p + 24);
    const naamLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const naam = buf.subarray(p + 46, p + 46 + naamLen).toString("utf8");
    bestanden.push({ naam, grootte, gecomprimeerd });
    p += 46 + naamLen + extraLen + commentLen;
  }
  return bestanden;
}

const SOORTEN = [
  ["De bron", /(\.pdf$|bron|source)/i],
  ["De bouwstenen (normen en toetspunten)", /(norm|bouwsteen|toetspunt|criteri|catalog|points?|controls?|extract)/i],
  ["De beperkingen en twijfels", /(beperking|limitation|hold|open-?punt|twijfel)/i],
  ["Je eigen controle", /(controle|review|check|notitie|toelichting|readme)/i],
];
const UITVOERBAAR = /\.(exe|bat|cmd|com|ps1|sh|msi|dll|scr|vbs|jar|app|dmg)$/i;

/** Beoordeelt de inhoudsopgave van een pakket. Geeft { ok, regels } terug. */
export function beoordeelPakket(bestanden, bytes) {
  const g = PAKKET_GRENZEN;
  const regels = [];
  let ok = true;
  const echt = bestanden.filter((b) => !b.naam.endsWith("/") && !/(^|\/)(__MACOSX|\.DS_Store)/.test(b.naam));
  const uitgepakt = echt.reduce((s, b) => s + b.grootte, 0);
  if (bytes > g.maxBytes) { ok = false; regels.push(`❌ Het pakket is groter dan 25 MB.`); }
  if (!echt.length) { ok = false; regels.push("❌ De zip is leeg."); }
  if (echt.length > g.maxBestanden || uitgepakt > g.maxUitgepakt) { ok = false; regels.push("❌ Uitgepakt is het pakket ongewoon groot. De beheerder kijkt ernaar."); }
  const vreemd = echt.filter((b) => b.naam.startsWith("/") || b.naam.split("/").includes("..") || /^[a-z]:/i.test(b.naam));
  if (vreemd.length) { ok = false; regels.push(`❌ Ongeldige paden in de zip: ${vreemd.slice(0, 3).map((b) => `\`${b.naam}\``).join(", ")}.`); }
  const uitvoer = echt.filter((b) => UITVOERBAAR.test(b.naam));
  if (uitvoer.length) { ok = false; regels.push(`❌ Het pakket bevat programma's of scripts (${uitvoer.slice(0, 3).map((b) => `\`${b.naam}\``).join(", ")}). Haal die eruit.`); }
  if (echt.length) {
    regels.push(`✅ ${echt.length} ${echt.length === 1 ? "bestand" : "bestanden"}, samen ${(uitgepakt / 1024 / 1024).toFixed(1)} MB uitgepakt.`);
    for (const [wat, re] of SOORTEN) {
      regels.push(echt.some((b) => re.test(b.naam)) ? `✅ ${wat}: lijkt aanwezig.` : `⚠️ ${wat}: niet herkend aan de bestandsnamen. Zit het erin? Noem het dan in je toelichting.`);
    }
  }
  return { ok, regels };
}

/** Zoekt bijlagen en links naar een zip in een reactie. */
export function zipLinks(tekst) {
  const alle = [...(tekst || "").matchAll(/https:\/\/[^\s)<>"]+/g)].map((m) => m[0]);
  const github = alle.filter((u) => /^https:\/\/github\.com\/(user-attachments\/files\/\d+\/[^/]+\.zip|[\w.-]+\/[\w.-]+\/files\/\d+\/[^/]+\.zip)$/i.test(u));
  const extern = alle.filter((u) => !github.includes(u) && !/^https:\/\/(github\.com|www\.rijksmap\.nl)\//.test(u));
  return { github, extern };
}
