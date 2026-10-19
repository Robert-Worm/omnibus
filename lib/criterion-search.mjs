// Search projection only: original wording and source offsets remain untouched.
export function searchText(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/\u00ad\s*/g, '').replace(/[‐‑–—-]/g, ' ')
    .toLocaleLowerCase('nl').replace(/\s+/g, ' ').trim();
}

export function criterionIndex(items, sources) {
  const bySource = new Map(sources.map(s => [s.id, s]));
  return items.filter(item => bySource.has(item.sourceId)).map(item => ({
    item,
    source: bySource.get(item.sourceId),
    direct: searchText([item.id,item.title,item.auditNorm || item.body,item.sourceControlId].join(' ')),
    text: searchText([item.id, item.title, item.auditNorm, item.body, item.groupTitle,
      item.groupDescription, item.sourceContext, item.rationale, item.topic, item.location,
      item.sourceControlId, item.previousIds, bySource.get(item.sourceId).title].join(' ')),
  }));
}

export function searchCriteria(index, query, sourceIds) {
  const terms = searchText(query).split(' ').filter(Boolean);
  if (!terms.length) return [];
  const allowed = new Set(sourceIds);
  return index.filter(row => allowed.has(row.source.id) && terms.every(term => row.text.includes(term)))
    .map(row=>({...row,matchInCriterion:terms.every(term=>row.direct.includes(term)),
      score:terms.filter(term=>row.direct.includes(term)).length}))
    .sort((a,b)=>b.score-a.score);
}
