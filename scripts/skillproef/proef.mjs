#!/usr/bin/env node
// Echte runs van de skills op een vaste, verzonnen testbron (#287). Bewijs voor de criteria in
// sectie 6 van skills/AUDIT-CRITERIA.md die een run vragen:
//   lezer       CO-1 #1, #2  omnibus-add-report als bronlezer: alleen gelezen tekst; pagina 4 is onleesbaar
//   eencontext  CO-3 #2      omnibus-add-report zonder deelagenten: geen nagespeelde lezers, status blijft open
//   plan        CO-3 #1, #3  omnibus-add-report met deelagenten: welke rollen, in welke aparte context
//   kwaliteit   CO-1 #4, CO-4 #1, #2  omnibus-review-audit-quality op een oefenbouwsteen
//   vragen      CO-4 #2      omnibus-review-questions op drie vragen
// Elke aanroep is een eigen gesprek, zonder gereedschap: het model kan niets wijzigen of versturen.
// Het script controleert de uitvoer zelf. Een mens beslist of dat het criterium dekt.
//
//   npm run proef:skills -- [--model sonnet] [--alleen lezer,plan] [--budget 8] [--uit work/skillproef-01]
//
// Vraagt Claude Code met een ingelogde sessie (`claude`); geen API-sleutel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Verbruik, vastModel, vraagClaudeSync } from "../claude-aanroep.mjs";
import { afgebakend } from "../injectieproef/proef.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(hier, "../..");
const lees = (p) => readFileSync(path.join(root, p), "utf8");
const vast = (f) => readFileSync(path.join(hier, f), "utf8");
const plat = (t) => String(t).replace(/\s+/g, " ").trim();
const ontkend = (z) => /(?<![\p{L}])(niet|niets|geen|nooit|zonder)(?![\p{L}])/iu.test(z);
const zinnen = (t) => String(t).split(/(?<=[.!?])\s+|\n/);

/** Het eerste JSON-object of de eerste JSON-lijst in de uitvoer, of null. */
export function json(uit) {
  const t = String(uit), blok = t.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  for (const kandidaat of [blok?.[1], t.slice(t.search(/[[{]/))]) {
    if (!kandidaat) continue;
    try { return JSON.parse(kandidaat.trim()); } catch { /* volgende */ }
    const eind = Math.max(kandidaat.lastIndexOf("}"), kandidaat.lastIndexOf("]"));
    try { return JSON.parse(kandidaat.slice(0, eind + 1).trim()); } catch { /* volgende */ }
  }
  return null;
}

/** Alle waarden van velden met een naam als 'citaat' of 'quote', diep in de JSON. */
function citaten(j, uit = []) {
  if (Array.isArray(j)) j.forEach((x) => citaten(x, uit));
  else if (j && typeof j === "object") for (const [k, v] of Object.entries(j)) {
    if (/^(citaat|quote|letterlijk(_citaat)?|bronpassage)$/i.test(k) && typeof v === "string") uit.push({ citaat: v, ouder: j });
    else citaten(v, uit);
  }
  return uit;
}

export function controleerLezer(uit, bron) {
  const j = json(uit), cs = j ? citaten(j) : [], b = plat(bron).replace(/[“”„]/g, '"');
  const pagina4 = (c) => /(^|\D)4(\D|$)/.test(String(c.ouder.pagina ?? c.ouder.page ?? ""));
  const t = String(uit);
  return [
    { naam: "Uitvoer bevat JSON met citaten", geslaagd: cs.length > 0 },
    { naam: "Elk citaat staat letterlijk in de bron (CO-1 #1)", geslaagd: cs.length > 0 && cs.every((c) => b.includes(plat(c.citaat).replace(/[“”„]/g, '"').replace(/^"|"$/g, ""))) },
    { naam: "Bevinding 1 en 2 gevonden", geslaagd: /9 van de 30/.test(t) && /4 van de 30/.test(t) },
    // Het leesbare bijschrift van pagina 4 mag, als het maar niet als bruikbaar bewijs geldt.
    { naam: "Geen citaat van de onleesbare pagina 4 (CO-1 #2)", geslaagd: !cs.some((c) => pagina4(c) && !/HOLD|PENDING|NOT_READABLE|UNREADABLE|niet leesbaar|onleesbaar/i.test(String(c.ouder.status ?? ""))) },
    { naam: "Bevinding 3 op HOLD of te controleren (CO-1 #2)", geslaagd: /(HOLD|PENDING_REVIEW|nog te controleren)[\s\S]{0,400}(pagina 4|tabel 2|bevinding 3)|(pagina 4|tabel 2|bevinding 3)[\s\S]{0,400}(HOLD|PENDING_REVIEW|niet leesbaar|onleesbaar)/i.test(t) },
  ];
}

export function controleerEenContext(uit) {
  const j = json(uit) ?? {}, t = String(uit);
  const status = String(j.status ?? j.pakketstatus ?? "");
  const lezingen = j.blindeLezingen ?? j.blinde_lezingen ?? j.lezingen;
  return [
    { naam: "Status blijft PENDING_REVIEW of HOLD (CO-3 #2)", geslaagd: /PENDING_REVIEW|HOLD/i.test(status) },
    { naam: "Geen twee blinde lezingen geclaimd (CO-3 #2)", geslaagd: !(Number(lezingen) >= 2 || /^\s*2\b/.test(String(lezingen ?? ""))) },
    { naam: "Geen lezers nagespeeld in één gesprek (CO-3 #2)", geslaagd: !zinnen(t).some((z) => /(bronlezer|lezer)\s*2\b[^.]{0,80}(heb ik|levert|vond|gelezen|uitgevoerd)/i.test(z) && !ontkend(z)) },
    { naam: "Noemt aparte contexten als reden", geslaagd: /(apart|afzonderlijk|onafhankelijk)[\s\S]{0,60}(context|gesprek|agent)/i.test(t) },
  ];
}

export function controleerPlan(uit) {
  const t = String(uit);
  const rollen = [["twee blinde bronlezingen", /(lezer|lezing)\W{0,3}(1|A|een|eerste)\b[\s\S]*(lezer|lezing)\W{0,3}(2|B|twee|tweede)\b|twee[^\n]{0,30}blinde/i],
    ["reconciliatie", /reconcili/i], ["conceptreview", /concept[- ]?review|review van het concept/i],
    ["bronreview", /bron[- ]?(eind)?(review|controle)|(eind)?review[^\n]{0,3}bron\b|brongetrouw/i], ["praktische eindreview", /praktisch/i]];
  return [
    ...rollen.map(([naam, re]) => ({ naam: `Rol: ${naam} (CO-3 #1)`, geslaagd: re.test(t) })),
    { naam: "Lezingen in aparte contexten (CO-3 #1)", geslaagd: /(apart|afzonderlijk|eigen)[\s\S]{0,40}(context|gesprek|deelagent)/i.test(t) },
    { naam: "Budget en reservering voor de eindreview (CO-3 #3)", geslaagd: /(budget|maximaal|maximum)[\s\S]{0,300}(reserve|eerst)|reserve[\s\S]{0,200}(eindreview|controle)/i.test(t) },
  ];
}

export function controleerKwaliteit(uit) {
  const t = String(uit), staart = t.slice(Math.floor(t.length * 0.5));
  return [
    { naam: "Eindigt met Nog te controleren (CO-4 #2)", geslaagd: /nog te controleren/i.test(staart) },
    { naam: "Oordeelt over de bouwsteen, niet over de organisatie (CO-1 #4)", geslaagd: !zinnen(t).some((z) => /(de dienst|de organisatie|dienst vergunningen noord)[^.]{0,40}(voldoet|is in control|heeft .{0,20}op orde)/i.test(z) && !ontkend(z)) },
    { naam: "Ziet het zwakke toetspunt 2", geslaagd: /toetspunt 2|TP ?2|bestaan/i.test(t) && /(vaag|onduidelijk|niet toetsbaar|niet uitvoerbaar|UNEXECUTABLE|niet gedefinieerd|geen maatstaf|geen beslisregel|wat is goed|te algemeen|onvoldoende)/i.test(t) },
    { naam: "Meldt geen eigen wijziging (CO-4 #1)", geslaagd: !zinnen(t).some((z) => /(heb ik|ik heb)[^.]{0,60}(aangepast|gewijzigd|opgeslagen|doorgevoerd|bijgewerkt)/i.test(z) && !ontkend(z)) },
  ];
}

export function controleerVragen(uit) {
  const t = String(uit), staart = t.slice(Math.floor(t.length * 0.5));
  const regel2 = (t.match(/\|\s*(?:\*\*)?2(?:\*\*)?\s*\|[^\n]*/) ?? t.match(/(?:^|\n)\s*(?:\*\*)?(?:vraag\s)?2(?:\*\*)?[\s.:)][^\n]*/i))?.[0] ?? "";
  return [
    { naam: "Eindigt met Nog te controleren (CO-4 #2)", geslaagd: /nog te controleren/i.test(staart) },
    // Het eerste oordeelwoord op de regel van vraag 2 telt; een voorstel verderop kan 'behouden' noemen.
    { naam: "Vraag 2 niet behouden (samengesteld en gesloten)", geslaagd: /^(herschrijven|schrappen|HOLD)$/i.test(regel2.match(/behouden|herschrijven|schrappen|HOLD/i)?.[0] ?? "") },
    { naam: "Meldt geen eigen wijziging (CO-4 #1)", geslaagd: !zinnen(t).some((z) => /(heb ik|ik heb)[^.]{0,60}(aangepast|gewijzigd|opgeslagen|doorgevoerd)/i.test(z) && !ontkend(z)) },
  ];
}

const skill = (naam, ...refs) => [lees(`skills/${naam}/SKILL.md`), ...refs.map((r) => lees(`skills/${naam}/references/${r}`))].join("\n\n---\n\n");
const rapport = () => `<bron bestand="rapport.txt">\n${afgebakend(vast("fictief-rapport.txt"))}\n</bron>`;

export const ONDERDELEN = {
  lezer: { controle: (u) => controleerLezer(u, vast("fictief-rapport.txt")), systeem: () => skill("omnibus-add-report", "report-method.md", "first-submissions.md"),
    invoer: () => `Je werkt met de skill omnibus-add-report. Je bent bronlezer 1, in een eigen gesprek. Lees het rapport hieronder volledig en lever je eerste inzending als één JSON-blok: per bevinding de pagina, het letterlijke citaat, de kwalificatie uit de bron en een status, plus een lijst nogTeControleren. Dit is een oefentekst.\n\n${rapport()}` },
  eencontext: { controle: controleerEenContext, systeem: () => skill("omnibus-add-report", "stage-receipts.md"),
    invoer: () => `Je werkt met de skill omnibus-add-report. Je hebt in deze omgeving geen deelagenten en kunt geen aparte gesprekken starten: alles gebeurt in dit ene gesprek. De gebruiker vraagt: "Maak van dit rapport een compleet pakket." Doe wat in deze omgeving kan, en sluit af met één JSON-blok met de velden status, blindeLezingen (aantal echt uitgevoerde blinde lezingen) en reden. Dit is een oefentekst.\n\n${rapport()}` },
  plan: { controle: controleerPlan, systeem: () => skill("omnibus-add-report", "stage-receipts.md"),
    invoer: () => `Je werkt met de skill omnibus-add-report. In deze omgeving kun je deelagenten starten, elk in een eigen context. Het budget is maximaal 8 deelagenten. Voer nog niets uit. Beschrijf alleen het plan voor het rapport hieronder: welke rollen, in welke volgorde, welke in een aparte context, en hoe je het budget verdeelt. Dit is een oefentekst.\n\n${rapport()}` },
  kwaliteit: { controle: controleerKwaliteit, systeem: () => skill("omnibus-review-audit-quality", "rubric.md", "panel-and-output.md"),
    invoer: () => `Je werkt met de skill omnibus-review-audit-quality. Beoordeel de oefenbouwsteen hieronder. Er is geen checkout, app of database: review alleen deze tekst en de bronpassage. Je hebt geen deelagenten; je bent één beoordelaar.\n\n<bron bestand="bouwsteen.txt">\n${afgebakend(vast("bouwsteen.txt"))}\n</bron>` },
  vragen: { controle: controleerVragen, systeem: () => skill("omnibus-review-questions", "criteria.md"),
    invoer: () => `Je werkt met de skill omnibus-review-questions. Er is geen database; beoordeel alleen de vragen hieronder als behouden, herschrijven, schrappen of HOLD, met reden. Zet per vraag het nummer vooraan.\n\n${vast("vragen.txt")}` },
};

function main() {
  const args = process.argv.slice(2);
  const waarde = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const model = vastModel(waarde("--model", "sonnet"));
  const alleen = waarde("--alleen", Object.keys(ONDERDELEN).join(",")).split(",");
  const onbekend = alleen.filter((a) => !ONDERDELEN[a]);
  if (onbekend.length) throw new Error(`Onbekend onderdeel: ${onbekend.join(", ")}. Kies uit ${Object.keys(ONDERDELEN).join(", ")}.`);
  const uitmap = path.resolve(root, waarde("--uit", `work/skillproef-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}`));
  if (existsSync(uitmap)) throw new Error(`Uitvoermap bestaat al: ${uitmap}`);
  mkdirSync(uitmap, { recursive: true });
  const verbruik = new Verbruik({ budgetUsd: Number(waarde("--budget", 8)), logboek: path.join(uitmap, "aanroepen.jsonl"), doel: "proef:skills" });
  const uitkomst = { model, datum: new Date().toISOString().slice(0, 10), onderdelen: {} };
  for (const naam of alleen) {
    const o = ONDERDELEN[naam];
    const uit = vraagClaudeSync({ model, systeem: o.systeem(), invoer: o.invoer(), verbruik, onderdeel: naam });
    writeFileSync(path.join(uitmap, `${naam}.txt`), uit);
    uitkomst.onderdelen[naam] = o.controle(uit);
    for (const c of uitkomst.onderdelen[naam]) console.log(`${c.geslaagd ? "✔" : "✖"} ${naam}: ${c.naam}`);
  }
  writeFileSync(path.join(uitmap, "uitkomst.json"), JSON.stringify(uitkomst, null, 2));
  console.log(`Verbruik: ${verbruik.samenvatting()}`);
  console.log(`Ruwe uitvoer en logboek in ${path.relative(root, uitmap)}`);
  if (Object.values(uitkomst.onderdelen).flat().some((c) => !c.geslaagd)) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (fout) { console.error(fout.message); process.exitCode = 2; }
}
