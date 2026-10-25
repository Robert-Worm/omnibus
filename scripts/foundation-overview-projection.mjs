const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
const fields=['objective','risk','controlObjective','control','criterion'];

/** Exact viewer/search projection, never an extraction or selectable material.
 * Keep every row, point and HOLD identity, including those outside the viewport.
 * Full traces, tests and source passages remain behind the existing boundary. */
export function projectFoundationOverview(sourceId,{rows,points,records,groups},originKey=id=>sourceId+':'+id){
  const pointIds=new Set(points.map(p=>p.id)),recordIds=new Set(records.map(r=>r.id));
  if(!sourceId||pointIds.size!==points.length||new Set(rows.map(r=>r.id)).size!==rows.length||
      recordIds.size!==records.length||rows.some(r=>r.pointIds.some(id=>!pointIds.has(id)))||
      points.some(p=>!originKey(p.id)||!['SELECTABLE','HOLD','CONTEXT_ONLY'].includes(p.selection_status)||p.source_links.some(link=>!recordIds.has(link.record_id))))throw Error('Invalid foundation overview identity.');
  const empty={text:'',basis:'NOT_ESTABLISHED',reason:'',evidence_ids:[]};
  return {sourceId,groups,
    rows:rows.map(row=>({...pick(row,['id','criterionId','groupId','pointIds','title','entity','navigationSubjects','articleReferences','controlStatus']),
      ...Object.fromEntries(fields.map(key=>[key,row[key]])),displayOnly:true,
      sourceItems:(row.sourceItems||[]).filter(item=>fields.includes(item.kind)),
      finding:empty,auditQuestion:empty,procedure:empty,owner:empty,relationships:[]})),
    points:points.map(p=>({...pick(p,['id','title','text','chapter','selection_status','conditions','exceptions']),originKey:originKey(p.id),
      addressees:p.addressees.map(a=>({label:a.label})),source_links:p.source_links.map(l=>pick(l,['record_id','contribution']))})),
    records:records.map(r=>({id:r.id,locator:r.locator,source_spans:r.source_spans.map(s=>({page:s.page}))})),
  };
}
