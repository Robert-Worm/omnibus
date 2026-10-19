import {cioCatalogue,cioPoints} from './cio-law-data.mjs';
import goals from './cio-goal-proposals.json' with {type:'json'};
import {cioControlMeasureFor} from './cio-content.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
// Browse routes, not a transfer of duties. Original actors, conditions and source
// relationships remain on each point and in its saved trace.
export const cioFunctionGroups=[
 ['cio','CIO · departementaal'],['ciso','CISO · departementaal'],
 ['cdo','(C)DO · data'],['cpo','(C)PO · privacy'],['cto','(C)TO · technologie'],
 ['cio-unit','CIO · dienstonderdeel'],['ciso-unit','CISO · dienstonderdeel'],
 ['cio-rijk','CIO Rijk'],['ciso-rijk','CISO Rijk'],['beraad','CIO-beraad'],
 ['rcn','CIO RCN'],['inrichting','Inrichting en gezamenlijke rollen'],['stelsel','Stelselafspraken en evaluatie'],
].map(([id,title])=>({id,title}));
export function cioFunctionFor(p){
 const article=p.id.match(/^C26-P-(\d{3})/)?.[1];
 if(article==='016')return /-0[45]$/.test(p.id)?'ciso-unit':'cio-unit';
 if(article==='017')return p.id.endsWith('-01')?'inrichting':p.id.endsWith('-03')?'ciso-rijk':'cio-rijk';
 if(article==='023')return p.id.endsWith('-04')?'cio':'cio-rijk';
 if(article==='022')return p.id.endsWith('-02')?'cio-rijk':p.id.endsWith('-03')?'cio':'beraad';
 const groups={'002':'rcn','003':'cio','004':'cio','005':'cio','006':'ciso','007':'ciso','008':'ciso',
  '009':'inrichting','010':'cdo','011':'cdo','012':'cpo','013':'cpo','014':'cto','015':'cto',
  '018':'cio-rijk','019':'cio-rijk','020':'ciso-rijk','021':'ciso-rijk','024':'stelsel','025':'stelsel'};
 if(!groups[article])throw Error('No reviewed browse route for '+p.id);
 return groups[article];
}
const element=(text='',basis='NOT_ESTABLISHED',reason='')=>({text,basis,reason,evidence_ids:[]});
const codes={cio:'CIO',ciso:'CISO',cdo:'CDO',cpo:'CPO',cto:'CTO','cio-unit':'CIO-D','ciso-unit':'CISO-D','cio-rijk':'CIO-R','ciso-rijk':'CISO-R',beraad:'BR',rcn:'RCN',inrichting:'INR',stelsel:'ST'};
export const cioFunctionRows=[];
catalogueDerived(()=>cioFunctionRows.splice(0,cioFunctionRows.length,...cioFunctionGroups.flatMap(group=>cioCatalogue.criteria.flatMap((c,index)=>{
 const points=cioPoints.filter(p=>p.criterion_id===c.id&&cioFunctionFor(p)===group.id);
 if(!points.length)return [];
 const objectives=cioCatalogue.objectives.filter(o=>c.objective_ids.includes(o.id));
 const measure=cioControlMeasureFor(c.id,group.id);
 const join=fn=>[...new Set(objectives.map(fn).filter(Boolean))].join('\n\n');
 return [{id:`C26-${String(index+1).padStart(3,'0')}-${codes[group.id]}`,criterionId:c.id,groupId:group.id,pointIds:points.map(p=>p.id),
  title:points.length===1?points[0].title:c.title,entity:group.title,navigationSubjects:[group.id],
  objective:element(join(o=>goals[o.id]?.text),'PROPOSED',join(o=>goals[o.id]?.rationale)),
  risk:element(join(o=>o.risk),'PROPOSED','Analytische risicoafleiding bij de gekoppelde beheersdoelstelling.'),
  controlObjective:element(join(o=>o.text),'PROPOSED',join(o=>o.rationale)),
  // The browse row only represents this function's points. The unchanged
  // shared parent criterion is shown in detail and retained in saved traces.
  criterion:element(points.map(p=>p.text).join('\n\n'),'INFERRED',c.composition_rationale),
  articleReferences:[...new Set(points.map(p=>`Art. ${Number(p.id.match(/^C26-P-(\d{3})/)[1])}`))],
  control:element(measure.text,measure.basis,measure.reason),finding:element(),auditQuestion:element(),procedure:element(),owner:element(),
  relationships:[],controlStatus:Object.fromEntries(['design','implementation','operation'].map(k=>[k,{value:'NOT_ESTABLISHED',explanation:'Geen naleving vastgesteld.',evidence_ids:[]}]))}];
}))));
