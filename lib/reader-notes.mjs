// Welke werknotities uit de uitwerking de lezer van een toetspunt te zien krijgt (B-035).
// Een notitie die bij vijf of meer toetspunten van dezelfde bron letterlijk terugkomt, is een
// standaardzin van de uitwerking ("geen extra zelfstandige plicht"), geen uitleg bij dit
// toetspunt. Die blijft in het bewijsdossier en de export, maar niet in de viewer.
// Selectiereden, splitsingsreden en de herleiding van een bronkoppeling (`explanation`) zijn
// werknotities en staan nooit in de viewer. Ze blijven in de Excel-export als herleiding.

export const HERHALING = 5;

/** Teksten die in deze lijst HERHALING keer of vaker voorkomen. */
export function standaardzinnen(teksten, min = HERHALING) {
  const aantal = new Map();
  for (const t of teksten) if (t) aantal.set(t, (aantal.get(t) ?? 0) + 1);
  return new Set([...aantal].filter(([, n]) => n >= min).map(([t]) => t));
}

/** Alle notities van een bronpakket die de viewer bij een toetspunt kan tonen. */
export function pakketNotities(points = [], records = []) {
  return [
    ...points.flatMap((p) => (p.source_links ?? []).map((l) => l.explanation)),
    ...records.flatMap((r) => r.interpretation_notes ?? []),
  ];
}

/** De notities die iets zeggen over dit toetspunt. */
export function lezersnotities(teksten = [], standaard = new Set()) {
  return [...new Set(teksten.filter((t) => typeof t === "string" && t.trim() && !standaard.has(t)))];
}

/** Werknotities in de opgeslagen broncontext van een toetspunt (#306). */
const KOPPELING = /^(PRIMARY|SUPPORTING|CONTEXT|DEFINITION|SCOPE|EXCEPTION|CONDITION)\s·\s/u;
const FASEGRENS = /^(opzet|bestaan|werking)\s·\s/u;
const FASENAAM = {opzet: "Grens bij opzet: ", bestaan: "Grens bij bestaan: ", werking: "Grens bij werking: "};
const ROLCODE = /\s\((?:[A-Z][A-Z0-9]*_)+[A-Z0-9]+\)/gu;

/**
 * Broncontext zoals de lezer haar in de export ziet. Haalt de herleiding van bronkoppelingen
 * en rolcodes zoals `(NORM_ADDRESSEE)` weg. De grens per fase blijft, met een leesbaar label:
 * dat is inhoudelijke afbakening, geen werknotitie. Toepassing, adressaten, voorwaarden,
 * uitzonderingen en beperkingen blijven. De volledige tekst blijft in de bronherleiding.
 */
// Vaste rolzinnen van de makers achter een adressaat ("Financiële entiteit — Zie normscope en puntvoorwaarden.").
// Ze zeggen niets over dit toetspunt; de naam van de adressaat blijft staan (panel 11 november 2026).
const ROLZIN = new RegExp(" — (?:" + [
  "Rolbeschrijving uit de beoordeelde NOREA-uitwerking; heeft niet automatisch de wettelijke plicht\\.?",
  "Zie (?:gekoppelde )?(?:norm)?scope en puntvoorwaarden\\.?",
  "artikel 16, lid 1, DORA; zie normscope en puntvoorwaarden\\.?",
  "Toepasselijkheid volgens gekoppelde norm en hier vermelde voorwaarden\\.?",
  "Borgt de beschreven beleidsinhoud en eigen handelingen binnen toepasselijke scope\\.?",
  "Object van beoordeling of contractpartij; contractueel beschreven taken zijn geen ongeclausuleerde zelfstandige RTS-plicht\\.?",
  "NOREA-addressee; legal applicability separately determined\\.?",
  "(?:Legal applicability separately determined\\. — |Wettelijke toepasselijkheid afzonderlijk vaststellen\\. — )?wie de plicht heeft volgens NOREA\\.?",
  "Wie de plicht heeft volgens de NOREA-control\\.?",
].join("|") + ")$", "u");

export function lezersbroncontext(tekst = "") {
  return tekst.split(/\n{2,}/u)
    .filter((alinea) => !KOPPELING.test(alinea))
    .map((alinea) => alinea.replace(FASEGRENS, (_, fase) => FASENAAM[fase]).replace(ROLCODE, "").replace(ROLZIN, ""))
    .join("\n\n").trim();
}

/** Haalt het werkvoorvoegsel `Voorstel:` voor een beheersdoelstelling weg. */
export const zonderVoorstel = (tekst = "") => tekst.replace(/^\s*Voorstel\s*:\s*/iu, "");
