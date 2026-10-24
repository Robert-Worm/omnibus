// Voorcontrole op vraagkwaliteit: vindt vormfouten die een vraag altijd ongeschikt maken.
// De inhoudelijke beoordeling (past de vraag bij de bron, het doel en de respondent?) doet
// de skill omnibus-review-questions. Deze controle keurt dus nooit inhoudelijk goed:
// zonder vormfout is de uitkomst 'door' (door naar de inhoudelijke beoordeling).
//
// Uitkomsten, van zwaar naar licht: schrappen, herschrijven, HOLD, door.

export const SOORTEN = ["interview", "doorvraag", "toetsvraag", "onderzoeksvraag"];
export const UITKOMSTEN = ["schrappen", "herschrijven", "HOLD", "door"];

const ZWAARTE = Object.fromEntries(UITKOMSTEN.map((u, i) => [u, i]));
const woorden = (t) => t.split(/\s+/).filter(Boolean).length;

/** Maximaal aantal woorden per soort vraag (een interviewvraag moet je hardop kunnen stellen). */
export const MAX_WOORDEN = { interview: 30, doorvraag: 25, toetsvraag: 35, onderzoeksvraag: 40 };

// Gesloten opening: uitnodigt tot ja of nee. "Kunt u beschrijven/vertellen/toelichten" is
// een beleefde open vraag en telt niet mee.
const GESLOTEN = /^(is|zijn|was|waren|heeft|hebben|had|wordt|worden|werd|kan|kunnen|mag|moet|bestaat|bestaan|vindt|weet|gebeurt|doet)\s/i;
const BELEEFD_OPEN = /^(kunt|kan|zou)\s+u\s+(\S+\s+)?(beschrijven|vertellen|toelichten|uitleggen|schetsen|aangeven|laten zien)/i;
// Sturend: legt een mening of antwoord in de mond.
const STUREND = [
  /\b(bent|ben|is|zijn)\s+(u|je|jij)\s+het\s+(er)?(mee)?\s*eens\b/i,
  /\b(vindt|vind)\s+(u|je)\s+(ook\s+)?niet\b/i,
  /\b(toch|natuurlijk|uiteraard|vanzelfsprekend)\b/i,
  /\bhoe\s+goed\b/i,
  /\bwaarom\s+(faalt|mislukt|ontbreekt|schiet)\b/i,
];
// Toetsinstructie geschreven als vraag: begint met een opdracht aan de auditor.
const OPDRACHT = /^(beoordeel|controleer|stel vast|inspecteer|vergelijk|lees|volg|ga na|toets|bepaal|baken|leg vast|verifieer|zie)\b/i;
// Technische resten die een lezer niet hoort te zien.
const TECHNISCH = [
  [/\b[A-Z][A-Z0-9]{1,8}-[A-Z]{1,3}-[A-Z0-9-]+\b/, "bevat een technisch ID"],
  [/het toetspunt\s+[‘'"]/i, "noemt de titel van het toetspunt in plaats van het onderwerp"],
  [/\b(TODO|PROPOSED|INFERRED|undefined|null)\b/, "bevat een technische term"],
  [/\{\{(?!onderwerp\}\})[^}]*\}\}|\$\{[^}]*\}/, "bevat een onbekende invulplek"],
];
const SAMENGESTELD = /\S\s+(en|of)\s+((voor|bij|met|door|op|in|aan|van|over|tot)\s+)?(hoe|wat|welke|wie|waarom|wanneer|waar|waardoor|waarmee|waarop|in hoeverre)\b/i;
const LEEG =/^(vraag nog uit te werken|n\.?v\.?t\.?|-|\.\.\.|tbd)$/i;

function melding(uitkomst, regel, reden) { return { uitkomst, regel, reden }; }

/**
 * Voorcontrole van één vraag.
 * @param {string} tekst  de vraag zoals de gebruiker hem ziet
 * @param {string} soort  interview | doorvraag | toetsvraag | onderzoeksvraag
 * @returns {{uitkomst: string, meldingen: {uitkomst:string, regel:string, reden:string}[]}}
 */
export function voorcontrole(tekst, soort) {
  if (!SOORTEN.includes(soort)) throw Error(`Onbekende soort vraag: ${soort}`);
  const t = String(tekst ?? "").replace(/\s+/g, " ").trim();
  const m = [];
  if (!t || LEEG.test(t)) m.push(melding("schrappen", "leeg", "geen vraag, alleen een lege plek of opvultekst"));
  else {
    const vragen = (t.match(/\?/g) || []).length;
    if (OPDRACHT.test(t)) m.push(melding("herschrijven", "opdracht", "dit is een opdracht aan de auditor, geen vraag; hoort bij de toetsinstructie"));
    else if (!vragen) m.push(melding("HOLD", "geen-vraagteken", "geen vraagteken; nagaan of dit wel een vraag is"));
    if (vragen > 1 && soort !== "doorvraag") m.push(melding("herschrijven", "meer-vragen", `${vragen} vragen in één; stel één vraag tegelijk`));
    // Twee vragen in één zin: "Hoe ... en hoe ...?". In een interview altijd herschrijven;
    // in een toets- of onderzoeksvraag kan het één samenhangend onderwerp zijn: HOLD.
    if (vragen <= 1 && SAMENGESTELD.test(t))
      m.push(soort === "interview"
        ? melding("herschrijven", "samengesteld", "twee vragen in één zin; stel één vraag tegelijk")
        : melding("HOLD", "samengesteld", "twee vragen in één zin; nagaan of ze samen één onderwerp vormen"));
    if (soort === "interview" && GESLOTEN.test(t) && !BELEEFD_OPEN.test(t))
      m.push(melding("herschrijven", "gesloten", "gesloten vraag (ja/nee); een interviewvraag is open"));
    for (const p of STUREND) if (p.test(t)) { m.push(melding("herschrijven", "sturend", "sturende formulering; de vraag geeft het antwoord of een mening al mee")); break; }
    if (soort === "interview" && /\b(bijvoorbeeld|zoals)\b/i.test(t)) m.push(melding("HOLD", "voorbeeldantwoord", "noemt voorbeelden; nagaan of die het antwoord sturen"));
    for (const [p, reden] of TECHNISCH) if (p.test(t)) m.push(melding("herschrijven", "technisch", reden));
    // Doorvragen staan samen in één veld: elke vraag apart moet kort genoeg zijn.
    const delen = soort === "doorvraag" ? t.split(/(?<=\?)\s+/) : [t];
    const n = Math.max(...delen.map(woorden)), max = MAX_WOORDEN[soort];
    if (n > max) m.push(melding("herschrijven", "te-lang", `${n} woorden${delen.length > 1 ? " in één doorvraag" : ""}; houd het onder ${max + 1}`));
  }
  const uitkomst = m.reduce((u, x) => (ZWAARTE[x.uitkomst] < ZWAARTE[u] ? x.uitkomst : u), "door");
  return { uitkomst, meldingen: m };
}
