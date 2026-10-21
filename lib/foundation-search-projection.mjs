// Search/display only. Never copy tests, evidence snapshots or selection payloads.
// Keep every field consumed by criterionIndex and the search-result cards, so
// source-context matches and applicability labels stay identical to full data.
const fields = ['id','originKey','sourceId','title','auditNorm','body','groupTitle',
  'groupDescription','sourceContext','rationale','topic','location','sourceControlId',
  'previousIds','auditRole','effectiveStatus'];
export function projectFoundationSearch(items, sources) {
  const bySource = Object.fromEntries(sources.map(source => [source.id, []]));
  const seen = new Set();
  for (const [searchOrder,item] of items.entries()) {
    if (!Object.hasOwn(bySource, item.sourceId) || !item.id || !item.originKey || seen.has(item.originKey))
      throw Error('Invalid foundation search identity');
    seen.add(item.originKey);
    bySource[item.sourceId].push({...Object.fromEntries(fields.filter(key => item[key] !== undefined).map(key => [key,item[key]])),searchOrder});
  }
  return bySource;
}
