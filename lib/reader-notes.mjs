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
