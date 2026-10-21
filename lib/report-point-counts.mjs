/** Count the complete catalogue once, independently of mounted viewer rows.
 * @param {{blocks:{id:string}[],points:{id:string,legacy_line_id:string}[]}} catalogue
 * @param {{included:string[],investigation?:{materials?:Record<string,string>[]}}} draft
 */
export function reportPointCounts(catalogue,draft) {
  const included=new Set(draft.included);
  const chosen=new Set((draft.investigation?.materials??[]).filter(m=>included.has(m.id)).map(m=>m.sourcePointId));
  const counts=Object.fromEntries(catalogue.blocks.map(block=>[block.id,{
    total:0,selected:0,legacySelected:included.has(block.id)||chosen.has(block.id+'/TC-ALL'),
  }]));
  for(const point of catalogue.points){
    const count=counts[point.legacy_line_id];
    if(!count)continue;
    count.total++;
    if(chosen.has(point.id))count.selected++;
    if(point.id===point.legacy_line_id+'/TC-ALL')count.legacySelected=included.has(point.legacy_line_id);
  }
  return counts;
}
