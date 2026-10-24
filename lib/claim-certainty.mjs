// Review signals only: never a truth decision, a release gate or a text repair.
// Method inspiration and limits: docs/claim-certainty.md (Clarity Gate, CC BY 4.0).
export const CHECK_VERSION = 'certainty-1';
export const REDENEN = Object.freeze({
  'historisch-als-actueel': 'Vergelijkbare bronzin is historisch; de claim bevat een actuele formulering zonder tijdsafbakening.',
  'aanname-als-feit': 'Vergelijkbare bronzin bevat onzekerheid die in de claim niet herkenbaar is.',
  'getal-zonder-bron': 'Een herkende hoeveelheid is niet teruggevonden in vergelijkbare gekoppelde broncontext.',
  'tegenstrijdige-getallen': 'Vergelijkbare gekoppelde broncontext bevat een andere hoeveelheid; controleer betekenis en reikwijdte.',
  'binding-ontbreekt': 'Een expliciete bronbinding ontbreekt, is dubbelzinnig of bevat geen leesbare passage.',
});

const onzeker = /\b(mogelijk|mogelijkerwijs|vermoedelijk|waarschijnlijk|wellicht|naar verwachting|naar schatting|geschat|schatting|aanname|aangenomen|hypothese|verondersteld|veronderstelling)\b/iu;
const historisch = /\b(was|waren|had|hadden|ontbrak|ontbraken|bleek|bleken|destijds|toenmalig\w*)\b/iu;
const actueel = /\b(is|zijn|heeft|hebben|ontbreekt|ontbreken|blijkt|blijken|momenteel|tegenwoordig|nu|vandaag)\b/iu;
const afgebakend = /\b(destijds|toenmalig\w*|in (?:19|20)\d{2}|over (?:19|20)\d{2}|volgens (?:het|dit|dat) (?:rapport|onderzoek)|het (?:rapport|onderzoek) (?:meldt|stelt|beschrijft))\b/iu;
const normatief = /\b(moet|moeten|dient|dienen|mag|mogen|vereist|verplicht|behoort|behoren)\b|^(?:controleer|beoordeel|onderzoek|stel vast|ga na|verifieer)\b/iu;
const voorstel = /\b(voorstel|voorgesteld|voorbeeld|illustratief|bijvoorbeeld|eigen afleiding)\b/iu;
const voorstelBasis = new Set(['PROPOSED', 'ANALYST_PROPOSAL', 'AUDIT_PROPOSAL']);
const stop = new Set(('de het een en of van voor door bij op om met aan uit te tot dat die dit deze er als in over volgens rapport onderzoek naar verwachting schatting vermoedelijk mogelijk mogelijkerwijs waarschijnlijk wellicht geschat aangenomen aanname hypothese verondersteld veronderstelling destijds toenmalige momenteel tegenwoordig nu vandaag moet moeten dient dienen mag mogen is zijn was waren heeft hebben had hadden wordt worden werd werden blijkt blijken bleek bleken bedraagt bedroeg bedragen bedroegen zal zullen zou zouden').split(' '));
const vormen = new Map([['ontbrak','ontbreekt'],['ontbraken','ontbreekt'],['ontbreken','ontbreekt']]);
const zinnen = tekst => tekst.normalize('NFC').split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])|[\r\n;]+/u).map(s => s.trim()).filter(Boolean);
const woorden = tekst => new Set((tekst.toLowerCase().match(/\p{L}+/gu) || []).filter(w => !stop.has(w)).map(w => vormen.get(w) || w));
const jaren = tekst => [...tekst.matchAll(/\b(?:19|20)\d{2}\b/gu)].map(m => m[0]);

// A high overlap threshold favours a small review queue over broad semantic guesses.
function vergelijkbaar(a, b) {
  const links = woorden(a), rechts = woorden(b);
  const overlap = [...links].filter(w => rechts.has(w)).length;
  return overlap >= 2 && overlap / Math.max(links.size, rechts.size) >= 0.75;
}
function zelfdePeriode(a, b) {
  const links = jaren(a), rechts = jaren(b);
  return !links.length || !rechts.length || links.join(',') === rechts.join(',');
}

// Deliberately bounded vocabulary: bare numbers, numbered articles, years and
// identifiers are not quantities. Unknown units remain outside this detector.
const eenheden = new Map([
  ['procent','%'], ['percent','%'], ['eur','euro'], ['euro','euro'], ['euros','euro'],
  ['uur','uur'], ['uren','uur'], ['dag','dag'], ['dagen','dag'],
  ['werkdag','werkdag'], ['werkdagen','werkdag'], ['week','week'], ['weken','week'],
  ['maand','maand'], ['maanden','maand'], ['jaar','jaar'], ['jaren','jaar'],
  ...['dossier','aanvraag','medewerker','controle','audit','melding','incident','organisatie','proces','systeem','geval','contract','factuur','steekproef'].map(w => [w,w]),
  ['dossiers','dossier'], ['aanvragen','aanvraag'], ['medewerkers','medewerker'], ['controles','controle'],
  ['audits','audit'], ['meldingen','melding'], ['incidenten','incident'], ['organisaties','organisatie'],
  ['processen','proces'], ['systemen','systeem'], ['gevallen','geval'], ['contracten','contract'],
  ['facturen','factuur'], ['steekproeven','steekproef'],
]);
const getal = '(?:\\d{1,3}(?:[.\\u00a0 ]\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)';
const hoeveelheden = new RegExp(`(?<![\\p{L}\\p{N}_.:/-])(?:€\\s*)?${getal}\\s*(?:%|[\\p{L}]+)?`, 'gu');

function numeriek(raw) {
  const s = raw.replace(/[\s\u00a0]/gu, '');
  // Dutch grouping versus decimal dot. No rounding and no unit conversions.
  const n = s.includes(',') ? s.replaceAll('.', '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/u.test(s) ? s.replaceAll('.', '') : s;
  const [geheel, fractie = ''] = n.split('.');
  const decimalen = fractie.replace(/0+$/u, '');
  return geheel.replace(/^0+(?=\d)/u, '') + (decimalen ? '.' + decimalen : '');
}

function getallen(zin) {
  const resultaat = [];
  for (const m of zin.matchAll(hoeveelheden)) {
    const raw = m[0].trim();
    const getalMatch = raw.match(new RegExp(getal, 'u'));
    const nummer = getalMatch?.[0];
    const suffix = raw.slice((getalMatch?.index || 0) + (nummer?.length || 0)).trim().toLowerCase();
    const eenheid = raw.startsWith('€') ? 'euro' : suffix === '%' ? '%' : eenheden.get(suffix);
    if (!nummer || !eenheid) continue;
    const voor = zin.slice(0, m.index);
    // A reference before a number is not a quantity even if prose follows it.
    if (/(?:\b(?:artikel|art\.?|lid|paragraaf|hoofdstuk|pagina|p\.?|iso|nen|versie)|§)\s*$/iu.test(voor)) continue;
    const waarde = numeriek(nummer);
    const label = voor.match(/\b(minimaal|maximaal|ten minste|ten hoogste|meer dan|minder dan|circa|ongeveer)\s*$/iu)?.[1]?.toLowerCase() || '';
    const kwalificatie = ({'ten minste':'minimaal','ten hoogste':'maximaal','circa':'ongeveer'})[label] || label;
    const context = (zin.slice(0, m.index) + ` ${eenheid === '%' ? 'percentage' : eenheid} ` + zin.slice(m.index + m[0].length))
      .replace(/\b(?:minimaal|maximaal|ten minste|ten hoogste|meer dan|minder dan|circa|ongeveer)\b/giu, '');
    // Ranges and arithmetic are not resolved by token equality.
    const complex = /\b(tussen|van\s+\d+\s+tot|per|op de|van de\s+\d+)\b|\d\s*[-–/]\s*\d/iu.test(zin);
    resultaat.push({waarde, eenheid, context, kwalificatie, complex});
  }
  return resultaat;
}

/**
 * Pure, non-mutating precheck. Passages must already be explicitly bound by the
 * caller. Text similarity is a review hint, never a source-integrity check.
 * @param {{tekst:string, passages?:{id:string, tekst:string}[], basis?:string, ontbrekendeBinding?:boolean}} invoer
 */
export function voorcontrole({tekst, passages = [], basis = '', ontbrekendeBinding = false}) {
  if (typeof tekst !== 'string' || !Array.isArray(passages) || passages.some(p => typeof p?.tekst !== 'string' || typeof p?.id !== 'string'))
    throw Error('Ongeldige invoer voor zekerheidscontrole.');
  const meldingen = [];
  const meld = (code, zin, refs = []) => {
    const bronIds = [...new Set(refs)].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    if (!meldingen.some(m => m.code === code && m.zin === zin)) meldingen.push({code, zin, bronIds, reden: REDENEN[code]});
  };
  if (ontbrekendeBinding) meld('binding-ontbreekt', 0);
  const bronnen = passages.flatMap(p => zinnen(p.tekst).map(tekst => ({id:p.id, tekst, getallen:getallen(tekst)})));
  const delen = zinnen(tekst);
  let hoeveelheidAantal = 0;
  for (const [index, zin] of delen.entries()) {
    const nr = index + 1;
    const gekoppeld = bronnen.filter(b => vergelijkbaar(zin, b.tekst));
    const isVoorstel = voorstelBasis.has(basis) || voorstel.test(zin);
    if (!isVoorstel && !normatief.test(zin) && !onzeker.test(zin) && !zin.endsWith('?')) {
      if (actueel.test(zin) && !historisch.test(zin) && !afgebakend.test(zin)) {
        const oud = gekoppeld.filter(b => historisch.test(b.tekst));
        if (oud.length) meld('historisch-als-actueel', nr, oud.map(b => b.id));
      }
      const aannames = gekoppeld.filter(b => onzeker.test(b.tekst));
      if (aannames.length) meld('aanname-als-feit', nr, aannames.map(b => b.id));
    }
    const claims = getallen(zin);
    hoeveelheidAantal += claims.length;
    if (isVoorstel) continue;
    for (const claim of claims) {
      const kandidaten = bronnen.flatMap(b => b.getallen.filter(g => g.eenheid === claim.eenheid &&
        zelfdePeriode(zin, b.tekst) && vergelijkbaar(claim.context, g.context)).map(g => ({...g, id:b.id})));
      const gelijk = kandidaten.filter(g => g.waarde === claim.waarde && g.kwalificatie === claim.kwalificatie);
      // Multiple alternatives, bounds and ranges require context review, not a contradiction verdict.
      const andere = kandidaten.filter(g => g.waarde !== claim.waarde);
      if (!gelijk.length) {
        const conflict = kandidaten.length && !claim.complex && !claim.kwalificatie &&
          kandidaten.every(g => !g.complex && !g.kwalificatie) && new Set(kandidaten.map(g => g.waarde)).size === 1;
        meld(conflict ? 'tegenstrijdige-getallen' : 'getal-zonder-bron', nr, kandidaten.map(g => g.id));
      } else if (andere.length && !claim.complex && !claim.kwalificatie && andere.every(g => !g.complex && !g.kwalificatie)) {
        meld('tegenstrijdige-getallen', nr, kandidaten.map(g => g.id));
      }
    }
  }
  return {
    uitkomst: meldingen.length ? 'HOLD' : !delen.length || !bronnen.length ? 'NIET_BEOORDEELD' : 'geen-signaal',
    meldingen, zinnen:delen.length, hoeveelheden:hoeveelheidAantal,
    bronzinnen:bronnen.length,
  };
}
