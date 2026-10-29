import {modelResearchPlans} from '../lib/model-research-plan.mjs';
import {researchQuestionFormulations} from '../lib/research-question-formulations.mjs';

// Exact offered route with every indicator selected, before personal context.
// A complete inventory is evidence to review, never an approval by itself.
export function modelResearchInventory(model) {
  const materials=model.items.flatMap(item=>(item.indicators?.length?item.indicators:[{id:''}])
    .map(indicator=>({id:`${item.id}/${indicator.id}`,originKey:model.id+':'+item.id,
      location:item.id+' / '+indicator.id,topic:''})));
  const plan=modelResearchPlans([{...model,selected:true,researchSubject:''}],materials)[0];
  if(!plan)return [];
  const seeds=[{id:model.id+'/central',text:plan.text},...plan.subquestions.map(q=>({
    id:q.key,text:q.text,indicatorIds:q.indicatorIds??[],materialIds:q.ids}))];
  return seeds.flatMap(q=>researchQuestionFormulations(q.text).map((text,index)=>({
    ...q,targetId:q.id+'/research-cycle:'+index,index,text})));
}
