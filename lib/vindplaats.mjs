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
    .replace(/[, ]\s*(leescontext|geen-dubbel)\b/giu, '')
    // "II:1.1" in de ITS-bijlagen → "Bijlage II, veld 1.1".
    .replace(/^(I{1,3}|IV):(\d+(?:\.\d+)*)/u, 'Bijlage $1, veld $2')
    .replace(/\s*\/\s*only\s*\/\s*intro\b/giu, ', aanhef')
    .replace(/\s*\/\s*only\s*\/\s*([a-z]{1,3})\b/giu, ', onder $1')
    .replace(/-chapeau\b/giu, ', aanhef');
}

/** Werknotaties van de makers in gewone schrijfwijze (10 november 2026). Alleen patronen waarvan de betekenis
 * uit de notatie zelf volgt; alles wat daar niet op past, blijft staan zoals het is opgeslagen. */
export function zonderWerknotatie(text = '') {
  const n = v => String(Number(v));
  return String(text ?? '')
    // "X / X" (zelfde aanduiding twee keer)
    .replace(/^(.+?) \/ \1$/u, '$1')
    // "Artikel 45 / 1", "Artikel 50 / 2 / a", "Artikel 50 / 4 / intro", "Artikel 53 / only"
    .replace(/^(Artikel \d+[a-z]?) \/ only$/iu, '$1')
    .replace(/^(Artikel \d+[a-z]?) \/ (\d+) \/ intro$/iu, '$1, lid $2, aanhef')
    .replace(/^(Artikel \d+[a-z]?) \/ (\d+) \/ ([a-z]{1,2})$/iu, '$1, lid $2, onder $3')
    .replace(/^(Artikel \d+[a-z]?) \/ (\d+)$/iu, '$1, lid $2')
    // "Artikel 12 lid 3 / sensitive": Engelstalig werkwoord achter de vindplaats
    .replace(/^(Artikel \d+[a-z]?(?:,? lid \d+)?) \/ [a-z]+$/iu, '$1')
    // "DORA-CONTEXT-28-3", "DORA-RECITAL-76", "DORA:31.11"
    .replace(/^DORA-CONTEXT-(\d+)-(\d+)$/u, 'DORA, artikel $1, lid $2')
    .replace(/^DORA-CONTEXT-(\d+)(?:-[\d-]+)?$/u, 'DORA, artikel $1')
    .replace(/^DORA-RECITAL-(\d+)$/u, 'DORA, overweging $1')
    .replace(/^DORA:(\d+)\.(\d+)$/u, 'DORA, artikel $1, lid $2')
    // "NL:33.002", "NL:41.001-002", "DORA_EN:031.005"
    .replace(/^NL:(\d+)\.(\d+)-(\d+)$/u, (_, a, b, c) => `Artikel ${n(a)}, lid ${n(b)} ${Number(c) - Number(b) === 1 ? 'en' : 'tot en met'} ${n(c)}`)
    .replace(/^NL:(\d+)\.(\d+)$/u, (_, a, b) => `Artikel ${n(a)}, lid ${n(b)}`)
    .replace(/^DORA_EN:(\d+)\.(\d+)$/u, (_, a, b) => `DORA, artikel ${n(a)}, lid ${n(b)} (Engelse tekst)`)
    .replace(/^FEES_EN:art_(\d+)$/u, 'Artikel $1 (Engelse tekst)')
    .replace(/^\/\/\*\[@id='art_(\d+)'\]$/u, 'Artikel $1')
    // Richtsnoeren: "NL:GL36-6-2-b:1", "NL:GL36-6-1:1", "NL:GL36-FN04:1", "NL:GL34-C-G6-A:1", "EN:6.1", "EN:FN4"
    .replace(/^NL:GL\d+-FN0*(\d+):\d+$/u, 'Voetnoot $1')
    .replace(/^NL:GL\d+-ANN-(\d+)-(\d+)(?:-([a-z]))?\d*:\d+$/u, (_, a, b, x) => `Bijlage, punt ${a}.${b}` + (x ? `, onder ${x}` : ''))
    .replace(/^NL:GL\d+-(\d+)-(\d+)-([a-z])\d*:\d+$/u, 'Richtsnoer $1.$2, onder $3')
    .replace(/^NL:GL\d+-(\d+)-(\d+):\d+$/u, 'Richtsnoer $1.$2')
    .replace(/^NL:GL\d+-C-G(\d+)-([A-Z]):\d+$/u, (_, a, x) => `Richtsnoer ${a}, onder ${x.toLowerCase()}`)
    .replace(/^NL:GL\d+-C-G(\d+):\d+$/u, 'Richtsnoer $1')
    .replace(/^EN:FN(\d+)$/u, 'Voetnoot $1 (Engelse tekst)')
    .replace(/^EN:(\d+(?:\.\d+)?)(?:-cont)?$/u, 'Punt $1 (Engelse tekst)')
    .replace(/^ITS302:ITS302-R-(I{1,3}|IV)-(\d+\.\d+):\d+$/u, 'ITS 2025/302, bijlage $1, veld $2')
    .replace(/^ITS:B(\d\d)\.(\d\d)\.(\d{4})$/u, 'ITS 2024/2956, B_$1.$2.$3')
    // "artikel 3, 1-q1", "artikel 10-q1": genummerde passage binnen een lid of artikel
    .replace(/^(artikel \d+[a-z]?), (\d+)-q(\d+)$/iu, '$1, lid $2 (passage $3)')
    .replace(/^(artikel \d+[a-z]?)-q(\d+)$/iu, '$1 (passage $2)')
    // "Art. 5(1)(a) → 2014/59/EU 10(7)(c)", "Artikel 34(1), ICT-clausule"
    .replace(/\bArt\. (?=\d)/gu, 'Artikel ')
    .replace(/^Artikel(?=\d)/u, 'Artikel ')
    // alleen een enkel, eenduidig "N(M)" of "N(M)(x)" direct na "Artikel" of na een richtlijnnummer; opsommingen als "2(2),(4)" blijven staan
    .replace(/→ (\d{4}\/\d+\/E[GU]) (?=\d)/gu, '→ Richtlijn $1, artikel ')
    .replace(/((?:^A|, a)rtikel )(\d+[a-z]?)\((\d+)\)\(([a-z]{1,2})\)(?=$|[,:; ])(?![,;]\()/gu, '$1$2, lid $3, onder $4')
    .replace(/((?:^A|, a)rtikel )(\d+[a-z]?)\((\d+)\)(?=$|[,:; ])(?![,;-]\()/gu, '$1$2, lid $3')
    .replace(/: bijwerken met onzekere doelverwijzing$/u, ': bijwerken van de risicobeoordeling');
}

export function leesbareVindplaats(record = {}) {
  const locator = zonderWerknotatie(leesbareAlinea(record.locator));
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
