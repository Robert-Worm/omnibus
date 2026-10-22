#!/usr/bin/env node
// Controleert het tekstcontrast van Omnibus in lichte en donkere modus (WCAG AA: 4,5:1).
// Het script opent de hoofdschermen en dialogen met de openbare database, en meldt elke
// zichtbare tekst met te weinig contrast tegen zijn achtergrond.
//
//   npm run build -- --settings local-data/runtime/local-build.json
//   npm run check:contrast -- --settings local-data/runtime/local-build.json
//
// Opties: --schema light|dark   alleen dit kleurschema (standaard beide)
//         --port 4390           poort voor de tijdelijke server
// Nodig: Playwright met Chromium, net als voor npm run docs:screenshots.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MINIMUM = 4.5;

/** Relatieve helderheid van een kleur [r, g, b] (0–255), volgens WCAG. */
export function helderheid([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrastverhouding tussen twee kleuren [r, g, b], van 1 tot 21. */
export function contrast(a, b) {
  const [l1, l2] = [helderheid(a), helderheid(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function leesOpties(args) {
  const waarde = (naam) => { const i = args.indexOf(naam); return i >= 0 ? args[i + 1] : undefined; };
  const settings = waarde("--settings");
  if (!settings) throw new Error("Geef de database mee: --settings local-data/runtime/local-build.json");
  const schema = waarde("--schema");
  if (schema && !["light", "dark"].includes(schema)) throw new Error("--schema is light of dark");
  return { settings, port: Number(waarde("--port") || 4390), schemas: schema ? [schema] : ["light", "dark"] };
}

/** Draait in de browser: zichtbare teksten met te weinig contrast op het huidige scherm. */
function meetScherm({ minimum, donker }) {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const kleur = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => { const [r, g, b] = kleur(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const achtergrond = (el) => {
    for (; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (kleur(c)[3] > 128) return c; }
    return donker ? "#101923" : "#ffffff";
  };
  const uit = [];
  for (const el of document.querySelectorAll("body *")) {
    // Brondocumenten en de werkboekvoorbeelden houden bewust hun papierkleur.
    if (el.closest(".creator-table-scroll,.report-reading,.comparison-source,svg,[aria-hidden=true],[disabled],[aria-disabled=true]")) continue;
    const tekst = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (tekst.length < 2) continue;
    const vak = el.getBoundingClientRect();
    if (!vak.width || !vak.height || vak.bottom < 0 || vak.top > innerHeight) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) < 0.2) continue;
    const bg = achtergrond(el), [l1, l2] = [lum(cs.color), lum(bg)].sort((a, b) => b - a), verhouding = (l1 + 0.05) / (l2 + 0.05);
    if (verhouding < minimum) uit.push({ element: `${el.tagName.toLowerCase()}${[...el.classList].slice(0, 3).map((c) => "." + c).join("")}`, tekst: tekst.slice(0, 40), verhouding: Math.round(verhouding * 100) / 100, kleur: cs.color, achtergrond: bg });
  }
  return uit;
}

/** De hoofdschermen, op hun adres in de app. Daarna volgen een onderzoek, een rapport en een bronpassage. */
const ROUTES = ["begin", "grondslagen", "themas", "processen", "modellen", "rapporten", "open-grondslagen", "open-themas", "mijn-kader", "kaderexport", "risicoverkenning"];

async function main() {
  const { settings, port, schemas } = leesOpties(process.argv.slice(2));
  if (!existsSync(path.join(root, "database-build", "database.html"))) throw new Error("Bouw de applicatie eerst: npm run build -- --settings " + settings);
  let chromium;
  try { ({ chromium } = await import("playwright")); } catch { throw new Error("Playwright ontbreekt. Installeer het tijdelijk: npm install --no-save playwright && npx playwright install chromium"); }
  const server = spawn(process.execPath, ["scripts/serve-database-web.mjs", "--settings", settings, "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((klaar, fout) => {
    const tijd = setTimeout(() => fout(new Error("De server startte niet binnen 30 seconden.")), 30_000);
    server.stdout.on("data", (d) => { if (String(d).includes("http://127.0.0.1")) { clearTimeout(tijd); klaar(); } });
    server.on("exit", (code) => { clearTimeout(tijd); fout(new Error(`De server stopte (code ${code}).`)); });
  });
  const browser = await chromium.launch();
  const adres = `http://127.0.0.1:${port}/`;
  const meldingen = [];
  try {
    for (const schema of schemas) {
      const pagina = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: schema, reducedMotion: "reduce", locale: "nl-NL" })).newPage();
      const gezien = new Set();
      const meet = async (scherm) => {
        await pagina.waitForTimeout(1200);
        for (const m of await pagina.evaluate(meetScherm, { minimum: MINIMUM, donker: schema === "dark" })) {
          const sleutel = `${m.element}|${m.kleur}|${m.achtergrond}`;
          if (gezien.has(sleutel)) continue;
          gezien.add(sleutel);
          meldingen.push(`${schema === "dark" ? "donker" : "licht"} · ${scherm}: ${m.element} "${m.tekst}" ${m.verhouding}:1 (${m.kleur} op ${m.achtergrond})`);
        }
      };
      const ga = (hash) => pagina.goto(adres + "#" + hash, { waitUntil: "networkidle" });
      for (const route of ROUTES) { await ga(route); await meet(route); }
      // Een onderzoek doorlopen tot in de normtabel van een kader.
      await ga("begin");
      await pagina.getByRole("button", { name: /Start vanuit deze behoefte/ }).click(); await meet("stap 1");
      await pagina.getByRole("button", { name: /Naar stap 2/ }).first().click(); await pagina.waitForTimeout(800);
      await pagina.evaluate(() => { location.hash = "grondslagen"; }); await pagina.waitForTimeout(800);
      await pagina.getByRole("button", { name: "Toon alle bronnen" }).click(); await meet("alle bronnen");
      await pagina.getByRole("button", { name: "Open in viewer" }).first().click(); await pagina.waitForTimeout(1500); await meet("normtabel");
      // Een rapport, het normdetail en de bronpassage.
      await ga("rapporten");
      await pagina.getByText("Bekijk normen en toetspunten").first().click(); await pagina.waitForTimeout(1500); await meet("rapport");
      await pagina.getByText("Bekijk toetspunten").first().click(); await meet("normdetail");
      await pagina.locator("[role=dialog] button", { hasText: /^Bronpassage$/ }).first().click(); await pagina.waitForTimeout(2000); await meet("bronpassage");
      await pagina.context().close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  if (meldingen.length) {
    console.error(`Contrast: ${meldingen.length} ${meldingen.length === 1 ? "tekst" : "teksten"} onder ${String(MINIMUM).replace(".", ",")}:1 (WCAG AA).`);
    for (const m of meldingen) console.error(`  · ${m}`);
    process.exitCode = 1;
  } else console.log(`Contrast: alles in orde (${schemas.map((s) => (s === "dark" ? "donker" : "licht")).join(" en ")}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Contrastcontrole mislukt: ${fout.message}`); process.exitCode = 1; });
}
