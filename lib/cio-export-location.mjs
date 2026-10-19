// Export presentation only. Read the selected point's saved provenance, not the
// current catalogue or the union of parent/objective/context records. Preserve
// all primary clauses (including introductory text on a different page).
export function cioPointExportLocation(serializedTrace) {
  if(!serializedTrace)return '';
  let trace;
  try{trace=typeof serializedTrace==='string'?JSON.parse(serializedTrace):serializedTrace;}catch{return '';}
  if(!Array.isArray(trace?.point?.source_links)||!Array.isArray(trace.records))return '';
  const ids=[...new Set(trace.point.source_links.filter(l=>l.contribution==='PRIMARY').map(l=>l.record_id))];
  if(!ids.length)return '';
  const references=[];
  for(const id of ids){
    const record=trace.records.find(r=>r.id===id);
    if(!record?.locator?.trim()||!Array.isArray(record.source_spans))return '';
    const pages=[...new Set(record.source_spans.filter(s=>typeof s.quote==='string'&&s.quote.trim()&&Number.isInteger(s.page)&&s.page>0).map(s=>s.page))].sort((a,b)=>a-b);
    if(!pages.length)return '';
    references.push(record.locator.trim()+' · p. '+pages.join(', '));
  }
  return [...new Set(references)].join('\n');
}
