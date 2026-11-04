// Display navigation only. Never changes a criterion, point, source trace or
// saved material. Group membership does not establish legal applicability.
const norea = [
  'Bestuur en strategie', 'ICT-risicobeheerraamwerk', 'ICT-risicobeoordeling',
  'Interne audit en opvolging', 'ICT-systemen en middelen', 'Wijzigingsbeheer',
  'ICT-operaties en capaciteit', 'Back-ups en herstel', 'Bedrijfscontinuïteit en crisisbeheer',
  'Classificatie van incidenten en dreigingen', 'Incidentafhandeling en communicatie',
  'Aanschaf en ontwikkeling van systemen', 'ICT-projectbeheer', 'Selectie van ICT-dienstverleners',
  'Contractafspraken met ICT-dienstverleners', 'Kritieke ICT-dienstverlening',
  'Derdenrisico, registratie en exit', 'Onderaanneming', 'Weerbaarheidstesten en TLPT',
  'Derden en testers bij TLPT', 'Netwerkbeveiliging', 'Monitoring en logging',
  'Gegevens- en systeembeveiliging', 'Encryptie en sleutelbeheer', 'Identiteiten en toegangsrechten',
  'Fysieke beveiliging', 'Bewustwording en opleiding', 'Kwetsbaarheden en patches',
];
const dora = [
  ['Evenredigheid en toepassing', [4]],
  ['Bestuur en ICT-risicobeheerkader', [5,6]],
  ['ICT-middelen, afhankelijkheden en risicoanalyse', [7,8]],
  ['Bescherming, preventie en detectie', [9,10]],
  ['Continuïteit, back-ups en herstel', [11,12]],
  ['Leren, opleiding en crisiscommunicatie', [13,14]],
  ['Vereenvoudigd ICT-risicobeheerkader', [16]],
  ['Incidentbeheer, classificatie en rapportage', [17,18,19,20,21,22,23]],
  ['Testprogramma voor digitale weerbaarheid', [24,25]],
  ['Dreigingsgestuurde penetratietests (TLPT)', [26,27]],
  ['ICT-dienstverleners, contracten en exit', [28,29,30]],
  ['Informatie-uitwisseling over cyberdreigingen', [45]],
  ['Beroepsgeheim en informatieverstrekking', [55]],
  ['Sectorspecifieke wijzigingen', [59,60,61,62,63]],
];
const rts = [
  ['Gewoon raamwerk · Beleid en ICT-risicobeheer', [2,3]],
  ['Gewoon raamwerk · ICT-assets en classificatie', [4,5]],
  ['Gewoon raamwerk · Encryptie en sleutelbeheer', [6,7]],
  ['Gewoon raamwerk · ICT-operaties en capaciteit', [8,9]],
  ['Gewoon raamwerk · Kwetsbaarheden en patches', [10]],
  ['Gewoon raamwerk · Gegevens, logging en netwerkbeveiliging', [11,12,13,14]],
  ['Gewoon raamwerk · Projecten, ontwikkeling en wijzigingen', [15,16,17]],
  ['Gewoon raamwerk · Fysieke beveiliging en personeel', [18,19]],
  ['Gewoon raamwerk · Identiteiten en toegangsrechten', [20,21]],
  ['Gewoon raamwerk · Incidentbeheer en detectie', [22,23]],
  ['Gewoon raamwerk · Continuïteit, testen en herstel', [24,25,26]],
  ['Gewoon raamwerk · Evaluatie en verslaglegging', [27]],
  ['Vereenvoudigd raamwerk · Bestuur en beveiligingsbeleid', [28,29]],
  ['Vereenvoudigd raamwerk · Functies, assets en risicoanalyse', [30,31]],
  ['Vereenvoudigd raamwerk · Fysieke beveiliging en toegang', [32,33]],
  ['Vereenvoudigd raamwerk · ICT-operaties en systeembeveiliging', [34,35]],
  ['Vereenvoudigd raamwerk · Beveiligingsmaatregelen testen', [36]],
  ['Vereenvoudigd raamwerk · Ontwikkeling, projecten en wijzigingen', [37,38]],
  ['Vereenvoudigd raamwerk · Continuïteit en hersteltesten', [39,40]],
  ['Vereenvoudigd raamwerk · Evaluatie en verslaglegging', [41]],
];

/** Explicit source structure, never fuzzy matching of norm wording. */
function navigationGroup(sourceId, criterion, points) {
  const chapter = points[0]?.chapter || criterion.chapter;
  const fallback = {id:chapter, title:chapter, order:1000};
  if (sourceId === 'NOREA-DORA-3-2') {
    const number = Number(criterion.sourceControlId?.match(/^(\d+)\.\d+$/)?.[1]);
    return norea[number-1] ? {id:`${sourceId}-group-${number}`, title:`${number}. ${norea[number-1]}`, order:number} : fallback;
  }
  const definitions = sourceId === 'DORA-2022-2554' ? dora : sourceId === 'DORA-2024-1774' ? rts : null;
  if (!definitions) return fallback;
  const articles = sourceId === 'DORA-2022-2554'
    ? [Number(chapter?.match(/^Artikel (\d+)\s*·/)?.[1])]
    : [...new Set(points.flatMap(point => (point.source_links || [])
      .filter(link => link.contribution === 'PRIMARY')
      .map(link => Number(link.record_id?.match(/^RTS1774-NL-A(\d+)(?:-|$)/)?.[1]))))];
  if (!articles.length || articles.some(article => !Number.isInteger(article))) return fallback;
  const index = definitions.findIndex(([, numbers]) => articles.every(article => numbers.includes(article)));
  return index < 0 ? fallback : {id:`${sourceId}-group-${index+1}`, title:definitions[index][0], order:index};
}

/** Every existing norm stays in exactly one display group, including HOLD.
 * Unknown source structure retains its original group instead of disappearing. */
export function topicalNavigation(bundle) {
  const points = new Map(), criteria = new Map(), groups = new Map();
  for (const point of bundle.catalogue.points) {
    if (!points.has(point.criterion_id)) points.set(point.criterion_id, []);
    points.get(point.criterion_id).push(point);
  }
  for (const criterion of bundle.catalogue.criteria) {
    const group = navigationGroup(bundle.id, criterion, points.get(criterion.id) || []);
    criteria.set(criterion.id, group);
    if (!groups.has(group.id)) groups.set(group.id, group);
  }
  return {criteria, groups:[...groups.values()].sort((a,b)=>a.order-b.order).map(({id,title})=>({id,title}))};
}

/** Preserve an old chapter filter only when it maps unambiguously to one group.
 * @param {string} current
 * @param {{groupId:string,navigationSubjects?:string[]}[]} rows
 * @param {{id:string}[]} groups
 */
export function remapTopicalGroup(current, rows, groups) {
  if (!current || groups.some(group=>group.id===current)) return current;
  const targets=new Set(rows.filter(row=>row.navigationSubjects?.includes(current)).map(row=>row.groupId));
  return targets.size===1 ? [...targets][0] : current;
}
