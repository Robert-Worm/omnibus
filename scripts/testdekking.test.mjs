// Elke test draait ergens (#292): in een npm-script, een workflow, de code-only-controle of via
// een import vanuit een test die zelf draait. Een test die nergens draait, beschermt niets.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lees = (p) => readFileSync(path.join(root, p), "utf8");

/** Testscripts die bewust niet in `npm test` zitten, met de reden. */
export const BUITEN_NPM_TEST = {
  "test:agent:protocol": "Vraagt een verse agentbuild met de echte database (npm run build:agent); zie AUDIT-CRITERIA.md §6.",
  "test:intake": "Zit al in test:content-handoff.",
};

/** Testbestanden die nergens draaien. */
export function nergens(bestanden, { scripts, workflows, codeTests, imports }) {
  const tekst = [...Object.values(scripts), workflows, ...codeTests].join("\n");
  const draait = new Set(bestanden.filter((f) => tekst.includes(f)));
  for (let nieuw = true; nieuw; ) {
    nieuw = false;
    for (const [van, naar] of imports) if (draait.has(van) && !draait.has(naar)) { draait.add(naar); nieuw = true; }
  }
  return bestanden.filter((f) => !draait.has(f));
}

/** Imports van een testbestand naar een ander testbestand, als [van, naar]. */
export function testImports(bestand, inhoud) {
  return [...inhoud.matchAll(/import\s+['"](\.{1,2}\/[^'"]+\.test\.m?js)['"]/g)].map((m) => [bestand, path.posix.join(path.posix.dirname(bestand), m[1])]);
}

test("elke test draait ergens", () => {
  const bestanden = execFileSync("git", ["ls-files", "*.test.mjs", "*.test.js"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const scripts = JSON.parse(lees("package.json")).scripts;
  const workflows = readdirSync(path.join(root, ".github/workflows")).map((f) => lees(`.github/workflows/${f}`)).join("\n");
  // check-code-only.mjs --test (test:code-only) draait de codeTests en zijn eigen test.
  const codeTests = [...(JSON.parse(lees("code-snapshot.json")).codeTests ?? []), lees("scripts/check-code-only.mjs")];
  const imports = bestanden.flatMap((f) => testImports(f, lees(f)));
  assert.deepEqual(nergens(bestanden, { scripts, workflows, codeTests, imports }), [], "Zet deze tests in een npm-script, bijvoorbeeld in test:runtime.");
});

test("een testscript buiten npm test heeft een reden", () => {
  const scripts = JSON.parse(lees("package.json")).scripts;
  const buiten = Object.keys(scripts).filter((k) => k.startsWith("test:") && !new RegExp(`npm run ${k.replace(/[:]/g, "\\:")}(\\s|$)`).test(scripts.test));
  assert.deepEqual(buiten.sort(), Object.keys(BUITEN_NPM_TEST).sort());
});

test("de controle vindt een test die nergens draait, ook via imports", () => {
  const bestanden = ["a.test.mjs", "b.test.mjs", "c.test.mjs", "d.test.mjs"];
  const imports = [["a.test.mjs", "b.test.mjs"], ["d.test.mjs", "c.test.mjs"]];
  assert.deepEqual(nergens(bestanden, { scripts: { test: "node --test a.test.mjs" }, workflows: "", codeTests: [], imports }), ["c.test.mjs", "d.test.mjs"]);
  assert.deepEqual(testImports("x/y.test.mjs", "import './z.test.mjs';\nimport '../lib/q.test.mjs';"), [["x/y.test.mjs", "x/z.test.mjs"], ["x/y.test.mjs", "lib/q.test.mjs"]]);
});
