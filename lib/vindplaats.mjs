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
    // BRRD (Richtlijn 2014/59/EU): "BRRD-10-1-2", "BRRD-5-5-A", "BRRD-10-7-CHAPEAU", "BRRD-ANN-B13", "2014/59/EU bijlage B14 bis"
    .replace(/^BRRD-(\d+)-(\d+)-(\d+)$/u, (_, a, b, c) => `Richtlijn 2014/59/EU, artikel ${a}, lid ${b} ${Number(c) - Number(b) === 1 ? 'en' : 'tot en met'} ${c}`)
    .replace(/^BRRD-(\d+)-(\d+)-CHAPEAU$/u, 'Richtlijn 2014/59/EU, artikel $1, lid $2, aanhef')
    .replace(/^BRRD-(\d+)-(\d+)-([A-Z])$/u, (_, a, b, x) => `Richtlijn 2014/59/EU, artikel ${a}, lid ${b}, onder ${x.toLowerCase()}`)
    .replace(/^BRRD-(\d+)-(\d+)$/u, 'Richtlijn 2014/59/EU, artikel $1, lid $2')
    .replace(/^BRRD-ANN-([A-C])-CHAPEAU$/u, 'Richtlijn 2014/59/EU, bijlage, deel $1, aanhef')
    .replace(/^BRRD-ANN-([A-C])(\d+)$/u, 'Richtlijn 2014/59/EU, bijlage, deel $1, punt $2')
    .replace(/→ 2014\/59\/EU bijlage ([A-C])(\d+)( bis)?$/u, '→ Richtlijn 2014/59/EU, bijlage, deel $1, punt $2$3')
    .replace(/^Art\. (\d+)\((\d+)\)\(([a-z])\)\((i{1,3}|iv|v)\) →/u, 'Artikel $1, lid $2, onder $3, $4 →')
    // "Overweging 1 / Voortdurende samenwerking", "Artikel 5 lid 1 / bekwaamheid en zorg", "Toepassingsgebied / …"
    .replace(/^Overweging(\d+)/u, 'Overweging $1')
    .replace(/^(Artikel \d+[a-z]?) lid (\d+) \/ /u, '$1, lid $2 · ')
    .replace(/^(Overweging \d+|Toepassingsgebied) \/ /u, '$1 · ')
    .replace(/^Richtsnoer(\d+\.\d+)([a-z]) (\w+) bullet \/ /u, 'Richtsnoer $1, onder $2, $3 punt · ')
    // "Artikel 50 / 2 / b / i"
    .replace(/^(Artikel \d+[a-z]?) \/ (\d+) \/ ([a-z]) \/ (i{1,3}|iv|v|vi{1,3})$/iu, '$1, lid $2, onder $3, $4')
    // "artikel 35, 1-d-iv", "artikel 35, 3-al2-gelegenheid", "artikel 36, 2-aanhef-minimum"
    .replace(/^(artikel \d+[a-z]?), (\d+(?:-[a-z0-9]+)+)$/iu, (m, a, rest) => /-q\d+$/u.test(rest) ? m : `${a}, ${onderdelen(rest.split('-'), true)}`)
    // "Artikel 37, lid 2, e-notice", "Artikel 38, lid 3, penalty-notice", "Artikel 39, lid 5, exception-emergency"
    .replace(/^(Artikel \d+[a-z]?, lid \d+), ([a-z])-[a-z]+$/u, '$1, onder $2')
    .replace(/^(Artikel \d+[a-z]?, lid \d+), [a-z]{2,}(?:-[a-z]+)+$/u, '$1')
    // "Artikel 1, lid 2, onderdeel c-i", "Artikel 1 lid 1 e-i"
    .replace(/^(Artikel \d+[a-z]?),? lid (\d+),? (?:onderdeel )?([a-z])-(i{1,3}|iv|v|vi{1,3})$/u, '$1, lid $2, onder $3, $4')
    // TLPT: "Artikel 1 1)", "Artikel 2 lid 1 b viii 1)"
    .replace(/^(Artikel \d+[a-z]?) (\d+)\)$/u, '$1, punt $2')
    .replace(/^(Artikel \d+[a-z]?) lid (\d+) ((?:[a-z]+ )*\d+\))$/u, (_, a, l, rest) => `${a}, lid ${l}, ${onderdelen(rest.split(' '), false)}`)
    // "artikel 6, 2-tweede alinea", "artikel 11, 2-derde alinea, onder a", "artikel 16, 2-CCP, aanhef"
    .replace(/^(artikel \d+[a-z]?), (\d+)-((?:eerste|tweede|derde|vierde|vijfde) alinea)/iu, '$1, lid $2, $3')
    .replace(/^(artikel \d+[a-z]?), (\d+)-(CCP|CSD), aanhef$/iu, '$1, lid $2, aanhef ($3)')
    // "Artikel 5, lid 1 · continuous": één los Engels werkwoord van de maker is geen vindplaats
    .replace(/^(Artikel \d+[a-z]?, lid \d+) · [a-z]+$/u, '$1')
    // RTS 2024/1774: "artikel 3, eerste alinea, onder d(ii)(1)", "artikel 24, 1(b)(ii)(1)", "artikel 22 eerste alinea(d)"
    .replace(/, onder ([a-z])\((i{1,3}|iv|v|vi{1,3})\)\((\d+)\)$/u, ', onder $1, $2, $3')
    .replace(/^(artikel \d+[a-z]?), (\d+)\(([a-z])\)\((i{1,3}|iv|v|vi{1,3})\)\((\d+)\)$/iu, '$1, lid $2, onder $3, $4, $5')
    .replace(/ eerste alinea\(([a-z])\)$/u, ', eerste alinea, onder $1')
    // Richtsnoeren, contextpassages met een korte naam: "NL:GL36-9-3-remind:1", "NL:GL36-11-1-c3-secret:1", "NL:GL34-C-G5-OUTSIDE:1"
    .replace(/^NL:GL\d+-(\d+)-(\d+)-([a-z])\d+(?:-[a-z]+)*:\d+$/u, 'Richtsnoer $1.$2, onder $3')
    .replace(/^NL:GL\d+-(\d+)-(\d+)(?:-[a-z]+)+:\d+$/u, 'Richtsnoer $1.$2')
    .replace(/^NL:GL\d+-C-G(\d+)-[A-Z]{2,}(?:-[A-Z]+)*:\d+$/u, 'Richtsnoer $1')
    .replace(/^NL:GL\d+-C-FN(\d+):\d+$/u, 'Voetnoot $1')
    .replace(/^NL:GL\d+-(?:C-)?FRONT-[A-Z-]+:\d+$/u, 'Voorblad')
    .replace(/^NL:GL\d+-(?:C-)?ANN-[A-Z-]+:\d+$/u, 'Bijlage')
    .replace(/^NL:GL\d+-TITLE:\d+$/u, 'Titel').replace(/^NL:GL\d+-STATUS:\d+$/u, 'Status van de richtsnoeren')
    .replace(/^NL:GL\d+-APPLICATION:\d+$/u, 'Toepassingsdatum').replace(/^NL:GL\d+-NOTIFY-[A-Z]+:\d+$/u, 'Kennisgevingsplicht')
    .replace(/^EN:status-reporting$/u, 'Status van de richtsnoeren (Engelse tekst)').replace(/^EN:annex-[a-z]+$/u, 'Bijlage (Engelse tekst)')
    .replace(/^EN:(\d+\.\d+)([a-z])-[a-z]+$/u, 'Punt $1, onder $2 (Engelse tekst)').replace(/^EN:(\d+\.\d+)-[a-z]+$/u, 'Punt $1 (Engelse tekst)')
    // interne verwijzing naar een aanvullende passage
    .replace(/^(?:finding|supp):.+$/u, 'Aanvullende passage uit de bron')
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

// Sectorverordeningen die DORA wijzigt: de korte notatie van de makers ("2(2),(4)") uitgeschreven per bronrecord.
// Met de hand opgesteld uit de notatie en de eerste regel van het citaat (11 november 2026).
const SECTORWET = {CRA: 'Verordening (EG) nr. 1060/2009', EMIR: 'Verordening (EU) nr. 648/2012', CSDR: 'Verordening (EU) nr. 909/2014', BMR: 'Verordening (EU) 2016/1011'};
const SECTORPLAATS = {
  'DORA-SECTOR-CRA-SCOPE': 'artikel 2, lid 1', 'DORA-SECTOR-CRA-EXCEPT': 'artikel 2, lid 2 en 4',
  'DORA-SECTOR-CRA-DEFINITION': 'artikel 3, lid 1, onder a en b, en lid 2', 'DORA-SECTOR-CRA-ANNEX-BINDING': 'artikel 6, lid 2',
  'DORA-SECTOR-CRA-SMALL-EXEMPTION': 'artikel 6, lid 3', 'DORA-SECTOR-CRA-THIRD-COUNTRY-EXEMPTION': 'artikel 5, lid 1 en 4',
  'DORA-SECTOR-CRA-ENDORSEMENT': 'artikel 4, lid 3, onder b, en lid 4 en 5',
  'DORA-SECTOR-EMIR-SCOPE': 'artikel 1, lid 1 en 2', 'DORA-SECTOR-EMIR-EXCEPT4': 'artikel 1, lid 4', 'DORA-SECTOR-EMIR-EXCEPT5': 'artikel 1, lid 5',
  'DORA-SECTOR-EMIR-DEFINITIONS': 'artikel 2, punt 1 en 2', 'DORA-SECTOR-EMIR-EU-CCP': 'artikel 14, lid 1 en 4',
  'DORA-SECTOR-EMIR-TIER2': 'artikel 25, lid 2 ter, onder a, en artikel 25 bis, lid 1 en 2', 'DORA-SECTOR-EMIR-TR-REGISTRATION': 'artikel 55, lid 1 tot en met 4',
  'DORA-SECTOR-EMIR-TR-THIRD': 'artikel 77', 'DORA-SECTOR-EMIR-RTS-NONICT': 'artikel 34, lid 3', 'DORA-SECTOR-EMIR-25undecies.1': 'artikel 25 undecies, lid 1',
  'DORA-SECTOR-CSDR-SCOPE': 'artikel 1, lid 2 en 3', 'DORA-SECTOR-CSDR-PUBLIC-EXCEPTION': 'artikel 1, lid 4',
  'DORA-SECTOR-CSDR-DEFINITION': 'artikel 2, lid 1, punt 1 en 2, en afdeling A van de bijlage', 'DORA-SECTOR-CSDR-AUTHORITIES': 'artikel 11, lid 1, en artikel 12, lid 1',
  'DORA-SECTOR-CSDR-THIRD': 'artikel 25, lid 1 tot en met 4 en lid 9', 'DORA-SECTOR-CSDR-TEST-CONTEXT': 'artikel 45, lid 5', 'DORA-SECTOR-CSDR-RTS-NONICT': 'artikel 45, lid 7',
  'DORA-SECTOR-BMR-2026-SCOPE': 'artikel 2, lid 1 en 1 bis', 'DORA-SECTOR-BMR-DISCLOSURE-EXCEPTION': 'artikel 2, lid 1 ter',
  'DORA-SECTOR-BMR-COMMODITY-SCOPE': 'artikel 2, lid 1 quater, en artikel 19', 'DORA-SECTOR-BMR-EXCLUSIONS': 'artikel 2, lid 2',
  'DORA-SECTOR-BMR-ADMIN-DEF': 'artikel 3, lid 1, punt 6', 'DORA-SECTOR-BMR-CRITICAL-DEF': 'artikel 3, lid 1, punt 25', 'DORA-SECTOR-BMR-CRITICAL-LIST': 'artikel 20, lid 1',
  'DORA-SECTOR-BMR-SIGNIFICANT-DISTINCTION': 'artikel 24, lid 1, en artikel 25, lid 1', 'DORA-SECTOR-BMR-2026-TRANSITION': 'artikel 51, lid 4 quater',
  'DORA-SECTOR-BMR-GENERAL-CONTROL': 'artikel 6, lid 1 tot en met 5',
};
function sectorPlaats(record) {
  const wet = SECTORWET[String(record.id ?? '').match(/^DORA-SECTOR-(CRA|EMIR|CSDR|BMR)-/u)?.[1]];
  if (!wet) return '';
  const plaats = SECTORPLAATS[record.id] ?? zonderWerknotatie(leesbareAlinea(record.locator));
  const net = plaats
    .replace(/, I?C?T-clausule$/u, '')
    .replace(/^Bijlage ([IVX]+) ([A-E])(\d+)/u, 'Bijlage $1, afdeling $2, punt $3')
    .replace(/^(Bijlage [IVX]+), ([IVX]+)\(([a-z])\)(?:, .+)?$/u, '$1, afdeling $2, onder $3');
  return /^(artikel|bijlage) /iu.test(net) ? contextCode(`${wet}, ${net.charAt(0).toLowerCase()}${net.slice(1)}`) : '';
}

const ROMEINS = /^(?:i{1,3}|iv|v|vi{1,3}|ix|x)$/u;
/** "1-d-iv", "3-al2-gelegenheid", "b viii 1)": lid, onderdeel, nummer en alinea uit een reeks losse tekens. */
function onderdelen(tokens, eersteIsLid) {
  const uit = [];
  tokens.forEach((t, i) => {
    if (i === 0 && eersteIsLid && /^\d+$/u.test(t)) uit.push('lid ' + t);
    else if (/^al(\d+)$/u.test(t)) uit.push(rang(t.slice(2)));
    else if (t === 'aanhef' || t === 'slot') uit.push(t);
    else if (ROMEINS.test(t) && uit.some(u => u.startsWith('onder '))) uit.push(t);
    else if (/^[a-z]$/u.test(t)) uit.push('onder ' + t);
    else if (/^\d+\)?$/u.test(t)) uit.push(t.replace(')', ''));
    // andere woorden ("onderzoek", "gelegenheid", "notice") zijn een korte naam van de maker en geen vindplaats
  });
  return uit.join(', ');
}

const RICHTLIJN = {PSD2: 'Richtlijn (EU) 2015/2366', UCITS: 'Richtlijn 2009/65/EG', MIFID: 'Richtlijn 2014/65/EU', CRD: 'Richtlijn 2013/36/EU', BRRD: 'Richtlijn 2014/59/EU', DORA: 'Verordening (EU) 2022/2554'};
const NUMMERWET = {'2015/2366': 'Richtlijn (EU) 2015/2366', '2016/2341': 'Richtlijn (EU) 2016/2341', '2013/36/EU': 'Richtlijn 2013/36/EU', '2014/59/EU': 'Richtlijn 2014/59/EU', '2009/65/EG': 'Richtlijn 2009/65/EG', '2014/65/EU': 'Richtlijn 2014/65/EU', '2009/138/EG': 'Richtlijn 2009/138/EG', '2011/61/EU': 'Richtlijn 2011/61/EU'};
const STAART = {aanhef: 'aanhef', chapeau: 'aanhef', first: 'eerste alinea', 'second-start': 'tweede alinea', 'second-end': 'tweede alinea', 'third-paragraph': 'derde alinea'};
/** Laatste vangnet: korte codes van de makers voor contextpassages (richtlijnen, Engelse tekst, eindverslag). */
function contextCode(tekst) {
  const l = String(tekst ?? '');
  // "PSD2-5-1-j", "UCITS-12-1, aanhef", "MIFID47-1, aanhef", "BRRD-10-7, aanhef", "PSD2-4-15-19", "DORA-3-23 / evidence[1]"
  const r = l.match(/^(PSD2|UCITS|MIFID|CRD|BRRD|DORA)-?(\d+)-(\d+)(?:-(\d+))?(?:(?:-|, )([a-z-]+))?(?: \/ evidence\[\d+\])?$/iu);
  if (r && RICHTLIJN[r[1].toUpperCase()]) {
    const [, code, art, een, twee, staart] = r;
    const definities = /^(PSD2|DORA)$/iu.test(code) && (art === '4' || art === '3');
    let uit = `${RICHTLIJN[code.toUpperCase()]}, artikel ${art}, ${definities ? 'punt' : 'lid'} ${een}`;
    if (twee) uit += ` ${Number(twee) - Number(een) === 1 ? 'en' : 'tot en met'} ${twee}`;
    const s = String(staart ?? '').toLowerCase();
    if (STAART[s]) uit += `, ${STAART[s]}`; else if (/^[a-z]$/u.test(s)) uit += `, onder ${s}`;
    return uit;
  }
  // "… → 2015/2366 5(1)(e)", "… → 2015/2366 19(6), tweede alinea", "… → Richtlijn 2013/36/EU, artikel 65(3)(a)(vi)"
  const pijl = l.match(/^(.+ → )(?:Richtlijn )?(\d{4}\/\d+(?:\/E[UG])?),? (?:artikel )?(\d+)(?:\((\d+)\))?(?:\(([a-z])\))?(?:\((i{1,3}|iv|v|vi{1,3})\))?(, .+)?$/u);
  if (pijl) {
    const [, links, nr, art, lid, onder, rom, rest] = pijl;
    return `${links}${NUMMERWET[nr] ?? `Richtlijn ${nr}`}, artikel ${art}${lid ? `, lid ${lid}` : ''}${onder ? `, onder ${onder}` : ''}${rom ? `, ${rom}` : ''}${rest ?? ''}`;
  }
  return l
    .replace(/^DORA-CONTEXT-(\d+)-FULL$/u, 'Artikel $1')
    .replace(/^NL(?:_CONSOLIDATED)?:(\d+)\.0*(\d+)[a-z]?$/u, 'Artikel $1, lid $2').replace(/^NL:(\d+)[a-z]$/u, 'Artikel $1').replace(/^NL:rct(\d+)[a-z]?$/u, 'Overweging $1')
    .replace(/^(?:DORA|RTS)_EN:rct_(\d+)$/u, 'Overweging $1 (Engelse tekst)').replace(/^(?:DORA|RTS)_EN:art_(\d+)$/u, 'Artikel $1 (Engelse tekst)')
    .replace(/^Richtsnoer(\d+\.\d+)(?: bullet)?([a-z])$/u, 'Richtsnoer $1, onder $2')
    .replace(/^Richtsnoer(\d+\.\d+)([a-z])? (\w+) bullet$/u, (_, n, x, rangwoord) => `Richtsnoer ${n}${x ? `, onder ${x}` : ''}, ${rangwoord} punt`)
    .replace(/^Richtsnoer(\d)/u, 'Richtsnoer $1').replace(/^Deel(\d+) /u, 'Deel $1, ').replace(/^Voetnoot(\d+)$/u, 'Voetnoot $1').replace(/, drie bullets$/u, '')
    .replace(/^NL:GL\d+-(?:C-)?TITLE:\d+$/u, 'Titel').replace(/^NL:GL\d+-(?:C-)?STATUS(?:-[A-Z]+)*:\d+$/u, 'Status van de richtsnoeren')
    .replace(/^NL:GL\d+-(?:C-)?NOTIFY(?:-[A-Z]+)*:\d+$/u, 'Kennisgevingsplicht')
    .replace(/^EN:(?:cover|identity)$/u, 'Voorblad (Engelse tekst)').replace(/^EN:annex.*$/u, 'Bijlage (Engelse tekst)').replace(/^EN:FN(\d+)(?:-(\d+))?$/u, (_, a, b) => `Voetnoot ${a}${b ? ` en ${b}` : ''} (Engelse tekst)`)
    .replace(/^EN:(\d+)-(\d+)$/u, 'Punt $1 tot en met $2 (Engelse tekst)').replace(/^EN:(\d+(?:\.\d+)?)[a-z]*(?:-\d+)?$/u, 'Punt $1 (Engelse tekst)').replace(/^EN:[a-z-]+$/u, 'Engelse tekst')
    .replace(/^FR:[a-z0-9-]+$/u, 'Eindverslag van de ESA’s (Engelse tekst)')
    .replace(/^ITS:(\d+)\.(\d+)$/u, 'ITS, artikel $1, lid $2').replace(/^ITS:B(\d\d)\.(\d\d)\.(\d{4})-(\d{4})$/u, 'ITS, model B_$1.$2, velden $3 tot en met $4')
    .replace(/^RTS1772:(\d+)\.(\d+)-(\d+)$/u, 'RTS 2024/1772, artikel $1, lid $2 en $3')
    .replace(/^Q\d+-EN-(\d+)-(\d+)$/u, 'Richtlijn 2014/65/EU, artikel $1, lid $2 (Engelse tekst)').replace(/^Q\d+-EN-[A-Z-]+$/u, 'Engelse tekst')
    .replace(/, onder no · /u, ' · ').replace(/^(artikel \d+), (\d+)-(CCP|CSD)\(([a-z])\)$/iu, '$1, lid $2, onder $4 ($3)')
    .replace(/^Ingevoegde DORA-voetnoot p\. (\d+) \((\d+)\)$/u, 'Ingevoegde voetnoot $2 (blz. $1)')
    .replace(/artikel 17,18,19,25; bijlageI$/u, 'artikel 17, 18, 19 en 25 en bijlage I');
}

const ROM = '(i{1,3}|iv|v|vi{1,3}|ix|x)';
/** Laatste stap: één schrijfwijze voor lid, onderdeel en nummer, en een hoofdletter vooraan. */
function eenSchrijfwijze(tekst) {
  const l = String(tekst ?? '')
    // "artikel 2, 2(c)(i)", "artikel 4, 1(l), recht", "artikel 24, 1(b)(ii)(1)"
    .replace(new RegExp(`^(artikel \\d+[a-z]?), (\\d+)\\(([a-z])\\)(?:\\(${ROM}\\))?(?:\\((\\d+)\\))?(?:, [a-z]+)?$`, 'iu'),
      (_, a, lid, x, rom, n) => `${a}, lid ${lid}, onder ${x}${rom ? `, ${rom}` : ''}${n ? `, ${n}` : ''}`)
    // "artikel 5, 3", "artikel 4, 1, toestemming"
    .replace(/^(artikel \d+[a-z]?), (\d+)(?:, [a-z]+)?$/iu, '$1, lid $2')
    // "onder b(ii)", "tweede alinea(a)"
    .replace(new RegExp(`onder ([a-z])\\(${ROM}\\)`, 'gu'), 'onder $1, $2')
    .replace(/\b(eerste|tweede|derde|vierde|vijfde) alinea\(([a-z])\)/gu, '$1 alinea, onder $2')
    // DORA zelf: "Artikel 60.7ai" (wijzigingsartikelen 59 tot en met 63 hebben punten), "Artikel 58.1a", "Artikel 64.entry"
    .replace(new RegExp(`^Artikel (59|6[0-3])\\.(\\d+)([a-z])?${ROM}?$`, 'u'), (_, a, n, x, rom) => `Artikel ${a}, punt ${n}${x ? `, onder ${x}` : ''}${rom ? `, ${rom}` : ''}`)
    .replace(/^Artikel (\d+)\.(\d+)([a-z])?$/u, (_, a, n, x) => `Artikel ${a}, lid ${n}${x ? `, onder ${x}` : ''}`)
    .replace(/^Artikel (\d+)\.[a-z]+$/u, 'Artikel $1')
    // ITS 2025/302: "artikel 1 lid 1 a tweede zinsdeel", "artikel 9 eerste alinea", "bijlage II kop", "pagina 1 voetnoot 1"
    .replace(/^artikel (\d+) lid (\d+)(?: ([a-z])(?= |$))?(?: (.+))?$/iu, (_, a, lid, x, rest) => `Artikel ${a}, lid ${lid}${x ? `, onder ${x}` : ''}${rest ? `, ${rest}` : ''}`)
    .replace(/^artikel (\d+) ((?:eerste|tweede|derde) alinea)$/iu, 'Artikel $1, $2')
    .replace(/^bijlage ([IVX]+) kop$/iu, 'Bijlage $1, kop').replace(/^pagina (\d+) voetnoot (\d+)$/iu, 'Voetnoot $2 (blz. $1)')
    // ITS 2024/2956: "Artikel 3, lid 2, a", "Bijlage I, B_02.01.0050, a", "Bijlage I, B_07.01.0110, beoordelen", "Bijlage IV, nonfinancial-43-5"
    .replace(/^(Artikel \d+, (?:lid|punt) \d+), ([a-z])$/u, '$1, onder $2')
    .replace(/^(Bijlage [IVX]+, (?:inleiding )?B_[\d.]+), ([a-z])$/u, '$1, onder $2').replace(/^(Bijlage [IVX]+, (?:inleiding )?B_[\d.]+), [a-zï]{2,}$/u, '$1')
    .replace(/^(Bijlage [IVX]+), nonfinancial-\d+-\d+$/u, '$1, niet-financiële entiteiten').replace(/^(Bijlage [IVX]+), ([a-z])$/u, '$1, onder $2')
    // Oversight: "Artikel 31, lid 2 (chapeau)", "… (b-ii)", "… (a)", "… ()", "… (draft-notice)", "Artikel 43, lid 1, amount"
    .replace(/^(Artikel \d+, lid \d+) \(\)$/u, '$1').replace(/^(Artikel \d+, lid \d+) \(chapeau\)$/u, '$1, aanhef')
    .replace(new RegExp(`^(Artikel \\d+, lid \\d+) \\(([a-z])-${ROM}\\)$`, 'u'), '$1, onder $2, $3')
    .replace(new RegExp(`^(Artikel \\d+, lid \\d+) \\((?:([a-z])|${ROM})\\)$`, 'u'), (_, a, x, rom) => `${a}, onder ${x ?? rom}`)
    .replace(/^(Artikel \d+, lid \d+) \([a-z]+(?:-[a-z]+)*\)$/u, '$1')
    .replace(/^(Artikel \d+, lid \d+), (?!aanhef$|slot$)[a-z]{3,}$/u, '$1')
    .replace(/^Artikel (\d+) lid (\d+), /iu, 'Artikel $1, lid $2, ').replace(/^Artikel (\d+) ((?:eerste|tweede|derde) zin)$/u, 'Artikel $1, $2')
    .replace(new RegExp(`^(Artikel \\d+, lid \\d+), ([a-z])-(?:${ROM}-)?(\\d+)$`, 'u'), (_, a, x, rom, n) => `${a}, onder ${x}${rom ? `, ${rom}` : ''}, ${n}`)
    .replace(/, onderdeel ([a-z])$/u, ', onder $1').replace(/ alinea aanhef$/u, ' alinea, aanhef')
    .replace(/^DORA artikel (\d+) lid (\d+)$/u, 'DORA, artikel $1, lid $2')
    .replace(/^BRRD-ANN-([A-C]), aanhef$/u, 'Richtlijn 2014/59/EU, bijlage, deel $1, aanhef')
    .replace(/^Bijlage categorie(\d+) (\w+ element) \/.+$/u, 'Bijlage, categorie $1, $2').replace(/^(Bijlage III), (S\d+)$/u, '$1, ICT-dienst $2')
    // Losse werkwoorden
    .replace(/^Rechtsgrond DORA ?(?:artikel )?(\d+)(?:\((\d+)\))?$/u, (_, a, lid) => `Rechtsgrond: DORA, artikel ${a}${lid ? `, lid ${lid}` : ''}`)
    .replace(/^DOCUMENT-IDENTITY$/u, 'Titel en aanhef').replace(/^SIGNATURE$/u, 'Ondertekening')
    .replace(/^(Artikel \d+) [—,] volledige context$/u, '$1')
    // NOREA: "DORA in Control!A101, DORA in Control!B101, …" (cellen van één rij), "PDF p.21 reference table row 1"
    .replace(/^([^!,]+?) ?![A-Z]+(\d+)(?:, [^!,]+?![A-Z]+\d+)*$/u, (m, blad, rij) => m.split(', ').every(c => c.replace(/ ?![A-Z]+(\d+)$/u, '|$1') === `${blad}|${rij}`) ? `${blad}, rij ${rij}` : m)
    .replace(/^PDF p\.(\d+) reference table row (\d+)$/u, 'PDF p. $1, verwijzingstabel, rij $2');
  return l.charAt(0).toUpperCase() + l.slice(1);
}

const PLAATSWOORD = /\b(artikel|overweging|bijlage|annex|lid|punt|deel|afdeling|titel|hoofdstuk|werkblad|cel|control|considerans|rij|richtsnoer|voetnoot|p\.)\b|^§/i;
export function leesbareVindplaats(record = {}) {
  const sector = sectorPlaats(record);
  if (sector) return sector;
  const locator = contextCode(zonderWerknotatie(leesbareAlinea(record.locator)));
  // "artikel 4, 0(a)": artikel zonder genummerde leden.
  const zonderNul = locator
    .replace(/\b(artikel \d+[a-z]?), 0\(([a-z]+)\)/giu, '$1, onder $2')
    .replace(/\b(artikel \d+[a-z]?), 0\b/giu, '$1');
  // Een omschrijving zonder artikel ("Weekeinde/feestdag tot 12 uur volgende werkdag") krijgt de plaats uit de recordcode ervoor.
  const plaats = plaatsUitId(String(record.id ?? ''));
  if (PLAATSWOORD.test(zonderNul) || (!plaats && HEEFT_PLAATS.test(zonderNul))) return eenSchrijfwijze(zonderNul);
  return eenSchrijfwijze(plaats ? (zonderNul ? `${plaats} · ${zonderNul}` : plaats) : zonderNul);
}
function plaatsUitId(id) {
  const overweging = id.match(/-(?:NL-)?REC-(\d+)$/u);
  if (overweging) return `Overweging ${Number(overweging[1])}`;
  // Eén letter is een onderdeel ("-A"); twee of meer letters zijn een korte naam van de maker ("-NO-EXCLUSIVE").
  const m = id.match(/-NL-A(\d+)(?:-(\d+))?(?:-(CHAPEAU|[A-Z]))?(?:-[A-Z]{2,})*$/u);
  if (!m) return '';
  const [, artikel, lid, rest] = m;
  return [`Artikel ${Number(artikel)}`, lid && `lid ${Number(lid)}`,
    rest === 'CHAPEAU' ? 'aanhef' : rest && `onder ${rest.toLowerCase()}`].filter(Boolean).join(', ');
}
