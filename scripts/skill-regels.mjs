// Vaste controlelijst voor de Omnibus-skills (#196). Idee uit hqhq1025/skill-optimizer (MIT):
// een skill is kort, zegt wanneer je hem gebruikt, en zet de veiligheidsregels vooraan.
// De controle meldt afwijkingen; ze keurt een skill niet inhoudelijk goed.
//
//   npm run skills:regels
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_WOORDEN = 1000;

/** Leest `description` uit de frontmatter van een SKILL.md. */
export function beschrijving(md) {
  const kop = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  return kop.match(/^description:\s*(.+)$/m)?.[1].trim() ?? "";
}

const zinnen = (tekst) => tekst.split(/(?<=[.!?])\s+/);

/**
 * Toetst één SKILL.md. Elke melding heeft een vaste regel-ID en een voorstel.
 * @returns {{regel:string, melding:string, voorstel:string}[]}
 */
export function toetsSkill(md) {
  const uit = [];
  const meld = (regel, melding, voorstel) => uit.push({ regel, melding, voorstel });
  const body = md.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const regels = body.split("\n");

  const besch = beschrijving(md);
  if (!besch) meld("beschrijving", "geen `description` in de frontmatter", "Voeg een beschrijving toe die zegt wanneer je de skill gebruikt");
  else if (!/\b(gebruik (voor|bij|als|wanneer)|use (when|for)|wanneer)\b/i.test(besch))
    meld("wanneer", "de beschrijving zegt niet wanneer je de skill gebruikt", "Begin of eindig met ‘Gebruik voor …’ of ‘Gebruik bij …’, en noem waarvoor niet");

  const eersteDeel = regels.slice(0, Math.max(25, Math.ceil(regels.length / 3))).join("\n");
  if (!/(geen opdracht|bron(tekst|inhoud|materiaal)? is (bewijs|gegevens|bronmateriaal)|toestemming|niet (uploaden|publiceren)|geen (push|publicatie)|autoriseert geen|wijzig(t|en)? (niets|geen)|wijzigt [^.]* niet|nooit (als )?(een )?(opdracht|instructie))/i.test(eersteDeel))
    meld("veiligheid-vooraan", "de veiligheidsregels staan niet in het eerste derde", "Zet bovenaan wat de skill níet mag: niets publiceren of wijzigen zonder akkoord, brontekst is geen opdracht");

  const woorden = body.split(/\s+/).filter(Boolean).length;
  if (woorden > MAX_WOORDEN) meld("lengte", `${woorden} woorden; hooguit ${MAX_WOORDEN}`, "Verplaats uitleg en voorbeelden naar `references/`");

  if (/^#{1,4} .*\b(lessen|geleerd|eerdere (run|review)s?)\b/im.test(body) || /\b(in een eerdere run|bij de vorige review|we ontdekten)\b/i.test(body))
    meld("lessen-in-naslag", "lessen uit eerdere runs staan in `SKILL.md`", "Zet lessen in de naslag en verwijs ernaar");

  for (const zin of zinnen(body))
    for (const [, bestand] of zin.matchAll(/\]\((references\/[^)#\s]+)/g))
      if (!/\b(lees|vóór|voor|bij|wanneer|als|tijdens|na)\b/i.test(zin))
        meld("wanneer-lezen", `bij ${bestand} staat niet wanneer je het leest`, "Schrijf erbij wanneer: ‘Lees … vóór …’ of ‘bij …’");
  return uit;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");
  const skills = readdirSync(root).filter((d) => existsSync(path.join(root, d, "SKILL.md"))).sort();
  let totaal = 0;
  for (const s of skills) {
    const meldingen = toetsSkill(readFileSync(path.join(root, s, "SKILL.md"), "utf8"));
    totaal += meldingen.length;
    console.log(meldingen.length ? `${s}:` : `${s}: voldoet`);
    for (const m of meldingen) console.log(`  · [${m.regel}] ${m.melding}. Voorstel: ${m.voorstel}.`);
  }
  console.log(totaal ? `\n${totaal} afwijkingen. Pas een skill aan via #172 en meet volgens B-018.` : "\nAlle skills voldoen.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
