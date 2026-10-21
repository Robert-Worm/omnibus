import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { controleerBestand, controleerConfig, INSTALL, MAX_WOORDEN, meldingWaarschuwingen, tabelControle, tabellen, opdrachtWaarschuwingen, paginatypeMeldingen, slug, vormWaarschuwingen, woordWaarschuwingen, zinnen, zinWaarschuwingen } from "./check-docs.mjs";

const NVMRC = "24.17.0";
const VOET = "---\n\n[↑ Wegwijzer](../README.md)\n";
const goed = (extra = "") =>
  `# Titel\n\n<!-- paginatype: naslag -->\n\n> **In het kort:** uitleg.\n\n## Uitleg\n${extra}\n## Samengevat\n\nKort.\n\n## Volgende stap\n\nVerder.\n\n${VOET}`;

function maakRepo(bestanden) {
  const root = mkdtempSync(path.join(tmpdir(), "check-docs-"));
  for (const [rel, inhoud] of Object.entries(bestanden)) {
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
    assert.match(m, /navigatieregel/);
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
  assert.deepEqual(paginatypeMeldingen(t("taak", "### 1. Doe iets\n\n## Samengevat\n")), []);
  assert.deepEqual(paginatypeMeldingen(t("taak", "Uitleg.\n")), ['mist de kop "## Samengevat"', "taakpagina zonder genummerde stappen"]);
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
