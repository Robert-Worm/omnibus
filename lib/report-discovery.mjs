// Combine navigation membership, not the reviewed mappings or source content.
// Several admitted reports can contribute to the same established process.
export function reportDiscoveryProcesses(mappings, establishedProcesses) {
  const groups=new Map();
  for(const mapping of mappings) {
    const process=establishedProcesses.find(p=>p.id===mapping.process_id);
    if(!process)throw Error('Onbekende beoordeelde proceskoppeling '+mapping.process_id);
    if(!Array.isArray(mapping.line_ids)||mapping.line_ids.some(id=>typeof id!=='string'||!id))
      throw Error('Ongeldige beoordeelde procesleden.');
    let group=groups.get(process.id);
    if(!group) {
      group={id:'report-'+process.id,title:process.title,
        themeIds:process.id==='PR13'?['governance']:process.id==='PR12'?['governance','information']:['digital','information'],
        lineIds:[],foundationIds:[],reasons:[]};
      groups.set(process.id,group);
    }
    for(const id of mapping.line_ids)if(!group.lineIds.includes(id))group.lineIds.push(id);
    if(mapping.reason&&!group.reasons.includes(mapping.reason))group.reasons.push(mapping.reason);
  }
  return [...groups.values()].map(({reasons,...group})=>({...group,reason:reasons.join('\n\n')}));
}
