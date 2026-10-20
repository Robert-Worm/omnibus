import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { controleerBestand, controleerConfig, INSTALL, slug, woordWaarschuwingen } from "./check-docs.mjs";

const NVMRC = "24.17.0";
const VOET = "---\n\n[↑ Wegwijzer](../README.md)\n";
const goed = (extra = "") =>
  `# Titel\n\n> **In het kort:** uitleg.\n\n## Uitleg\n${extra}\n## Samengevat\n\nKort.\n\n## Volgende stap\n\nVerder.\n\n${VOET}`;

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
    assert.match(m, /Samengevat/);
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
