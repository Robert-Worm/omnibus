import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { controleerBestand, controleerConfig, INSTALL, MAX_WOORDEN, meldingWaarschuwingen, tabelControle, tabellen, opdrachtWaarschuwingen, paginatypeMeldingen, slug, tekstWaarschuwingen, voetregel, heeftVoetregel, vormWaarschuwingen, blokWaarschuwingen, afbeeldingWaarschuwingen, beeldbestandWaarschuwingen, schemaWaarschuwingen, SCHEMAKLEUREN, woordWaarschuwingen, zinnen, zinWaarschuwingen } from "./check-docs.mjs";

const NVMRC = "24.17.0";
const VOET = "---\n\n[↑ a](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)\n";
const goed = (extra = "") =>
  `# Titel\n\n<!-- paginatype: naslag -->\n\n> **In het kort:** uitleg.\n\n## Uitleg\n${extra}\n## Volgende stap\n\nVerder.\n\n${VOET}`;

function maakRepo(bestanden) {
  const root = mkdtempSync(path.join(tmpdir(), "check-docs-"));
  for (const [rel, inhoud] of Object.entries({ "docs/begrippen.md": "# Begrippen\n", "docs/routekaart.md": "# Routekaart\n", "docs/a/README.md": "# a\n", ...bestanden })) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), inhoud);
  }
  return root;
}

test("slug volgt de ankers van GitHub", () => {
  assert.equal(slug("Pad A · Online versie"), "pad-a--online-versie");
  assert.equal(slug("Begrensde HTTP-controle vóór de demo"), "begrensde-http-controle-vóór-de-demo");
  assert.equal(slug("Welk **AI-model** gebruik je?"), "welk-ai-model-gebruik-je");
});

test("een pagina in het vaste patroon geeft geen meldingen", () => {
  const root = maakRepo({ "docs/README.md": "# W\n", "docs/a/pagina.md": goed() });
  try {
    assert.deepEqual(controleerBestand(root, "docs/a/pagina.md", { nvmrc: NVMRC }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kapotte links en ankers worden gemeld", () => {
  const root = maakRepo({
    "docs/README.md": "# W\n\n## Bestaat\n",
    "docs/a/pagina.md": goed("\n[weg](nergens.md) [anker](../README.md#bestaat-niet) [goed](../README.md#bestaat)\n"),
  });
  try {
    const m = controleerBestand(root, "docs/a/pagina.md", { nvmrc: NVMRC });
    assert.equal(m.length, 2);
    assert.match(m[0], /niet bestaat: nergens\.md/);
    assert.match(m[1], /anker bestaat niet/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("links in codeblokken tellen niet mee", () => {
  const root = maakRepo({ "docs/README.md": "# W\n", "docs/a/pagina.md": goed("\n```text\n[weg](nergens.md)\n```\n") });
  try {
    assert.deepEqual(controleerBestand(root, "docs/a/pagina.md", { nvmrc: NVMRC }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("een afwijkende Node-versie en installatieopdracht worden gemeld", () => {
  const root = maakRepo({
    "docs/README.md": "# W\n",
    "docs/a/pagina.md": goed(`\nGebruik Node 22 of Node.js 24.17.\n\n\`\`\`text\nnpm install\nnpm ci\n${INSTALL}\n\`\`\`\n`),
  });
  try {
    const m = controleerBestand(root, "docs/a/pagina.md", { nvmrc: NVMRC });
    assert.equal(m.length, 3, m.join("\n"));
    assert.match(m[0], /Node 22/);
    assert.match(m[1], /npm install/);
    assert.match(m[2], /wijkt af: "npm ci"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ontbrekende onderdelen van het paginapatroon worden gemeld", () => {
  const root = maakRepo({ "docs/README.md": "# W\n", "docs/a/pagina.md": "# Titel\n\nTekst.\n" });
  try {
    const m = controleerBestand(root, "docs/a/pagina.md", { nvmrc: NVMRC }).join("\n");
    assert.match(m, /In het kort/);
    assert.match(m, /paginatype/);
    assert.match(m, /Volgende stap/);
    assert.match(m, /vaste voetregel: \[↑ a\]\(README\.md\) · \[Wegwijzer\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("package.json moet dezelfde Node-versie eisen als .nvmrc", () => {
  const root = maakRepo({ "package.json": JSON.stringify({ engines: { node: ">=22" } }) });
  try {
    assert.match(controleerConfig(root, NVMRC)[0], /engines\.node/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("een npm-opdracht die niet bestaat wordt gemeld, behalve in skills", () => {
  const tekst = goed("\nDraai `npm run test:docs` en `npm run bestaat:niet`.\n");
  const root = maakRepo({ "docs/README.md": "# W\n", "docs/a/pagina.md": tekst, "skills/x/SKILL.md": "npm run bestaat:niet\n" });
  try {
    const scripts = { "test:docs": "x" };
    const m = controleerBestand(root, "docs/a/pagina.md", { nvmrc: NVMRC, scripts });
    assert.equal(m.length, 1);
    assert.match(m[0], /npm run bestaat:niet/);
    assert.deepEqual(controleerBestand(root, "skills/x/SKILL.md", { nvmrc: NVMRC, scripts }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("woordkeuze geeft waarschuwingen, niet in code of met een uitzondering", () => {
  const w = woordWaarschuwingen("docs/a.md", "De workflow en EP13-S01.\n\n`workflow` en [x](workflow.md)\n\n```text\nintake\n```\n");
  assert.equal(w.length, 2);
  assert.ok(w.some((x) => /"workflow" → werkwijze/.test(x)));
  assert.ok(w.some((x) => /EP13-S01/.test(x)));
  assert.deepEqual(woordWaarschuwingen("docs/a.md", "Een GitHub-workflow draait."), []);
  assert.deepEqual(woordWaarschuwingen("docs/a.md", "<!-- check-docs: geen-woordcontrole -->\nworkflow"), []);
});

test("lange zinnen in docs/ geven een waarschuwing, code en tabellen worden goed gesplitst", () => {
  const lang = Array.from({ length: MAX_WOORDEN + 1 }, (_, i) => `woord${i}`).join(" ") + ".";
  const kort = "Dit is kort. En dit ook!";
  assert.equal(zinWaarschuwingen("docs/a.md", lang).length, 1);
  assert.equal(zinWaarschuwingen("README.md", lang).length, 0, "alleen docs/");
  assert.equal(zinWaarschuwingen("docs/a.md", kort).length, 0);
  assert.equal(zinWaarschuwingen("docs/a.md", "```text\n" + lang + "\n```\n").length, 0, "codeblok telt niet");
  assert.equal(zinWaarschuwingen("docs/a.md", "| " + kort + " | " + kort + " |").length, 0, "tabelcellen apart");
  assert.equal(zinWaarschuwingen("docs/a.md", "<!-- check-docs: geen-woordcontrole -->\n" + lang).length, 0);
  // Een vraag in vet, met het antwoord op de volgende regel, zijn twee zinnen.
  assert.equal(zinnen("**Wat is het?**\nEen hulpmiddel.").length, 2);
  // Een alinea over twee regels is één zin; het regelnummer is dat van het begin.
  const z = zinnen("Kop\n\nEen zin die\ndoorloopt.");
  assert.deepEqual(z.at(-1), { nr: 3, zin: "Een zin die doorloopt.", woorden: 4 });
});

test("formele woorden uit de stijlgids geven een waarschuwing", () => {
  const w = woordWaarschuwingen("docs/a.md", "Indien nodig, middels de knop, teneinde te starten.");
  assert.equal(w.length, 3);
});

test("een opdracht met een npm-script hoort als npm run in docs/ te staan", () => {
  const scripts = { "check:links": "node scripts/check-links.mjs", test: "node --test x.mjs" };
  assert.deepEqual(opdrachtWaarschuwingen("docs/a.md", "Draai `node scripts/check-links.mjs` nu.", scripts),
    ['docs/a.md:1: gebruik "npm run check:links" in plaats van "node scripts/check-links.mjs"']);
  assert.deepEqual(opdrachtWaarschuwingen("docs/a.md", "node scripts/start-runtime-package.mjs", scripts), []);
  assert.deepEqual(opdrachtWaarschuwingen("hosting/README.md", "node scripts/check-links.mjs", scripts), []);
});

test("elk paginatype heeft zijn eigen verplichte onderdelen", () => {
  const t = (type, rest = "") => `# T\n\n<!-- paginatype: ${type} -->\n\n${rest}`;
  assert.match(paginatypeMeldingen("# T\n")[0], /mist het paginatype/);
  assert.match(paginatypeMeldingen(t("blog"))[0], /onbekend paginatype "blog"/);
  assert.match(paginatypeMeldingen(t("start", "## Samengevat\n"))[0], /startpagina zonder/);
  assert.deepEqual(paginatypeMeldingen(t("start", "| a | b |\n")), []);
  const lang = "Tekst.\n".repeat(60);
  assert.deepEqual(paginatypeMeldingen(t("taak", "### 1. Doe iets\n\n" + lang + "## Samengevat\n")), []);
  assert.deepEqual(paginatypeMeldingen(t("taak", lang)), ['mist de kop "## Samengevat"', "taakpagina zonder genummerde stappen"]);
  assert.deepEqual(paginatypeMeldingen(t("taak", "### 1. Doe iets\n")), [], "een korte taakpagina heeft geen Samengevat nodig");
  assert.match(paginatypeMeldingen(t("naslag", "## Samengevat\n\nKort.\n")).join(), /laat "## Samengevat" weg/);
  assert.match(paginatypeMeldingen(t("naslag", "## Volgende stap\n\nTerug naar de [wegwijzer](README.md).\n")).join(), /wijst vooruit/);
  assert.match(paginatypeMeldingen(t("data", "Lijst.\n"))[0], /Automatisch bijgewerkt/);
  assert.match(paginatypeMeldingen(t("logboek", "Geen tabel.\n"))[0], /zonder tabel/);
  assert.deepEqual(paginatypeMeldingen(t("naslag", "```text\n<!-- paginatype: taak -->\n```\n")), [], "voorbeelden in codeblokken tellen niet");
});

test("meldingen volgen de bouwstenen", () => {
  const goedeMelding = "> [!WARNING]\n> **Nooit:** iets onomkeerbaars.\n";
  assert.deepEqual(meldingWaarschuwingen("docs/a.md", goedeMelding), []);
  const fout = ["## Let op", "", "Let op: los.", "", "> [!CAUTION]", "> **Let op:** x", "", "> [!NOTE]", "> Geen vet woord."].join("\n");
  const w = meldingWaarschuwingen("docs/a.md", fout).join("\n");
  assert.match(w, /a\.md:1: kop "Let op"/);
  assert.match(w, /a\.md:3: losse waarschuwing/);
  assert.match(w, /a\.md:5: melding \[!CAUTION\]/);
  assert.match(w, /a\.md:8: begin een melding met een vet Nederlands woord/);
  assert.match(w, /a\.md:8: twee meldingen direct onder elkaar/);
  assert.deepEqual(meldingWaarschuwingen("docs/a.md", "```text\n> [!CAUTION]\n```\n"), [], "voorbeelden tellen niet");
});

test("tabellen volgen de bouwstenen", () => {
  const goed = "| Onderdeel | Status | Toelichting |\n| --- | --- | --- |\n| Online | ✅ Klaar | – |\n| Aantal | ⬜ Open | Zie \\| hier |\n";
  assert.deepEqual(tabelControle("docs/a.md", goed), { fouten: [], waarschuwingen: [] });
  assert.equal(tabellen(goed)[0].rijen[1].cellen.length, 3, "een geëscapete | splitst geen cel");
  const lang = Array.from({ length: 26 }, (_, i) => `w${i}`).join(" ");
  const fout = [
    "| | Wat |", "| --- | --- |", "| a | b |", "",
    "| A | B | C | D | E |", "| --- | --- | --- | --- | --- |", "| 1 | 2 | 3 | 4 | 5 |", "",
    "| Stap | Status | Aantal | Datum |", "| --- | --- | --- | --- |", `| ${lang} | ✅ | 12 | 21-10-2026 |`, "| x |  | 3 | – |",
  ].join("\n");
  const { fouten, waarschuwingen } = tabelControle("docs/a.md", fout);
  assert.match(fouten[0], /a\.md:1: tabel met een lege kopcel/);
  const w = waarschuwingen.join("\n");
  assert.match(w, /a\.md:5: tabel met 5 kolommen/);
  assert.match(w, /a\.md:9: kolom "Aantal" bevat getallen/);
  assert.match(w, /a\.md:11: cel van 26 woorden/);
  assert.match(w, /a\.md:11: statuscel "✅" volgt de statuslabels niet/);
  assert.match(w, /a\.md:11: datum in een tabel als JJJJ-MM-DD/);
  assert.match(w, /a\.md:12: lege cel/);
  assert.doesNotMatch(w, /kolom "Stap"/, "stapnummers zijn geen hoeveelheden");
});

test("taakpagina's: stapkoppen, codeblokken, plaatshouders en systeemlabels volgen de bouwstenen", () => {
  const goed = "<!-- paginatype: taak -->\n## Stap voor stap\n\n### 1. Haal de code op\n\n**Windows (PowerShell)**\n\n```powershell\nnpm run x -- --map <jouw-map>\n```\n\n**macOS en Linux (bash)**\n\n```bash\nnpm run x\n```\n";
  assert.deepEqual(vormWaarschuwingen("docs/a.md", goed), []);
  const fout = "<!-- paginatype: naslag -->\n## 1. Doe iets\n\n### 2. Een situatie\n\nWindows:\n\n```sh\nnpm run x -- --map \"<jouw-map>\"\n```\n\n```\nlos\n```\n";
  const w = vormWaarschuwingen("docs/a.md", fout).join("\n");
  for (const m of [/stap als ##-kop/, /genummerde kop buiten een taakpagina/, /systeemlabel "Windows:"/, /codeblok in "sh"/, /codeblok zonder taal/, /plaatshouder tussen aanhalingstekens/]) assert.match(w, m);
  assert.deepEqual(vormWaarschuwingen("hosting/README.md", "## 1. Mag\n\n```text\nx \"<a>\"\n```\n"), [], "buiten docs/ alleen de codetaal");
  assert.match(vormWaarschuwingen("hosting/README.md", "```sh\nx\n```\n").join(), /codeblok in "sh"/);
  assert.deepEqual(vormWaarschuwingen("skills/x/SKILL.md", "```js\nx\n```\n"), []);
});

test("blokken: vaste namen, geen koppen in uitklapblokken, kaarten op volgorde, geen dubbele koppen", () => {
  const goed = "## Wat heb je nodig?\n\n<details><summary><b>Technische details</b> · opdrachten</summary>\n\n**Vet**\n\n</details>\n\n### Melding\n\n- **Oorzaak:** a\n- **Herstellen:** b\n\n### Andere melding\n\n- **Herkennen:** c\n- **Nazorg:** d\n";
  assert.deepEqual(blokWaarschuwingen("docs/a.md", goed), []);
  const fout = "## Technische referentie\n\n<details><summary>Meer</summary>\n\n### Kop erin\n\n</details>\n\n## Vaste regels\n\n### Kaart\n\n- **Herstellen:** a\n- **Eerst doen:** b\n\n**Wat het betekent:** x\n\n### Kaart\n";
  const w = blokWaarschuwingen("docs/gebruiken/a.md", fout).join("\n");
  for (const m of [/noem dit blok "Technische details"/, /<b>Naam<\/b>/, /kop in een uitklapblok/, /alleen op beheerpagina's/, /"Eerst doen" staat niet op zijn plek/, /oude kaartvorm/, /dubbele kop "Kaart"/]) assert.match(w, m);
  assert.deepEqual(blokWaarschuwingen("docs/beheer/a.md", "## Vaste regels\n"), []);
});

test("afbeeldingen: licht en donker, alt-tekst van 10 tot 150 tekens, en een bijschrift", () => {
  const pic = (alt, na = "\n\n*Een bijschrift.*\n") => `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="a-donker.png">\n  <img src="a.png" alt="${alt}">\n</picture>${na}`;
  assert.deepEqual(afbeeldingWaarschuwingen("docs/a.md", pic("Het startscherm van Omnibus")), []);
  assert.deepEqual(afbeeldingWaarschuwingen("README.md", `<h1>\n  <picture>\n    <source media="(prefers-color-scheme: dark)" srcset="b-donker.png">\n    <img src="b.png" alt="De banner van Omnibus">\n  </picture>\n</h1>\n`), [], "de banner heeft geen bijschrift nodig");
  const w = [afbeeldingWaarschuwingen("docs/a.md", pic("Kort", "\n\nGewone tekst.\n")), afbeeldingWaarschuwingen("docs/a.md", "![Een scherm van Omnibus](../images/x.png)\n"), afbeeldingWaarschuwingen("docs/a.md", '<img src="x.png" alt="Een scherm zonder donker">\n\n*Bijschrift.*\n')].flat().join("\n");
  for (const m of [/alt-tekst van 4 tekens/, /bijschrift/, /gebruik <picture>/, /zonder donkere variant/]) assert.match(w, m);
  assert.deepEqual(afbeeldingWaarschuwingen("README.md", '<img alt="Badge" src="https://img.shields.io/x">'), [], "badges tellen niet mee");
});

test("beeldbestanden: grootte en donkere variant", () => {
  assert.deepEqual(beeldbestandWaarschuwingen([{ naam: "a.png", grootte: 1000 }, { naam: "a-donker.png", grootte: 1000 }, { naam: "r.gif", grootte: 900 * 1024 }]), []);
  const w = beeldbestandWaarschuwingen([{ naam: "a.png", grootte: 400 * 1024 }, { naam: "r.gif", grootte: 2 * 1024 * 1024 }]).join("\n");
  for (const m of [/hooguit 300 KB/, /hooguit 1 MB/, /geen donkere variant/]) assert.match(w, m);
});

test("schema's: vaste kleuren en van boven naar beneden bij meer dan vier vakken", () => {
  const def = `    classDef default ${SCHEMAKLEUREN.default}\n`;
  assert.deepEqual(schemaWaarschuwingen("docs/a.md", "```mermaid\nflowchart LR\n    A[\"a\"] --> B[\"b\"]\n" + def + "```\n"), []);
  const w = schemaWaarschuwingen("docs/a.md", "```mermaid\nflowchart LR\n    A[\"a\"] --> B[\"b\"] --> C[\"c\"] --> D[\"d\"] --> E[\"e\"]\n    classDef rood fill:#f00;\n    style A fill:#0f0\n```\n").join("\n");
  for (const m of [/5 vakken van links naar rechts/, /zonder de vaste kleur/, /classDef rood/, /losse style-regel/]) assert.match(w, m);
});

test("de voetregel per niveau: ouder, wegwijzer, begrippen en routekaart, zonder de pagina zelf", () => {
  const titel = (r) => ({ "docs/gebruiken/README.md": "Gebruiken", "hosting/README.md": "Hosting", "skills/README.md": "Skills" })[r];
  assert.equal(voetregel("docs/gebruiken/installeren.md", titel), "[↑ Gebruiken](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)");
  assert.equal(voetregel("docs/gebruiken/README.md", titel), "[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)");
  assert.equal(voetregel("docs/begrippen.md", titel), "[↑ Wegwijzer](README.md) · [Routekaart](routekaart.md)");
  assert.equal(voetregel("docs/README.md", titel), "[↑ Omnibus](../README.md) · [Begrippen](begrippen.md) · [Routekaart](routekaart.md)");
  assert.equal(voetregel("hosting/container/README.md", titel), "[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)");
  assert.equal(voetregel("SECURITY.md", titel), "[↑ Omnibus](README.md) · [Wegwijzer](docs/README.md) · [Begrippen](docs/begrippen.md) · [Routekaart](docs/routekaart.md)");
  for (const r of ["README.md", "AGENTS.md", "CHANGELOG.md", "skills/x/SKILL.md", "skills/x/references/y.md", ".github/ISSUE_TEMPLATE/a.md"]) assert.equal(heeftVoetregel(r), false, r);
  assert.equal(heeftVoetregel("skills/x/README.md"), true);
});

test("nette tekst: geen emoji in koppen, geen afgebroken alinea's, alleen toegestane HTML, verschillende linkteksten", () => {
  const goed = "# T\n\nEen alinea op één regel met [installeren](a.md) en [installeren](a.md#stap).\n\nOpen <http://127.0.0.1:4319/>.\n\n- lijst\n- lijst\n\n<details><summary><b>X</b></summary>\n\n</details>\n";
  assert.deepEqual(tekstWaarschuwingen("docs/a.md", goed), []);
  const fout = "## Klaar ✅\n\nEen alinea die\nover twee regels loopt.\n\n<div>blok</div>\n\n[releases](a.md) en [releases](b.md)\n";
  const w = tekstWaarschuwingen("docs/a.md", fout).join("\n");
  for (const m of [/emoji in een kop/, /afgebroken/, /<div> is niet toegestaan/, /linktekst "releases" wijst ook naar a\.md/]) assert.match(w, m);
  assert.deepEqual(tekstWaarschuwingen("docs/a.md", '[Claimen](a "Claimen: A") en [Claimen](b "Claimen: B")\n'), [], "een titel maakt gelijke linkteksten verschillend");
  assert.deepEqual(tekstWaarschuwingen("skills/x/SKILL.md", fout), [], "instructies voor AI-assistenten tellen niet mee");
});
