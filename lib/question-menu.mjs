import {subProposalsByDetail,adoptSubProposal,sourceQuestionDetails,processQuestionDetails} from './research-proposals.mjs';
import {researchOf,questionLineIds,deleteQuestion,editQuestion} from './research-plan.mjs';
import {proposalFormulation} from './research-question-formulations.mjs';

export const savedSubquestionKey=q=>q.planPartKey||q.modelDimensionKey||'existing:'+q.id;

// Both levels are one selection. Saved questions retain their exact wording and
// manually adjusted links, including questions without any current source match.
export function questionMenuChoices(draft,parentId,context={}) {
 const root=researchOf(draft).questions.find(q=>q.id===parentId);
 if(!root)return [];
 const children=researchOf(draft).questions.filter(q=>q.parent_id===parentId);
 const levels=root.planKey?.startsWith('source:')?sourceQuestionDetails(root.planKey.slice(7)):
  root.planKey?.startsWith('process:')?processQuestionDetails(root.planKey.slice(8)):['specific'];
 const proposed=[...new Map(subProposalsByDetail(draft,parentId,levels,
  {...context,includeAdopted:true}).map(s=>[s.key,s])).values()];
 const used=new Set();
 const choices=proposed.flatMap(s=>{
  const existing=children.find(q=>!used.has(q.id)&&(savedSubquestionKey(q)===s.key||q.text===s.text));
  if(existing)used.add(existing.id);
  const ids=existing?questionLineIds(draft,existing.id):s.ids.filter(id=>draft.included.includes(id));
  if(!existing&&!ids.length)return [];
  return [{...s,key:existing?savedSubquestionKey(existing):s.key,text:existing?.text??s.text,ids,
   existingId:existing?.id,detail:s.key.includes(':broad:')?'broad':'specific'}];
 });
 for(const q of children.filter(q=>!used.has(q.id)))choices.push({key:savedSubquestionKey(q),text:q.text,
  ids:questionLineIds(draft,q.id),existingId:q.id,detail:q.planPartKey?.includes(':broad:')?'broad':'specific'});
 return choices;
}

// Only explicit menu acceptance may remove an unchecked child. Root, other
// roots, selected material and links of retained questions remain untouched.
export function applyQuestionMenu(draft,parentId,choices,chosenKeys,formulations={},context={}) {
 let next=draft;
 const chosen=new Set(chosenKeys),children=researchOf(draft).questions.filter(q=>q.parent_id===parentId);
 for(const s of choices){
  const existing=children.find(q=>q.id===s.existingId);
  if(existing){
   if(!chosen.has(s.key))next=deleteQuestion(next,existing.id);
   else {
    const text=proposalFormulation(existing.text,formulations[s.key]);
    if(text!==existing.text)next=editQuestion(next,existing.id,text,existing.origin);
   }
  }
 }
 for(const key of chosenKeys){
  const s=choices.find(s=>s.key===key);
  if(!s||s.existingId)continue;
  next=adoptSubProposal(next,parentId,key,{...context,includeAdopted:false,allowOverlap:true,subquestionDetail:s.detail},
   {formulation:formulations[key]});
 }
 return next;
}
