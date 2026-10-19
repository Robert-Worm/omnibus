import ivho from '../app/reviewed-ivho-display.json' with {type:'json'};
import boc from '../app/reviewed-boc-display.json' with {type:'json'};
import begroting from '../app/reviewed-begroting-display.json' with {type:'json'};
import hvp from '../app/reviewed-hvp-display.json' with {type:'json'};
import bsa from '../app/reviewed-bsa-display.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};
// Presentation-only adapter: sealed pages, evidence offsets and hashes never change.
export function reportDisplaySource(reportId,source){
 if(additions.corpus.some(entry=>entry.framework.report.id===reportId))return {...source,pages:source.pages.map(page=>{
  const visual=additions.visual_sources.filter(v=>v.report_id===reportId&&v.page===page.page);
  return visual.length?{...page,incompleteText:true,visualContext:visual.map(v=>({id:v.id,label:'Visuele broncontext · geen letterlijk tekstcitaat',text:v.observation+'\n\n'+v.interpretation_limit,image_hashes:[{sha256:v.image_sha256}]}))}:page;
 })};
 if(reportId==='BSA2324')return {...source,pages:source.pages.map(page=>{
  if(page.page!==18)return page;
  const v=bsa.pages.find(p=>p.page===18);
  return {...page,incompleteText:true,visualContext:[{id:'BSA2324-V18',label:'Tariefmatrix · visuele broncontext',
   text:v.observation+'\n\n'+v.consequence+'\n\n'+v.uncertainty,image_hashes:[{sha256:v.image_sha256}]}]};
 })};
 if(reportId==='HVP25')return {...source,pages:source.pages.map(page=>{
  if(![11,14,18,22,31,32,33].includes(page.page))return page;
  const v=hvp.pages.find(p=>p.page===page.page);
  return {...page,...([11,14,18,22,32,33].includes(page.page)?{incompleteText:true}:{}),visualContext:[{id:'HVP25-V'+page.page,
   label:page.page>=31?'Managementreactie · visuele broncontext':'Extractiebeperking · visuele broncontext',
   text:v.observation+'\n\n'+v.consequences_for_interpretation_and_offsets,image_hashes:[{sha256:v.image_sha256}]}]};
 })};
 if(reportId==='BEGVOORB25')return {...source,pages:source.pages.map(page=>{
  const visual=begroting.observations.find(p=>p.page===page.page&&p.image_only_bounded_failure_records.length);
  return !visual?page:{...page,incompleteText:true,visualContext:[{id:'BEGVOORB25-V'+page.page,label:'Figuur of tabel · visuele broncontext',
   text:visual.interpretation_or_offset_consequences,image_hashes:[{sha256:visual.image_sha256}]}]};
 })};
 if(reportId==='BOC25')return {...source,pages:source.pages.map(page=>page.page<37||page.page>44?page:{...page,incompleteText:true,
  visualContext:boc.claims.filter(c=>c.page===page.page).map(c=>({id:c.id,label:'Managementbijlage · visuele broncontext',
   text:c.voice+' · '+c.location+'\n\n'+c.reconciler_observation,
   image_hashes:[{sha256:boc.pages.find(p=>p.page===page.page).image_read_sha256}],
   transcription:{text:c.transcription,method:'Visueel gecontroleerde transcriptie; typografie genormaliseerd. Geen letterlijke tekstspan uit de ruwe extractie. Bronstem en historische datum blijven van toepassing.'}
  }))
 })};
 if(reportId!==ivho.reportId)return source;
 return {...source,pages:source.pages.map(page=>page.page!==ivho.page?page:{...page,incompleteText:true,
  visualContext:ivho.supplements.map((item,i)=>({id:item.id,label:'Managementreactie · visuele broncontext',text:item.text+'\n\n'+item.interpretation_limit,image_hashes:[{sha256:ivho.imageSha256}],...(i===0?{transcription:ivho.transcription}:{})}))
 })};
}
