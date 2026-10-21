// Tests voor het claimsysteem, met een gesimuleerde GitHub. Draai: npm run test:voortgang
import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32 } from "node:zlib";
import { beoordeelPakket, maakVoortgang, readCsv, werkTellingenBij, zipInhoud, zipLinks, zoekDubbelingen } from "./voortgang-lib.mjs";

const DAG = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-10-01T09:00:00Z");

const rapportenCsv = [
  "id;datum;titel;ministerie;onderdeel;bron;auteur;aanbevolen;openbaar;url",
  ...[1, 2, 3, 4, 5, 6].map((i) => `2025-extra-${i};2025-0${i}-01;Extra onderzoek nummer ${i} naar thema ${"abcdef"[i - 1]};BZK;DGOO;Auditdienst Rijk;Auditdienst Rijk;ja;ja;https://example.org/x${i}`),
  "2026-open-rapport;2026-03-01;Onderzoek naar het inkoopproces bij het ministerie;Financiën;DGRB;Auditdienst Rijk;Auditdienst Rijk;ja;ja;https://example.org/1",
  "2026-in-db;2026-02-01;Onderzoek naar informatiebeveiliging bij de dienst;Financiën;DGRB;Auditdienst Rijk;Auditdienst Rijk;ja;ja;https://example.org/2",
  "2026-geheim;2026-01-01;Vertrouwelijk onderzoek naar de uitvoering;Defensie;CLAS;Auditdienst Rijk;Auditdienst Rijk;ja;nee;https://example.org/3",
  "2026-adr-rapport-convenant;2026-01-13;ADR-rapport Onderzoek naar het convenant ter voorkoming recidive;Justitie en Veiligheid;DGRR;Auditdienst Rijk;Auditdienst Rijk;ja;ja;https://example.org/4",
  "2026-convenant-kopie;2026-02-16;Onderzoek naar het convenant ter voorkoming recidive;Justitie en Veiligheid;DGOPV;Auditdienst Rijk;Auditdienst Rijk;ja;ja;https://example.org/5",
  "2025-monitor-a;2025-01-10;Monitor toegankelijkheid van zorg gevolgen;VWS;NZa;NZa;NZa;;ja;https://example.org/6",
  "2025-monitor-b;2025-02-10;Monitor toegankelijkheid van zorg gevolgen;VWS;NZa;NZa;NZa;;ja;https://example.org/7",
].join("\n");

const data = () => ({
  rapporten: readCsv(rapportenCsv),
  verwerkt: { database: "2026-10-19", rapporten: { "2026-in-db": "R001" }, wettenEnKaders: ["BVA2021"], modellen: 3 },
  kaders: { groepen: [
    { id: "nl-wet", titel: "Wetten", rechten: "Vrij.", bronnen: [{ id: "WOO", titel: "Wet open overheid (Woo)", link: "https://example.org/woo" }, { id: "BVA2021", titel: "Besluit BVA", link: "https://example.org/bva" }] },
    { id: "licentie", titel: "Met auteursrecht", rechten: "Beschermd.", bronnen: [{ id: "ISO27001", titel: "ISO/IEC 27001:2022", link: "https://example.org/iso" }] },
  ] },
  modellen: { aanbevolen: [{ naam: "Claude Opus", herken: ["opus"] }, { naam: "GPT-5", herken: ["gpt-5"] }] },
  dubbelingen: { beoordeeld: [{ ids: ["2025-monitor-a", "2025-monitor-b"], oordeel: "verschillend" }] },
});

/** Een kleine nagebootste GitHub-API voor issues, reacties en labels. */
function nepGitHub() {
  let klok = START;
  const issues = new Map();
  let volgendNummer = 1, volgendeReactie = 1000;
  const labels = new Set(["claim"]);
  const wijzer = (n) => { const i = issues.get(Number(n)); if (!i) throw new Error(`issue ${n} bestaat niet`); return i; };
  const gh = async (pad, { method = "GET", body } = {}) => {
    const b = body ? JSON.parse(body) : {};
    let m;
    if (method === "GET" && pad.startsWith("/issues?")) {
      return pad.includes("page=1") ? [...issues.values()].filter((i) => i.labels.some((l) => l.name === "claim")).map((i) => structuredClone(i)) : [];
    }
    if ((m = /^\/issues\/(\d+)\/comments/.exec(pad))) {
      if (method === "GET") return structuredClone(wijzer(m[1]).comments);
      wijzer(m[1]).comments.push({ id: volgendeReactie++, user: { login: "github-actions[bot]", type: "Bot" }, author_association: "NONE", body: b.body, created_at: new Date(klok).toISOString() });
      return {};
    }
    if ((m = /^\/issues\/(\d+)\/labels\/(.+)$/.exec(pad)) && method === "DELETE") {
      const i = wijzer(m[1]); i.labels = i.labels.filter((l) => l.name !== decodeURIComponent(m[2])); return null;
    }
    if ((m = /^\/issues\/(\d+)\/labels$/.exec(pad))) {
      const i = wijzer(m[1]); for (const name of b.labels) if (!i.labels.some((l) => l.name === name)) i.labels.push({ name }); return {};
    }
    if ((m = /^\/issues\/(\d+)$/.exec(pad)) && method === "PATCH") {
      const i = wijzer(m[1]); i.state = b.state; i.state_reason = b.state_reason; i.closed_at = new Date(klok).toISOString(); return {};
    }
    if (pad.startsWith("/labels")) {
      if (method === "GET") return [...labels].map((name) => ({ name }));
      labels.add(b.name); return {};
    }
    throw new Error(`onverwacht verzoek: ${method} ${pad}`);
  };
  return {
    gh, issues, labels,
    nu: () => klok,
    wacht: (dagen) => { klok += dagen * DAG; },
    claim(user, { bron, model = "Claude Opus 4", titel } = {}) {
      const n = volgendNummer++;
      issues.set(n, {
        number: n, title: titel || `Claim: ${bron}`, state: "open", html_url: `https://github.com/x/y/issues/${n}`,
        user: { login: user }, created_at: new Date(klok).toISOString(), closed_at: null, labels: [{ name: "claim" }], comments: [],
        body: `### Welke bron wil je verwerken?\n\n${bron}\n\n### Welk model precies?\n\n${model}\n`,
      });
      return n;
    },
    reageer(n, user, body, association = "NONE") {
      wijzer(n).comments.push({ id: volgendeReactie++, user: { login: user, type: "User" }, author_association: association, body, created_at: new Date(klok).toISOString() });
    },
    botTekst: (n) => wijzer(n).comments.filter((c) => c.user.type === "Bot").map((c) => c.body).join("\n"),
    labelsVan: (n) => wijzer(n).labels.map((l) => l.name),
  };
}

async function draai(github, download = null) {
  const v = maakVoortgang({ data: data(), repo: "x/y", gh: github.gh, now: github.nu, download });
  await v.ensureLabels();
  await v.reconcile(await v.loadClaims());
  return v;
}
const rapport = (id) => `https://www.rijksmap.nl/rapport/${id}/`;

test("een nieuwe claim krijgt één welkomstbericht", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  await draai(g);
  await draai(g);
  assert.equal(g.botTekst(n).match(/Dank je, @anna/g).length, 1);
  assert.equal(g.issues.get(n).state, "open");
  assert.ok(!g.labelsVan(n).includes("model-controleren"));
  for (const l of ["ingeleverd", "verwerkt", "dubbel", "model-controleren", "toestemming-nodig"]) assert.ok(g.labels.has(l), l);
});

test("een niet-aanbevolen model krijgt een label en een opmerking", async () => {
  const g = nepGitHub();
  const n = g.claim("bram", { bron: rapport("2026-open-rapport"), model: "Klein model mini" });
  await draai(g);
  assert.ok(g.labelsVan(n).includes("model-controleren"));
  assert.match(g.botTekst(n), /Klein model mini\* staat niet op de lijst/);
});

test("een tweede claim op dezelfde bron wordt gesloten als dubbel", async () => {
  const g = nepGitHub();
  const eerste = g.claim("anna", { bron: rapport("2026-open-rapport") });
  const tweede = g.claim("bram", { bron: rapport("2026-open-rapport") });
  await draai(g);
  assert.equal(g.issues.get(eerste).state, "open");
  assert.equal(g.issues.get(tweede).state, "closed");
  assert.equal(g.issues.get(tweede).state_reason, "not_planned");
  assert.ok(g.labelsVan(tweede).includes("dubbel"));
  assert.match(g.botTekst(tweede), new RegExp(`al geclaimd door @anna in #${eerste}`));
});

test("een bron die al in de database zit of niet openbaar is, wordt gesloten", async () => {
  const g = nepGitHub();
  const klaar = g.claim("anna", { bron: rapport("2026-in-db") });
  const geheim = g.claim("bram", { bron: rapport("2026-geheim") });
  await draai(g);
  assert.equal(g.issues.get(klaar).state, "closed");
  assert.match(g.botTekst(klaar), /al in de database/);
  assert.equal(g.issues.get(geheim).state, "closed");
  assert.match(g.botTekst(geheim), /niet openbaar/);
  assert.ok(!g.labelsVan(geheim).includes("dubbel"));
});

test("een beschermd kader vraagt eerst om toestemming en krijgt geen welkom", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: "ISO27001" });
  await draai(g);
  assert.ok(g.labelsVan(n).includes("toestemming-nodig"));
  assert.match(g.botTekst(n), /toestemming van de uitgever nodig/);
  assert.doesNotMatch(g.botTekst(n), /Dank je/);
  assert.equal(g.issues.get(n).state, "open");
});

test("een onbekende bron krijgt uitleg", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: "iets dat niet bestaat", titel: "Claim: iets" });
  await draai(g);
  assert.match(g.botTekst(n), /Ik kon niet vinden welke bron/);
});

test("/inleveren werkt alleen voor de claimer of de beheerder", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  await draai(g);
  g.reageer(n, "vreemde", "/inleveren");
  await draai(g);
  assert.ok(!g.labelsVan(n).includes("ingeleverd"));
  g.reageer(n, "anna", "Klaar!\n/inleveren\nTwijfel bij norm 3.");
  await draai(g);
  await draai(g);
  assert.ok(g.labelsVan(n).includes("ingeleverd"));
  assert.equal(g.botTekst(n).match(/📦 Ingeleverd/g).length, 1);
});

test("/vrijgeven sluit de claim; een onbekende opdracht krijgt hulp", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  await draai(g);
  g.reageer(n, "anna", "/stop");
  await draai(g);
  assert.match(g.botTekst(n), /Die opdracht ken ik niet/);
  g.reageer(n, "anna", "/vrijgeven");
  await draai(g);
  assert.equal(g.issues.get(n).state, "closed");
  assert.match(g.botTekst(n), /vrijgegeven/);
});

test("na 30 stille dagen een herinnering, na 60 dagen verloopt de claim", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  await draai(g);
  g.wacht(29);
  await draai(g);
  assert.doesNotMatch(g.botTekst(n), /hoe gaat het/);
  g.wacht(2);
  await draai(g);
  assert.match(g.botTekst(n), /hoe gaat het met deze bron/);
  g.wacht(28); // dag 59
  await draai(g);
  assert.equal(g.issues.get(n).state, "open");
  g.wacht(1); // dag 60
  await draai(g);
  assert.equal(g.issues.get(n).state, "closed");
  assert.match(g.botTekst(n), /automatisch vrijgegeven/);
});

test("een reactie van de claimer zet de klok voor herinneringen terug", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  await draai(g);
  g.wacht(25);
  g.reageer(n, "anna", "Ik ben bezig.");
  g.wacht(10);
  await draai(g);
  assert.doesNotMatch(g.botTekst(n), /hoe gaat het/);
});

test("dubbele rapporten worden herkend, behalve als ze beoordeeld zijn als verschillend", () => {
  const d = data();
  const dubbel = zoekDubbelingen(d.rapporten, { beoordeeld: d.dubbelingen.beoordeeld });
  assert.equal(dubbel.get("2026-convenant-kopie"), "2026-adr-rapport-convenant");
  assert.ok(!dubbel.has("2026-adr-rapport-convenant"));
  assert.ok(!dubbel.has("2025-monitor-b"));
  const zonderBeoordeling = zoekDubbelingen(d.rapporten);
  assert.equal(zonderBeoordeling.get("2025-monitor-b"), "2025-monitor-a");
});

test("een claim op een dubbel rapport wordt gesloten als het origineel al geclaimd is", async () => {
  const g = nepGitHub();
  const origineel = g.claim("anna", { bron: rapport("2026-adr-rapport-convenant") });
  const kopie = g.claim("bram", { bron: rapport("2026-convenant-kopie") });
  await draai(g);
  assert.equal(g.issues.get(origineel).state, "open");
  assert.equal(g.issues.get(kopie).state, "closed");
  assert.match(g.botTekst(kopie), /lijkt hetzelfde als/);
});

test("de werklijst-CSV verandert niet door claims; de voortgang wel", async () => {
  const g = nepGitHub();
  const v = maakVoortgang({ data: data(), repo: "x/y", gh: g.gh, now: g.nu });
  const voor = v.build([]);
  g.claim("anna", { bron: rapport("2026-open-rapport") });
  const na = v.build(await v.loadClaims());
  const csv = "docs/bijdragen/werklijst-rapporten.csv";
  assert.equal(na.bestanden[csv], voor.bestanden[csv]);
  assert.match(na.bestanden["docs/bijdragen/voortgang.md"], /@anna/);
  assert.doesNotMatch(voor.bestanden["docs/bijdragen/voortgang.md"], /@anna/);
  assert.match(voor.bestanden[csv], /mogelijk dubbel/);
  const aanbevolen = na.bestanden["docs/bijdragen/werklijst-aanbevolen.md"];
  assert.doesNotMatch(aanbevolen, /Claimen\]\([^)]*convenant-kopie/);
});

test("tempo en bijdragers tellen ingeleverde en verwerkte claims", async () => {
  const g = nepGitHub();
  const a = g.claim("anna", { bron: rapport("2026-open-rapport") });
  g.issues.get(a).labels.push({ name: "verwerkt" });
  g.issues.get(a).state = "closed";
  g.issues.get(a).closed_at = "2026-11-05T10:00:00Z";
  const v = maakVoortgang({ data: data(), repo: "x/y", gh: g.gh, now: g.nu });
  const md = v.build(await v.loadClaims()).bestanden["docs/bijdragen/voortgang.md"];
  assert.match(md, /\| november 2026 \| 1 \| 0 \|/);
  assert.match(md, /\*\*Bijdragers:\*\* @anna \(1\)/);
});

test("tellingen in andere pagina's worden bijgewerkt", () => {
  const tekst = [
    "<p>",
    "  <!--badge:database-->",
    '  <a href="oud"><img alt="Database: 1 rapporten" src="oud"></a>',
    "  <!--/badge-->",
    "</p>",
    "Met <!--n:rapporten-->1<!--/n--> rapporten en <!--n:alle-->10<!--/n--> in totaal. <!--n:onbekend-->x<!--/n-->",
  ].join("\n");
  const uit = werkTellingenBij(tekst, { rapporten: 28, alle: "9.200" }, "https://github.com/x/y");
  assert.match(uit, /<!--n:rapporten-->28<!--\/n--> rapporten/);
  assert.match(uit, /<!--n:alle-->9\.200<!--\/n-->/);
  assert.match(uit, /<!--n:onbekend-->x<!--\/n-->/);
  assert.match(uit, /badge\/database-28%20rapporten/);
  assert.match(uit, /alt="Database: 28 rapporten"/);
  assert.match(uit, /<!--\/badge-->\n<\/p>/);
});

/** Maakt een kleine, echte zip (zonder compressie). */
function maakZip(bestanden) {
  const lokaal = [], centraal = [];
  let offset = 0;
  for (const [naam, inhoud] of Object.entries(bestanden)) {
    const n = Buffer.from(naam), d = Buffer.from(inhoud), crc = crc32(d);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt32LE(crc, 14); l.writeUInt32LE(d.length, 18); l.writeUInt32LE(d.length, 22); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16); c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    lokaal.push(l, n, d); centraal.push(c, n); offset += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(centraal);
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(centraal.length / 2, 8); e.writeUInt16LE(centraal.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...lokaal, cd, e]);
}

test("de inhoudsopgave van een zip wordt gelezen zonder uit te pakken", () => {
  const zip = maakZip({ "pakket/bron.pdf": "%PDF", "pakket/normen.json": "{}" });
  assert.deepEqual(zipInhoud(zip).map((b) => b.naam), ["pakket/bron.pdf", "pakket/normen.json"]);
  assert.throws(() => zipInhoud(Buffer.from("geen zip, maar gewoon tekst die lang genoeg is")), /geen zip/);
});

test("een compleet pakket krijgt vinkjes; ontbrekende delen een waarschuwing", () => {
  const goed = beoordeelPakket(zipInhoud(maakZip({ "a/bron.pdf": "x", "a/normen.json": "x", "a/beperkingen.md": "x", "a/controle.md": "x" })), 100);
  assert.equal(goed.ok, true);
  assert.equal(goed.regels.filter((r) => r.startsWith("⚠️")).length, 0);
  const half = beoordeelPakket(zipInhoud(maakZip({ "a/bron.pdf": "x" })), 100);
  assert.equal(half.ok, true);
  assert.equal(half.regels.filter((r) => r.startsWith("⚠️")).length, 3);
});

test("scripts, vreemde paden, lege en te grote pakketten worden afgekeurd", () => {
  assert.equal(beoordeelPakket(zipInhoud(maakZip({ "a/installeer.sh": "x" })), 10).ok, false);
  assert.equal(beoordeelPakket(zipInhoud(maakZip({ "../buiten.md": "x" })), 10).ok, false);
  assert.equal(beoordeelPakket([], 10).ok, false);
  assert.equal(beoordeelPakket([{ naam: "a.md", grootte: 1 }], 26 * 1024 * 1024).ok, false);
  assert.equal(beoordeelPakket([{ naam: "a.md", grootte: 300 * 1024 * 1024 }], 10).ok, false);
});

test("alleen zip-bijlagen op GitHub worden opgehaald", () => {
  const l = zipLinks("Hier: https://github.com/user-attachments/files/123/pakket.zip en https://example.org/groot.zip");
  assert.deepEqual(l.github, ["https://github.com/user-attachments/files/123/pakket.zip"]);
  assert.deepEqual(l.extern, ["https://example.org/groot.zip"]);
});

test("na /inleveren volgt één automatische controle van de bijgevoegde zip", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  const zip = maakZip({ "a/bron.pdf": "x", "a/normen.json": "x", "a/beperkingen.md": "x", "a/controle.md": "x" });
  const gevraagd = [];
  const download = async (url) => { gevraagd.push(url); return zip; };
  await draai(g, download);
  g.reageer(n, "anna", "Klaar: https://github.com/user-attachments/files/9/pakket.zip\n/inleveren");
  await draai(g, download);
  await draai(g, download);
  assert.equal(gevraagd.length, 1);
  assert.equal(g.botTekst(n).match(/Automatische eerste controle/g).length, 1);
  assert.match(g.botTekst(n), /De bouwstenen \(normen en toetspunten\): lijkt aanwezig/);
});

test("/inleveren zonder zip krijgt uitleg; een kapotte zip een nette melding", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  const download = async () => Buffer.from("dit is geen zip-bestand, echt niet");
  g.reageer(n, "anna", "/inleveren");
  await draai(g, download);
  assert.match(g.botTekst(n), /Ik zie geen zip/);
  g.reageer(n, "anna", "Nieuwe versie https://github.com/user-attachments/files/10/pakket.zip\n/inleveren");
  await draai(g, download);
  assert.match(g.botTekst(n), /Ik kon de zip niet lezen/);
});

test("je kunt hooguit vijf bronnen tegelijk claimen", async () => {
  const g = nepGitHub();
  const nummers = [1, 2, 3, 4, 5, 6].map((i) => g.claim("anna", { bron: rapport(`2025-extra-${i}`) }));
  await draai(g);
  for (const n of nummers.slice(0, 5)) {
    assert.equal(g.issues.get(n).state, "open");
    assert.match(g.botTekst(n), /Dank je, @anna/);
  }
  const zesde = nummers[5];
  assert.equal(g.issues.get(zesde).state, "closed");
  assert.match(g.botTekst(zesde), /hooguit 5 tegelijk/);
  assert.doesNotMatch(g.botTekst(zesde), /Dank je/);
  // Na inleveren van één bron mag er weer een bij.
  g.reageer(nummers[0], "anna", "/inleveren");
  await draai(g);
  const nieuw = g.claim("anna", { bron: rapport("2025-extra-6") });
  await draai(g);
  assert.equal(g.issues.get(nieuw).state, "open");
});

test("ingeleverde claims staan bij 'wacht op de beheerder'; na 7 dagen één herinnering", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  await draai(g);
  g.wacht(1);
  g.reageer(n, "anna", "/inleveren");
  let v = await draai(g);
  let md = v.build(await v.loadClaims()).bestanden["docs/bijdragen/voortgang.md"];
  assert.match(md, /## Wacht op de beheerder\n\nDeze pakketten/);
  assert.match(md, /\| @anna \| 2026-10-02 \| 0 dagen \|/);
  g.wacht(6);
  await draai(g);
  assert.doesNotMatch(g.botTekst(n), /wacht al 7 dagen/);
  g.wacht(1.1);
  v = await draai(g);
  await draai(g);
  assert.equal(g.botTekst(n).match(/@x, dit pakket wacht al 7 dagen/g).length, 1);
  md = v.build(await v.loadClaims()).bestanden["docs/bijdragen/voortgang.md"];
  assert.match(md, /\| 7 dagen ⏰ \|/);
});

test("geen herinnering als de beheerder al reageerde", async () => {
  const g = nepGitHub();
  const n = g.claim("anna", { bron: rapport("2026-open-rapport") });
  g.reageer(n, "anna", "/inleveren");
  await draai(g);
  g.wacht(2);
  g.reageer(n, "x", "Ik kijk er volgende week naar.", "OWNER");
  g.wacht(10);
  await draai(g);
  assert.doesNotMatch(g.botTekst(n), /wacht al 7 dagen/);
});

test("zonder ingeleverde claims staat er dat niets wacht", async () => {
  const g = nepGitHub();
  const v = maakVoortgang({ data: data(), repo: "x/y", gh: g.gh, now: g.nu });
  assert.match(v.build([]).bestanden["docs/bijdragen/voortgang.md"], /Er wacht nu niets op de beheerder\./);
});

test("het weekoverzicht noemt alleen namen en bronnen van de afgelopen week", async () => {
  const g = nepGitHub();
  const oud = g.claim("bram", { bron: rapport("2025-extra-1") });
  g.wacht(10);
  const a = g.claim("anna", { bron: rapport("2026-open-rapport") });
  g.reageer(a, "anna", "/inleveren\nGeheime toelichting die niet in het overzicht mag.");
  const k = g.claim("cor", { bron: "WOO" });
  let v = await draai(g);
  const week = v.samenvatting(await v.loadClaims());
  assert.equal(week.sleutel, "week-2026-10-11");
  assert.match(week.titel, /Weekoverzicht tot 11 oktober 2026/);
  assert.match(week.tekst, /### 📦 Ingeleverd \(1\)\n\n- Onderzoek naar het inkoopproces bij het ministerie · @anna · #2/);
  assert.match(week.tekst, /### 🔄 Nieuw geclaimd \(2\)/);
  assert.match(week.tekst, /Wet open overheid \(Woo\) · @cor · #3/);
  assert.doesNotMatch(week.tekst, /bram|Geheime/);
  assert.ok(week.tekst.startsWith("<!-- omnibus:week-2026-10-11 -->"));
  assert.ok(oud && k);
  g.wacht(8);
  v = await draai(g);
  assert.equal(v.samenvatting(await v.loadClaims()), null, "een stille week geeft geen bericht");
});

test("gegenereerde pagina's volgen de bouwstenen: claimlinks met titel, geen lege koppen, kloppende ankers", async () => {
  const g = nepGitHub();
  const v = maakVoortgang({ data: data(), repo: "x/y", gh: g.gh, now: g.nu });
  g.claim("anna", { bron: rapport("2026-open-rapport") });
  const { bestanden } = v.build(await v.loadClaims());
  for (const pad of ["voortgang.md", "werklijst-aanbevolen.md", "werklijst-wetten-en-kaders.md"]) {
    const tekst = bestanden[`docs/bijdragen/${pad}`];
    assert.match(tekst, /<!-- paginatype: data -->/, pad);
    assert.match(tekst, /Automatisch bijgewerkt/, pad);
    assert.doesNotMatch(tekst, /▇/, pad);
    assert.doesNotMatch(tekst, /^\|\s*\|/m, `${pad}: lege kopcel`);
    for (const [, titel] of tekst.matchAll(/\[Claimen\]\([^ )]+( "[^"]*")?\)/g)) assert.match(titel || "", /^ "Claimen: .+"$/, `${pad}: claimlink zonder titel`);
    for (const regel of tekst.split("\n").filter((r) => r.startsWith("**Legenda"))) assert.ok(regel.split(/\s+/).length <= 25, `${pad}: legenda op één regel`);
  }
  const aanbevolen = bestanden["docs/bijdragen/werklijst-aanbevolen.md"];
  const ankers = [...aanbevolen.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
  const koppen = [...aanbevolen.matchAll(/^### (.+)$/gm)].map((m) => [...m[1].trim().toLowerCase()].filter((c) => /[\p{L}\p{N}\- ]/u.test(c)).join("").replace(/ /g, "-"));
  assert.ok(ankers.length > 0);
  for (const a of ankers) assert.ok(koppen.includes(a), `anker #${a} zonder kop`);
});
