#!/usr/bin/env node
// Maakt alle schermafbeeldingen in docs/images/ en de rondleiding (GIF met voortgangsbalk)
// opnieuw, met de openbare database en steeds hetzelfde fictieve onderzoek.
//
//   npm run build -- --settings local-data/runtime/local-build.json
//   npm run docs:screenshots -- --settings local-data/runtime/local-build.json
//
// Opties: --alleen naam1,naam2   alleen deze afbeeldingen (zonder .png/.gif)
//         --port 4391            poort voor de tijdelijke server
// Nodig: Playwright met Chromium (niet in package.json, om de installatie klein te houden):
//   npm install --no-save playwright && npx playwright install chromium
// Voor de GIF ook ffmpeg. Ontbreekt ffmpeg, dan slaat het script alleen de GIF over.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_VERSION } from "../lib/product-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STAND = "docs/images/schermafbeeldingen.txt";

/** Leest het standbestand: per regel "bestand versie"; regels met # zijn uitleg. */
export function leesStand(tekst) {
  return Object.fromEntries(tekst.split("\n").map((r) => r.trim()).filter((r) => r && !r.startsWith("#")).map((r) => r.split(/\s+/)));
}

export function schrijfStand(bestanden) {
  return "# Bij welke versie van de applicatie hoort elke afbeelding? Bijgewerkt door npm run docs:screenshots.\n" +
    Object.entries(bestanden).sort(([a], [b]) => a.localeCompare(b)).map(([b, v]) => `${b} ${v}\n`).join("");
}
const BREED = 1440, HOOG = 900;

// Het vaste fictieve onderzoek.
export const ONDERZOEK = {
  onderwerp: "de inrichting van de CIO-functie bij een ministerie",
  centraleVraag: "In hoeverre is de CIO-functie bij het ministerie zo ingericht dat informatievoorziening en IT bestuurlijk worden gestuurd en geborgd?",
  koppelingen: 6,
};

export const STAPPEN = ["Onderzoeksrichting", "Verzamel", "Bouw je kader", "Exporteer"];

/** HTML voor één beeld van de rondleiding: de vier stappen, een uitleg en een voortgangsbalk boven de schermafbeelding. */
export function rondleidingHtml({ stap, uitleg, voortgang, beeld }) {
  const pil = (naam, i) => {
    const klaar = i < stap, actief = i === stap;
    const stijl = actief ? "background:#01689b;color:#fff;border-color:#01689b" : klaar ? "background:#fff;color:#01689b;border-color:#01689b" : "background:#fff;color:#5b6b7f;border-color:#cdd5df";
    const teken = klaar ? "✓" : String(i + 1);
    return `<div class="pil" style="${stijl}"><span class="nr">${teken}</span>${naam}</div>`;
  };
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;width:${BREED}px;font-family:Inter,"Segoe UI",Arial,sans-serif;background:#fff}
    .kop{padding:18px 20px 0;height:138px;box-sizing:border-box}
    .pillen{display:flex;gap:12px}
    .pil{flex:1;border:2px solid;border-radius:8px;padding:9px 14px;font-size:22px;display:flex;align-items:center;gap:10px}
    .nr{display:inline-flex;width:28px;height:28px;border-radius:50%;border:2px solid currentColor;align-items:center;justify-content:center;font-size:16px}
    .balk{height:6px;background:#e3e8ee;margin:12px 0 10px}.balk div{height:100%;background:#01689b}
    .uitleg{font-size:20px;color:#15233b}
    img{display:block;width:${BREED}px;height:${HOOG}px}
  </style><div class="kop"><div class="pillen">${STAPPEN.map(pil).join("")}</div>
  <div class="balk"><div style="width:${(voortgang * 100).toFixed(1)}%"></div></div>
  <div class="uitleg">${uitleg}</div></div><img src="data:image/png;base64,${beeld.toString("base64")}">`;
}

/** Leest de opties; gooit een begrijpelijke fout bij ontbrekende instellingen. */
export function leesOpties(args) {
  const waarde = (naam) => { const i = args.indexOf(naam); return i >= 0 ? args[i + 1] : undefined; };
  const settings = waarde("--settings");
  if (!settings) throw new Error("Geef de database mee: --settings local-data/runtime/local-build.json");
  return { settings, port: Number(waarde("--port") || 4391), alleen: waarde("--alleen")?.split(",").filter(Boolean) ?? null };
}

// ---------- de schermen ----------
const wacht = (p, ms = 900) => p.waitForTimeout(ms);
const naarBoven = (p) => p.evaluate(() => window.scrollTo(0, 0));

async function richting(p) {
  await p.getByRole("button", { name: /Start vanuit deze behoefte/ }).click(); await wacht(p, 1200);
  await p.getByText("Diagnostisch", { exact: true }).first().click();
  await p.fill("#goal-subject", ONDERZOEK.onderwerp); await wacht(p, 500);
}
async function verzamel(p) {
  await p.getByRole("button", { name: /Naar stap 2/ }).first().click(); await wacht(p, 1200);
  await p.evaluate(() => { location.hash = "grondslagen"; }); await wacht(p, 1200);
  await p.getByRole("button", { name: "Toon alle bronnen" }).click(); await wacht(p);
  await p.getByRole("button", { name: "Open in viewer" }).first().click(); await wacht(p, 2500);
}
async function selecteer(p) {
  await p.getByLabel(/Selecteer hele groep/).first().check(); await wacht(p, 800);
}
async function bouw(p) {
  await p.getByRole("button", { name: /Naar stap 3/ }).first().click(); await wacht(p, 1500);
}
async function vraagopzet(p) {
  await p.getByRole("button", { name: /Bekijk mijn vraagopzet/ }).click(); await wacht(p, 1200);
  await p.fill("#central-question-input", ONDERZOEK.centraleVraag); await wacht(p, 400);
}
async function koppel(p) {
  await p.getByRole("button", { name: /Gebruik deze opzet/ }).click(); await wacht(p, 1500);
  // Per bouwsteen: "Koppelen" in de lijst opent een paneel; de centrale vraag staat al aangevinkt.
  for (let i = 0; i < ONDERZOEK.koppelingen; i++) {
    await p.locator("button:not(.norm-link-picker button)", { hasText: /^Koppelen$/ }).first().click(); await wacht(p, 600);
    await p.locator(".norm-link-picker button", { hasText: /^Koppelen$/ }).click();
    await p.locator(".norm-link-picker").waitFor({ state: "detached" }); await wacht(p, 300);
  }
}
async function exporteer(p) {
  await p.getByRole("button", { name: /Naar stap 4/ }).first().click(); await wacht(p, 1500);
  await p.getByText("Normtoetsing", { exact: true }).first().click().catch(() => {}); await wacht(p, 800);
  await naarBoven(p);
}

/** De losse schermafbeeldingen: naam, kleurschema en wat er moet gebeuren. */
const SCHERMEN = [
  { naam: "omnibus-overview", schema: "light", doe: async () => {} },
  { naam: "omnibus-overview-donker", schema: "dark", doe: async () => {} },
  { naam: "stap-1-onderzoeksrichting", schema: "light", doe: async (p) => { await richting(p); await naarBoven(p); } },
  { naam: "stap-2-verzamel", schema: "light", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); } },
  { naam: "stap-2-verzamel-donker", schema: "dark", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); } },
  { naam: "stap-3-bouw-je-kader", schema: "light", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); await bouw(p); await vraagopzet(p); await koppel(p); await naarBoven(p); } },
  { naam: "stap-4-exporteer", schema: "light", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); await bouw(p); await vraagopzet(p); await koppel(p); await exporteer(p); } },
  { naam: "ai-koppelen", schema: "light", doe: async (p) => { await p.getByRole("button", { name: "AI koppelen" }).click(); await wacht(p); } },
  { naam: "bronpassage", schema: "light", start: "#rapporten", doe: async (p) => {
    await wacht(p, 1200);
    await p.getByText("Bekijk normen en toetspunten").first().click(); await wacht(p, 2500);
    await p.getByText("Bekijk toetspunten").first().click(); await wacht(p, 1500);
    await p.locator("[role=dialog] button", { hasText: /^Bronpassage$/ }).first().click(); await wacht(p, 3000);
  } },
];

/** De rondleiding: per scène de stap, de uitleg en hoe lang (in beelden van een halve seconde). */
const SCENES = [
  { stap: -1, uitleg: "Start: kies of je begint vanuit een vraag of vanuit signalen", duur: 6, doe: async () => {} },
  { stap: 0, uitleg: "Kies de onderzoeksrichting en het onderwerp", duur: 7, doe: richting },
  { stap: 1, uitleg: "Kies normen en toetspunten, hier uit het CIO-stelsel", duur: 6, doe: verzamel },
  { stap: 1, uitleg: "Kies normen en toetspunten, hier uit het CIO-stelsel", duur: 6, doe: selecteer },
  { stap: 2, uitleg: "Schrijf je centrale vraag en koppel de bouwstenen", duur: 6, doe: bouw },
  { stap: 2, uitleg: "Schrijf je centrale vraag en koppel de bouwstenen", duur: 6, doe: vraagopzet },
  { stap: 2, uitleg: "Schrijf je centrale vraag en koppel de bouwstenen", duur: 7, doe: async (p) => { await koppel(p); await naarBoven(p); } },
  { stap: 3, uitleg: "Kies een werkvorm en download je referentiekader als Excel", duur: 8, doe: exporteer },
];

async function laadPlaywright() {
  try { return (await import("playwright")).chromium; } catch {
    throw new Error("Playwright ontbreekt. Installeer het tijdelijk: npm install --no-save playwright && npx playwright install chromium");
  }
}

async function startServer(settings, port) {
  if (!existsSync(path.join(root, "database-build", "database.html")))
    throw new Error("Bouw de applicatie eerst: npm run build -- --settings " + settings);
  const proces = spawn(process.execPath, ["scripts/serve-database-web.mjs", "--settings", settings, "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((klaar, fout) => {
    const tijd = setTimeout(() => fout(new Error("De server startte niet binnen 30 seconden.")), 30_000);
    proces.stdout.on("data", (d) => { if (String(d).includes("http://127.0.0.1")) { clearTimeout(tijd); klaar(); } });
    proces.on("exit", (code) => { clearTimeout(tijd); fout(new Error(`De server stopte (code ${code}). Controleer --settings en de poort.`)); });
  });
  return proces;
}

async function nieuwePagina(browser, schema, adres) {
  const context = await browser.newContext({ viewport: { width: BREED, height: HOOG }, colorScheme: schema, reducedMotion: "reduce", locale: "nl-NL" });
  const pagina = await context.newPage();
  const fouten = [];
  pagina.on("pageerror", (e) => fouten.push(String(e)));
  await pagina.goto(adres, { waitUntil: "networkidle" });
  await wacht(pagina, 800);
  return { context, pagina, fouten };
}

function maakGif(beelden, doel) {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch { console.warn("ffmpeg ontbreekt: de rondleiding wordt overgeslagen."); return false; }
  const map = mkdtempSync(path.join(tmpdir(), "omnibus-rondleiding-"));
  try {
    beelden.forEach((b, i) => writeFileSync(path.join(map, `b${String(i).padStart(3, "0")}.png`), b));
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", "2", "-i", path.join(map, "b%03d.png"),
      "-vf", "scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
      "-loop", "0", doel]);
    return true;
  } finally { rmSync(map, { recursive: true, force: true }); }
}

async function main() {
  const { settings, port, alleen } = leesOpties(process.argv.slice(2));
  const chromium = await laadPlaywright();
  const server = await startServer(settings, port);
  const browser = await chromium.launch();
  const adres = `http://127.0.0.1:${port}/`;
  const uit = path.join(root, "docs", "images");
  mkdirSync(uit, { recursive: true });
  const gemaakt = [];
  const wil = (naam) => !alleen || alleen.includes(naam);
  try {
    for (const s of SCHERMEN.filter((s) => wil(s.naam))) {
      const { context, pagina, fouten } = await nieuwePagina(browser, s.schema, adres + (s.start || "#begin"));
      await s.doe(pagina);
      await pagina.screenshot({ path: path.join(uit, `${s.naam}.png`) });
      await context.close();
      if (fouten.length) throw new Error(`Browserfout bij ${s.naam}: ${fouten[0]}`);
      gemaakt.push(`${s.naam}.png`); console.log(`✓ ${s.naam}.png`);
    }
    if (wil("rondleiding")) {
      const { context, pagina, fouten } = await nieuwePagina(browser, "light", adres + "#begin");
      const opname = [];
      for (const scene of SCENES) { await scene.doe(pagina); opname.push({ ...scene, beeld: await pagina.screenshot() }); }
      await context.close();
      if (fouten.length) throw new Error(`Browserfout in de rondleiding: ${fouten[0]}`);
      const totaal = SCENES.reduce((n, s) => n + s.duur, 0);
      const kader = await browser.newPage({ viewport: { width: BREED, height: HOOG + 138 } });
      const beelden = [];
      let teller = 0;
      for (const s of opname) for (let i = 0; i < s.duur; i++) {
        await kader.setContent(rondleidingHtml({ ...s, voortgang: ++teller / totaal }));
        beelden.push(await kader.screenshot());
      }
      if (maakGif(beelden, path.join(uit, "rondleiding.gif"))) { gemaakt.push("rondleiding.gif"); console.log(`✓ rondleiding.gif (${beelden.length} beelden)`); }
    }
  } finally {
    await browser.close();
    server.kill();
  }
  const pad = path.join(root, STAND);
  const stand = existsSync(pad) ? leesStand(readFileSync(pad, "utf8")) : {};
  for (const b of gemaakt) stand[b] = PRODUCT_VERSION;
  writeFileSync(pad, schrijfStand(stand));
  console.log(`Klaar: ${gemaakt.length} bestanden voor versie ${PRODUCT_VERSION}. Bekijk ze voordat je ze commit.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => { console.error(`Schermafbeeldingen maken mislukt: ${fout.message}`); process.exitCode = 1; });
}
