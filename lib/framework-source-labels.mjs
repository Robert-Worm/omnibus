// Labels describe the document's recorded role, not its legal applicability.
const roles={
 'original-publication':'Oorspronkelijke publicatie',
 'frozen original-publication; referenced without rewriting':'Oorspronkelijke publicatie',
 'original-publication; comparison evidence':'Oorspronkelijke publicatie, gebruikt voor tekstvergelijking',
 'consolidated-reading-basis':'Geconsolideerde tekst (met latere wijzigingen), gebruikt om te lezen',
 'sector-consolidated-reading-basis':'Geconsolideerde sectorwetgeving, gebruikt om te lezen',
 corrigendum:'Officiële rectificatie van de publicatie',
 PRIMARY_ORIGINAL_NL:'Oorspronkelijke Nederlandse publicatie',
 AUTHENTIC_CORRIGENDUM_NL:'Officiële Nederlandse rectificatie',
 CONSOLIDATED_READING_AID_ONLY:'Geconsolideerde tekst (met latere wijzigingen), alleen ter vergelijking',
 'language-comparison-context':'Andere taalversie, gebruikt voor vergelijking en uitleg',
 'language-comparison':'Andere taalversie, gebruikt voor vergelijking',
 'external-text-context':'Aanvullende brontekst voor context',
 'external-context':'Aanvullende bron voor de context',
 'original-guideline':'Oorspronkelijke richtsnoeren',
 'original-directive':'Oorspronkelijke richtlijn',
};
export function frameworkSourceRole(role=''){return (Object.hasOwn(roles,role)?roles[role]:role).replace(/\s+[—–]\s+/gu,': ');}
export function frameworkSourceLink(url=''){
 try{const parsed=new URL(url);return ['https:','http:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password?parsed.href:undefined;}catch{return undefined;}
}
/** A readable document title. Technical file names (dora-official-nl.pdf) are
 * replaced by the recorded role, with a year from the file name when present. */
export function frameworkDocumentTitle(title='',role=''){
 const name=String(title).trim();
 if(name&&!/^[\w.-]+\.(pdf|xlsx?|csv|html?|docx?|txt|json|xml)$/iu.test(name))return name;
 const year=name.match(/(?:^|[^\d])((?:19|20)\d{2})(?:[^\d]|$)/u)?.[1];
 const label=frameworkSourceRole(role)||'Brondocument';
 return year?`${label} (${year})`:label;
}

/** "Ratingbureaus — 1060/2009 · 20250117" wordt "Ratingbureaus — Verordening 1060/2009, versie van 17 januari 2025". */
// Twee richtsnoeren dragen als documenttitel nog de werknaam van de uitwerking ("GL34-NL: frozen official language version").
// De lezer krijgt de naam van de bron en de taal (bugronde 12 november 2026). De opgeslagen titel blijft gelijk.
const BRONCODE={GL34:'Richtsnoeren incidentkosten en verliezen',GL36:'Richtsnoeren samenwerking en informatie-uitwisseling bij oversight',
 DORA:'DORA, Verordening (EU) 2022/2554',RTS1772:'RTS incidentclassificatie, Gedelegeerde Verordening (EU) 2024/1772',
 ITS302:'ITS incidentrapportage, Uitvoeringsverordening (EU) 2025/302',ITS2956:'ITS informatieregister, Uitvoeringsverordening (EU) 2024/2956'};
function bronnaamUitWerknaam(title){
 if(/^GL34-FINAL-REPORT\b/u.test(title))return 'Eindrapport met toelichting bij de richtsnoeren incidentkosten en verliezen (17 juli 2024)';
 const m=title.match(/^([A-Z]+\d*)-(NL|EN)(?: —|:) /u);
 return m&&BRONCODE[m[1]]?`${BRONCODE[m[1]]} — ${m[2]==='NL'?'Nederlandse tekst':'Engelse tekst'}`:title;
}
export function leesbareDocumentTitel(title=''){
 title=bronnaamUitWerknaam(String(title));
 const maanden=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
return String(title).replace(/(?: —|:) (\d{3,4}\/\d{4}) · (\d{4})(\d{2})(\d{2})$/u,(m,nr,j,mm,d)=>maanden[+mm-1]?` — Verordening ${nr}, geconsolideerde versie van ${+d} ${maanden[+mm-1]} ${j}`:m)
  .replace(/ · (\d{4})(\d{2})(\d{2})$/u,(m,j,mm,d)=>maanden[+mm-1]?`, versie van ${+d} ${maanden[+mm-1]} ${j}`:m);
}

// De opgenomen uitgave is ook de vaste identiteit van een bron en verandert daarom niet in de gegevens.
// Voor de lezer halen we werktaal uit de uitwerking eruit (panel 10 november 2026).
const MAAND=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
export function leesbareEditie(edition){
  return String(edition??'')
    .replace(/\b(\d{2})-(\d{2})-(\d{4})\b/gu,(m,d,mm,j)=>MAAND[+mm-1]?`${+d} ${MAAND[+mm-1]} ${j}`:m)
    .replace(/\bBevroren oorspronkelijke\b/gu,'Oorspronkelijke').replace(/\bbevroren (?=Nederlandse)/gu,'')
    .replace(/\bNL-publicatie\b/gu,'Nederlandse publicatie').replace(/\bNL oorspronkelijke\b/gu,'Oorspronkelijke Nederlandse')
    .replace(/\bgeconsolideerde leeshulp\b/gu,'geconsolideerde tekst ter vergelijking').replace(/\bbevroren bronbasis\b/gu,'peildatum')
    .replace(/;?\s*geen aanvullende actuele statusclaim\.?/giu,'').replace(/\s*Geen nieuwe actualiteits- of rectificatieclaim\.?/giu,'')
    .replace(/;?\s*begrensde uitwerking\.?/giu,'').replace(/\s*Zelfstandig pakket gebaseerd op[^.]*\./giu,'')
    .replace(/\s+met afzonderlijke,? begrensde sectorcontext/giu,'').replace(/\s+met afzonderlijke taal- en primaire duiding/giu,'')
    .replace(/\s+met afzonderlijke taalvergelijking, primaire context en officiële ESA-toelichting/giu,', met de officiële toelichting van de ESA\'s')
    .replace(/\bgerichte EN-vergelijking bij artikel (\d+)\((\d+)\) en (\d+)\((\d+)\)/gu,'artikel $1, lid $2, en artikel $3, lid $4, vergeleken met de Engelse tekst')
    .replace(/\bgerichte vergelijking met de Engelse tekst bij\b/gu,'vergeleken met de Engelse tekst bij')
    .replace(/([a-zà-ÿ])(\d{4})\b/gu,'$1 $2').replace(/\s{2,}/gu,' ').replace(/\s+([.;,])/gu,'$1').trim();
}
