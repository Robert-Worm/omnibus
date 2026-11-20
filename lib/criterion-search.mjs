import {searchAlternatives} from './search-synonyms.mjs';
// Search projection only: original wording and source offsets remain untouched.
export function searchText(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/\u00ad\s*/g, '').replace(/[‐‑–—-]/g, ' ')
    .toLocaleLowerCase('nl').replace(/\s+/g, ' ').trim();
}

// "PILOT" is een werknaam uit de uitwerking; scherm en export tonen DORA-G12-N01. Beide vormen zijn vindbaar (testronde 19-11, B4).
const shownId = id => String(id ?? '').replace(/^DORA-PILOT(\d+)-/u, 'DORA-G$1-');
export function criterionIndex(items, sources) {
  const bySource = new Map(sources.map(s => [s.id, s]));
  return items.filter(item => bySource.has(item.sourceId)).map(item => ({
    item,
    source: bySource.get(item.sourceId),
    direct: searchText([item.id,shownId(item.id),item.title,item.auditNorm || item.body,item.sourceControlId].join(' ')),
    text: searchText([item.id, shownId(item.id), item.title, item.auditNorm, item.body, item.groupTitle,
      item.groupDescription, item.sourceContext, item.rationale, item.topic, item.location,
      item.sourceControlId, item.previousIds, bySource.get(item.sourceId).title].join(' ')),
  }));
}

export function searchCriteria(index, query, sourceIds) {
  const terms = searchText(query).split(' ').filter(Boolean);
  if (!terms.length) return [];
  const allowed = new Set(sourceIds);
  // De alternatieven van een term één keer bepalen, niet opnieuw voor elke rij (zelfde uitkomst als matchesTerm).
  const alternatives = terms.map(searchAlternatives);
  const matches = (text, words) => words.some(word => text.includes(word));
  return index.filter(row => allowed.has(row.source.id) && alternatives.every(words => matches(row.text, words)))
    .map(row=>({...row,matchInCriterion:alternatives.every(words=>matches(row.direct, words)),
      // Een letterlijke treffer weegt zwaarder dan een treffer via een synoniem.
      score:terms.filter(term=>row.direct.includes(term)).length*2+alternatives.filter(words=>matches(row.direct, words)).length}))
    .sort((a,b)=>b.score-a.score);
}
/** Is er minstens één treffer? Zelfde regel als searchCriteria, maar stopt bij de eerste. */
export function hasCriteriaMatch(index, query, sourceIds) {
  const terms = searchText(query).split(' ').filter(Boolean);
  if (!terms.length) return false;
  const allowed = new Set(sourceIds), alternatives = terms.map(searchAlternatives);
  return index.some(row => allowed.has(row.source.id) && alternatives.every(words => words.some(word => row.text.includes(word))));
}
