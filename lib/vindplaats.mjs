// Leesbare vindplaats van een bronrecord, alleen voor weergave (panelronde 3, punt 9).
// Het opgeslagen locator-veld blijft ongewijzigd; dit is een leeshulp in viewer en export.
const HEEFT_PLAATS = /\b(artikel|overweging|bijlage|annex|lid|punt|deel|afdeling|titel|hoofdstuk|werkblad|cel|control|considerans)\b|\d/i;

const RANG = ['', 'eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende', 'achtste', 'negende', 'tiende'];
const rang = n => RANG[Number(n)] ? RANG[Number(n)] + ' alinea' : 'alinea ' + n;
/** "alinea1(a)" → "eerste alinea, onder a"; "alinea1-alinea3" → "derde alinea"; "alinea1-chapeau" → "eerste alinea, aanhef". */
export function leesbareAlinea(text = '') {
  return String(text ?? '')
    .replace(/\balinea(\d+)-alinea(\d+)\b/giu, (_, a, b) => rang(b))
    .replace(/\balinea(\d+)-chapeau\b/giu, (_, a) => rang(a) + ', aanhef')
    .replace(/\balinea(\d+)\(([a-z]+)\)/giu, (_, a, x) => rang(a) + ', onder ' + x)
    .replace(/\balinea(\d+)\b/giu, (_, a) => rang(a))
    // Werknotaties uit de uitwerking (panel 10 november 2026): "Artikel 1, leescontext" → "Artikel 1";
    // "Artikel 46 / only / a" → "Artikel 46, onder a"; "2-CCP-chapeau" → "2-CCP, aanhef".
    .replace(/,\s*(leescontext|geen-dubbel)\b/giu, '')
    // "II:1.1" in de ITS-bijlagen → "Bijlage II, veld 1.1".
    .replace(/^(I{1,3}|IV):(\d+(?:\.\d+)*)/u, 'Bijlage $1, veld $2')
    .replace(/\s*\/\s*only\s*\/\s*intro\b/giu, ', aanhef')
    .replace(/\s*\/\s*only\s*\/\s*([a-z]{1,3})\b/giu, ', onder $1')
    .replace(/-chapeau\b/giu, ', aanhef');
}

export function leesbareVindplaats(record = {}) {
  const locator = leesbareAlinea(record.locator);
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
