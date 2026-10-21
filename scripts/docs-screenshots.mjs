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
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
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
export const KLEUREN = {
  light: { achter: "#fff", tekst: "#15233b", accent: "#01689b", zacht: "#5b6b7f", rand: "#cdd5df", balk: "#e3e8ee", vlak: "#fff" },
  dark: { achter: "#111a24", tekst: "#e6edf5", accent: "#5aa9e6", zacht: "#9aa8b8", rand: "#2c3a4a", balk: "#223040", vlak: "#16212d" },
};

export function rondleidingHtml({ stap, uitleg, voortgang, beeld, schema = "light", speel = false }) {
  const k = KLEUREN[schema];
  const pil = (naam, i) => {
    const klaar = i < stap, actief = i === stap;
    const stijl = actief ? `background:${k.accent};color:${k.achter};border-color:${k.accent}` : klaar ? `background:${k.vlak};color:${k.accent};border-color:${k.accent}` : `background:${k.vlak};color:${k.zacht};border-color:${k.rand}`;
    const teken = klaar ? "✓" : String(i + 1);
    return `<div class="pil" style="${stijl}"><span class="nr">${teken}</span>${naam}</div>`;
  };
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;width:${BREED}px;font-family:Inter,"Segoe UI",Arial,sans-serif;background:${k.achter}}
    .kop{padding:18px 20px 0;height:138px;box-sizing:border-box}
    .pillen{display:flex;gap:12px}
    .pil{flex:1;border:2px solid;border-radius:8px;padding:9px 14px;font-size:22px;display:flex;align-items:center;gap:10px}
    .nr{display:inline-flex;width:28px;height:28px;border-radius:50%;border:2px solid currentColor;align-items:center;justify-content:center;font-size:16px}
    .balk{height:6px;background:${k.balk};margin:12px 0 10px}.balk div{height:100%;background:${k.accent}}
    .uitleg{font-size:20px;color:${k.tekst}}
    img{display:block;width:${BREED}px;height:${HOOG}px}
    .speel{position:absolute;left:50%;top:${138 + HOOG / 2}px;transform:translate(-50%,-50%);display:flex;align-items:center;gap:16px;padding:22px 34px;border-radius:999px;background:${k.accent};color:${k.achter};font-size:30px;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,.3)}
    .speel b{width:0;height:0;border-left:26px solid currentColor;border-top:16px solid transparent;border-bottom:16px solid transparent}
  </style>${speel ? `<div class="speel"><b></b>Bekijk de rondleiding</div>` : ""}<div class="kop"><div class="pillen">${STAPPEN.map(pil).join("")}</div>
  <div class="balk"><div style="width:${(voortgang * 100).toFixed(1)}%"></div></div>
  <div class="uitleg">${uitleg}</div></div><img src="data:image/png;base64,${beeld.toString("base64")}">`;
}

/** De banner bovenaan de README: naam, belofte en twee schermen van Omnibus, in licht of donker. Formaat 1280 × 480, gemaakt op dubbele dichtheid. */
export const BANNER = { breed: 1280, hoog: 480 };
export function bannerHtml({ schema = "light", lettertypen = "", voor, achter }) {
  const d = schema === "dark";
  const c = d
    ? { bg: "linear-gradient(135deg,#0f1722,#172231)", titel: "#cfe0f5", lijn: "#5aa9e6", kop: "#e6edf5", tekst: "#a9b6c6", raam: "#1c2633", rand: "#2c3a4a", stip: "#3a4a5c", schaduw: "0 18px 40px rgba(0,0,0,.45)" }
    : { bg: "linear-gradient(135deg,#f5f7fa,#e8edf3)", titel: "#1b3f6e", lijn: "#1b3f6e", kop: "#15233b", tekst: "#3b4a5c", raam: "#fff", rand: "#d9e0e8", stip: "#d3d9e0", schaduw: "0 18px 40px rgba(21,35,59,.16)" };
  const raam = (beeld, stijl, bijsnijden = 0) => `<div class="raam" style="${stijl}"><div class="balk"><i></i><i></i><i></i></div><img style="margin-top:-${bijsnijden}px" src="data:image/png;base64,${beeld.toString("base64")}"></div>`;
  return `<!doctype html><meta charset="utf-8"><style>${lettertypen}
    body{margin:0;width:${BANNER.breed}px;height:${BANNER.hoog}px;overflow:hidden;background:${c.bg};font-family:Inter,sans-serif;position:relative}
    .tekst{position:absolute;left:58px;top:118px;width:470px}
    h1{margin:0 0 30px;padding-left:24px;border-left:5px solid ${c.lijn};font:700 96px/1 Spectral,Georgia,serif;color:${c.titel};letter-spacing:-1px}
    .belofte{margin:0 0 18px;font:600 30px/1.2 Inter,sans-serif;color:${c.kop}}
    .uitleg{margin:0;font:400 19px/1.45 Inter,sans-serif;color:${c.tekst}}
    .raam{position:absolute;border-radius:10px;overflow:hidden;background:${c.raam};border:1px solid ${c.rand};box-shadow:${c.schaduw}}
    .raam .balk{position:relative;z-index:1;background:${c.raam};height:22px;display:flex;gap:6px;align-items:center;padding-left:12px}
    .raam i{width:9px;height:9px;border-radius:50%;background:${c.stip}}
    .raam img{display:block;width:100%}
  </style>
  ${raam(achter, "left:770px;top:22px;width:450px")}
  ${raam(voor, "left:600px;top:120px;width:500px", 14)}
  <div class="tekst"><h1>Omnibus</h1><p class="belofte">Van brondocument naar referentiekader</p>
  <p class="uitleg">Rapporten, wetten, kaders en modellen<br>→ normen, toetspunten en onderzoeksvragen</p></div>`;
}

/** Naam van een afbeelding in een kleurschema: licht heet gewoon, donker krijgt -donker. */
export const beeldNaam = (naam, schema) => (schema === "dark" ? `${naam}-donker` : naam);
export const MAX_PNG = 300 * 1024, MAX_GIF = 1024 * 1024;

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

/** De losse schermafbeeldingen: naam en wat er moet gebeuren. Elk scherm wordt in licht én donker gemaakt. */
const SCHERMEN = [
  { naam: "omnibus-overview", doe: async () => {} },
  { naam: "stap-1-onderzoeksrichting", doe: async (p) => { await richting(p); await naarBoven(p); } },
  { naam: "stap-2-verzamel", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); } },
  { naam: "stap-3-bouw-je-kader", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); await bouw(p); await vraagopzet(p); await koppel(p); await naarBoven(p); } },
  { naam: "stap-4-exporteer", doe: async (p) => { await richting(p); await verzamel(p); await selecteer(p); await bouw(p); await vraagopzet(p); await koppel(p); await exporteer(p); } },
  { naam: "ai-koppelen", doe: async (p) => { await p.getByRole("button", { name: "AI koppelen" }).click(); await wacht(p); } },
  { naam: "bronpassage", start: "#rapporten", doe: async (p) => {
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

/** De lettertypen van Omnibus zelf (Inter en Spectral), uit de gebouwde CSS, zodat de banner er net zo uitziet als de app. */
function lettertypenUitBuild() {
  const map = path.join(root, "database-build", "assets");
  if (!existsSync(map)) return "";
  return readdirSync(map).filter((f) => f.endsWith(".css"))
    .flatMap((f) => readFileSync(path.join(map, f), "utf8").match(/@font-face\{[^}]*\}/g) || []).join("\n");
}

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

/** Maakt een PNG kleiner (256 kleuren) als hij boven de grens komt. Zonder ffmpeg blijft hij zoals hij is. */
function verklein(bestand) {
  if (statSync(bestand).size <= MAX_PNG) return;
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch { return; }
  const tijdelijk = bestand.replace(/\.png$/, ".klein.png");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", bestand, "-vf", "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none", tijdelijk]);
  renameSync(tijdelijk, bestand);
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
    const beeld = {};
    for (const s of SCHERMEN) for (const schema of ["light", "dark"]) {
      const naam = beeldNaam(s.naam, schema);
      if (!wil(s.naam) && !wil(naam)) continue;
      const { context, pagina, fouten } = await nieuwePagina(browser, schema, adres + (s.start || "#begin"));
      await s.doe(pagina);
      const doel = path.join(uit, `${naam}.png`);
      beeld[naam] = await pagina.screenshot({ path: doel });
      await context.close();
      if (fouten.length) throw new Error(`Browserfout bij ${naam}: ${fouten[0]}`);
      verklein(doel);
      gemaakt.push(`${naam}.png`); console.log(`✓ ${naam}.png`);
    }
    if (wil("omnibus-banner")) {
      const lettertypen = lettertypenUitBuild();
      for (const schema of ["light", "dark"]) {
        const naam = beeldNaam("omnibus-banner", schema);
        const lees = (n) => beeld[beeldNaam(n, schema)] ?? readFileSync(path.join(uit, `${beeldNaam(n, schema)}.png`));
        const kader = await browser.newPage({ viewport: { width: BANNER.breed, height: BANNER.hoog }, deviceScaleFactor: 2 });
        await kader.setContent(bannerHtml({ schema, lettertypen, voor: lees("stap-2-verzamel"), achter: lees("stap-4-exporteer") }), { waitUntil: "load" });
        await kader.evaluate(() => document.fonts.ready);
        const doel = path.join(uit, `${naam}.png`);
        await kader.screenshot({ path: doel });
        await kader.close();
        verklein(doel);
        gemaakt.push(`${naam}.png`); console.log(`✓ ${naam}.png`);
      }
    }
    if (wil("rondleiding")) {
      for (const schema of ["light", "dark"]) {
        const { context, pagina, fouten } = await nieuwePagina(browser, schema, adres + "#begin");
        const opname = [];
        for (const scene of SCENES) {
          await scene.doe(pagina);
          opname.push({ ...scene, beeld: await pagina.screenshot() });
          if (schema === "dark") break; // donker: alleen het stilstaande beeld
        }
        await context.close();
        if (fouten.length) throw new Error(`Browserfout in de rondleiding: ${fouten[0]}`);
        const totaal = SCENES.reduce((n, s) => n + s.duur, 0);
        const kader = await browser.newPage({ viewport: { width: BREED, height: HOOG + 138 } });
        // Het stilstaande beeld: het begin van de rondleiding, waarvandaan je de animatie opent.
        const stil = path.join(uit, `${beeldNaam("rondleiding", schema)}.png`);
        await kader.setContent(rondleidingHtml({ ...opname[0], uitleg: "Rondleiding van 25 seconden: de vier stappen van Omnibus", voortgang: 0, schema, speel: true }));
        await kader.screenshot({ path: stil });
        verklein(stil);
        gemaakt.push(path.basename(stil)); console.log(`✓ ${path.basename(stil)}`);
        if (schema === "light") {
          const beelden = [];
          let teller = 0;
          for (const s of opname) for (let i = 0; i < s.duur; i++) {
            await kader.setContent(rondleidingHtml({ ...s, voortgang: ++teller / totaal }));
            beelden.push(await kader.screenshot());
          }
          if (maakGif(beelden, path.join(uit, "rondleiding.gif"))) { gemaakt.push("rondleiding.gif"); console.log(`✓ rondleiding.gif (${beelden.length} beelden)`); }
        }
        await kader.close();
      }
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
