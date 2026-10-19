// Compilation/validation only. This module does not author or split audit meaning.
export const normalizedCoverage = text => text.normalize('NFKC').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
export function criterionCoverage(criterion, points) {
  const text=normalizedCoverage(criterion), used=new Uint8Array(text.length);
  for(const p of points)for(const fragment of p.covers || []){
    const needle=normalizedCoverage(fragment),start=text.indexOf(needle);
    if(!needle || start<0)throw Error('Dekkingsfragment niet in broncriterium: '+p.key+' '+fragment);
    for(let i=start;i<start+needle.length;i++)used[i]=1;
  }
  const gaps=[];let start=-1;
  for(let i=0;i<=text.length;i++){
    if(i<text.length&&!used[i]){if(start<0)start=i;}
    else if(start>=0){const gap=text.slice(start,i);if(gap.replace(/\ben\b/g,'').replace(/[\s.,;:()—–-]/g,''))gaps.push(gap);start=-1;}
  }
  return {complete:gaps.length===0,gaps};
}
const nonempty=(s)=>typeof s==='string'&&s.trim().length>0;
function phase(value, reason, key) {
  if(value==null){if(!nonempty(reason))throw Error('Reden ontbreekt voor niet geselecteerde fase '+key);return {status:'NOT_SELECTED',reason};}
  if(!Array.isArray(value)||value.length!==3||!value.every(nonempty))throw Error('Onvolledige zelfstandige fase '+key);
  return {status:'APPLICABLE',procedure:value[0],evidence:value[1],boundary:value[2]};
}
export function compileReportExpansion(line, report, item, materials) {
  const fail=message=>{throw Error(line.id+': '+message);};
  if(!nonempty(item.rationale)||!Array.isArray(item.points)||!item.points.length)fail('Splitsingsbesluit ontbreekt.');
  const coverage=criterionCoverage(line.criterion.text,item.points);
  if(!coverage.complete)fail('Onvolledige criteriumdekking: '+JSON.stringify(coverage.gaps));
  const allEvidence=[...new Set(Object.values(line).flatMap(v=>v?.evidence_ids || []))];
  const link=id=>{
    if(!allEvidence.includes(id))fail('Bron-ID buiten het oorspronkelijke item: '+id);
    const m=materials.find(m=>m.report_id===line.report_id&&m.evidence_ids.includes(id)&&m.locator_status==='EXACT');
    if(!m)fail('Geen exacte bronpassage: '+id);
    return {material_id:m.id,evidence_id:id,role:'MOTIVATES_PROPOSAL',authority:'NOT_ASSESSED',applicability:'NOT_ASSESSED'};
  };
  const keys=new Set();
  return item.points.map(p=>{
    if(!/^\d{2}$/.test(p.key)||keys.has(p.key))fail('Ongeldig of dubbel kind-ID '+p.key);keys.add(p.key);
    for(const key of ['title','text','qualifiers'])if(!nonempty(p[key]))fail('Ontbrekend '+key+' bij '+p.key);
    if(!Array.isArray(p.evidence)||!p.evidence.length||new Set(p.evidence).size!==p.evidence.length)fail('Geen unieke gerichte bronverwijzingen bij '+p.key);
    const phases={
      opzet:phase(p.opzet,p.phaseReasons?.opzet,p.key+' opzet'),
      bestaan:phase(p.bestaan,p.phaseReasons?.bestaan,p.key+' bestaan'),
      werking:{status:'NOT_SELECTED',reason:'Deze uitwerking selecteert opzet en/of bestaan. Een oordeel over werking over een periode vergt een afzonderlijke opdrachtkeuze, populatie en onderbouwde selectie.'},
      onderzoek:{status:'NOT_SELECTED',reason:'De toetsaanpak is per geselecteerde fase uitgewerkt; het oorspronkelijke onderzoeksvoorstel blijft bij het bronitem beschikbaar.'},
    };
    if(!Object.values(phases).some(p=>p.status==='APPLICABLE'))fail('Geen uitvoerbare fase bij '+p.key);
    let generic_variant;
    if(p.generic){
      for(const key of ['title','text'])if(!nonempty(p.generic[key]))fail('Onvolledige generieke variant '+p.key);
      generic_variant={title:p.generic.title,text:p.generic.text,phases:{...phases}};
      for(const key of ['opzet','bestaan']){
        if(phases[key].status==='APPLICABLE' && !p.generic[key])fail('Generieke fase ontbreekt '+p.key+' '+key);
        if(phases[key].status==='APPLICABLE')generic_variant.phases[key]=phase(p.generic[key],null,p.key+' generiek '+key);
      }
    }
    return {
      id:line.id+'/TP'+p.key,criterion_id:line.id+'/TC',objective_id:line.id+'/BD',legacy_line_id:line.id,report_id:line.report_id,
      title:p.title,text:p.text,basis:'PROPOSED',source_links:p.evidence.map(link),
      context_source_links:allEvidence.filter(id=>!p.evidence.includes(id)).map(link),
      qualifier_checks:[{status:'AUTHOR_CHECKED',meaning:p.qualifiers}],
      source_context:{report:report.scope||line.entity,local:[line.exportContext,line.finding.reason,line.criterion.reason,line.procedure.reason].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('\n\n')},
      phases,coverage:'NOT_ESTABLISHED',review_status:'AI_AUTHORED_PENDING_CROSS_REVIEW',human_validation:false,
      detail_level:'AUTHORED_POINTS',variant_available:Boolean(generic_variant),...(generic_variant?{generic_variant}:{}),
      decomposition:{rationale:item.rationale,covers:p.covers,semantic_qualifications:p.qualifiers},
      audit_inputs:{organisation:null,peildatum:null,period_start:null,period_end:null,population:null,selection_rationale:null,applicable_requirements:null},
      migration:'ADDITIVE_CHILD; retained /TC-ALL snapshots and question links are never silently rewritten',
    };
  });
}
