// Leesbare vindplaats van een bronrecord, alleen voor weergave (panelronde 3, punt 9).
// Het opgeslagen locator-veld blijft ongewijzigd; dit is een leeshulp in viewer en export.
const HEEFT_PLAATS = /\b(artikel|overweging|bijlage|annex|lid|punt|deel|afdeling|titel|hoofdstuk|werkblad|cel|control|considerans)\b|\d/i;

export function leesbareVindplaats(record = {}) {
  const locator = String(record.locator ?? '');
  // "artikel 4, 0(a)": artikel zonder genummerde leden.
  const zonderNul = locator
    .replace(/\b(artikel \d+[a-z]?), 0\(([a-z]+)\)/giu, '$1, onder $2')
    .replace(/\b(artikel \d+[a-z]?), 0\b/giu, '$1');
  if (HEEFT_PLAATS.test(zonderNul)) return zonderNul;
  const plaats = plaatsUitId(String(record.id ?? ''));
  return plaats ? (zonderNul ? `${plaats} · ${zonderNul}` : plaats) : zonderNul;
}

function plaatsUitId(id) {
  const overweging = id.match(/-(?:NL-)?REC-(\d+)$/u);
  if (overweging) return `Overweging ${Number(overweging[1])}`;
  const m = id.match(/-NL-A(\d+)(?:-(\d+))?(?:-(CHAPEAU|[A-Z]{1,2}))?(?:-[A-Z]{3,})*$/u);
  if (!m) return '';
  const [, artikel, lid, rest] = m;
  return [`Artikel ${Number(artikel)}`, lid && `lid ${Number(lid)}`,
    rest === 'CHAPEAU' ? 'aanhef' : rest && `onder ${rest.toLowerCase()}`].filter(Boolean).join(', ');
}
