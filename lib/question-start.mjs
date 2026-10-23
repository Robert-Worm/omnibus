import {centralProposals,adoptModelQuestionPlan,adoptSourceQuestionPlan,adoptProcessQuestionPlan,subProposals,modelQuestionPlan,sourceQuestionPlan,processQuestionPlan} from './research-proposals.mjs';
import {addQuestion,editQuestion,setQuestionDesign,researchOf} from './research-plan.mjs';
import {mappedQuestionSuggestions} from './question-writing.mjs';

export function defaultSubquestionKeys(draft,_subs,_room=Math.max(0,199-researchOf(draft).questions.length)) {
 // Suggestions are choices, not a preselected research design.
 return [];
}

// Opening a choice needs its default selection, not the ranking's coverage count.
// Keep the same validated adoption and suggestions; this remains a local preview.
export function questionStartSelection(draft,proposal,context={}) {
 const direction=context.direction ?? draft.investigation?.goal?.direction;
 const design=direction && proposal.topic ? {direction,topic:proposal.topic} : null;
 const options={text:proposal.text,origin:'suggested',design,selectedKeys:[],targetId:context.targetId,subquestionDetail:context.subquestionDetail};
 const source=proposal.key.match(/^source:([^:]+)/)?.[1];
 const process=proposal.key.match(/^process:([^:]+)/)?.[1];
 let result;
 if(proposal.modelId)result=adoptModelQuestionPlan(draft,proposal.modelId,'dimensions',context,options);
 else if(source)result=adoptSourceQuestionPlan(draft,source,'dimensions',options);
 else if(process)result=adoptProcessQuestionPlan(draft,process,'dimensions',options);
 else {const added=context.targetId?{draft:editQuestion(draft,context.targetId,proposal.text,'suggested'),question:{id:context.targetId}}:addQuestion(draft,null,proposal.text,'suggested');result={draft:setQuestionDesign(added.draft,added.question.id,design),questionId:added.question.id};}
 const subs=mappedQuestionSuggestions(proposal.key.startsWith('item:')?[]:subProposals(result.draft,result.questionId,null,context),draft);
 const room=Math.max(0,200-researchOf(result.draft).questions.length);
 const defaults=defaultSubquestionKeys(draft,subs,room);
 const directIds=subs.length?[]:(proposal.ids||[]).filter(id=>draft.included.includes(id));
 return {...result,subs,defaultKeys:defaults,directIds};
}
// Ranking still uses the complete source/model/process coverage, not just the
// currently offered subquestions or their default selection.
export function questionStartPreview(draft,proposal,context={}) {
 const selection=questionStartSelection(draft,proposal,context);
 const direction=context.direction ?? draft.investigation?.goal?.direction;
 const source=proposal.key.match(/^source:([^:]+)/)?.[1];
 const process=proposal.key.match(/^process:([^:]+)/)?.[1];
 const plan=proposal.modelId?modelQuestionPlan(draft,proposal.modelId,context):source?sourceQuestionPlan(draft,source,direction,context.subquestionDetail):process?processQuestionPlan(draft,process,direction):null;
 return {...selection,
  matchedIds:[...new Set([...(plan?.subquestions||selection.subs).flatMap(s=>s.ids),...selection.directIds])].filter(id=>draft.included.includes(id))};
}
/** @param {ReturnType<typeof centralProposals>|null} [preparedProposals] */
export function rankedQuestionStarts(draft,context={},preparedProposals=null) {
 // Every ranked result must match an included building block. Avoid building
 // and validating previews that are certain to be discarded for an empty draft.
 if(!draft.included.length)return [];
 const roots=researchOf(draft).questions.filter(q=>!q.parent_id);
 if(researchOf(draft).questions.length>=200&&!context.targetId&&!context.includeAccepted)return [];
 // The composer already needs these proposals. Reuse that exact result within
 // its render; other callers still compute from the current validated draft.
 const prepared=preparedProposals??centralProposals(draft,context);
 // Individual report questions also work when their navigation tab was closed.
 const individual=(context.framework?.lines||[]).filter(l=>draft.included.includes(l.id)&&l.auditQuestion?.text?.trim())
  .map(l=>({key:'item:'+l.id,label:l.title,text:draft.overrides?.[l.id]?.auditQuestion??l.auditQuestion.text,ids:[l.id],adopted:roots.some(q=>q.text.trim()===l.auditQuestion.text.trim())}));
 return [...prepared,...individual].filter(p=>typeof p.text==='string'&&p.text.trim()&&p.text.length<=2000)
 .filter((p,i,all)=>all.findIndex(other=>other.key===p.key&&other.text===p.text)===i)
 .filter(p=>context.includeAccepted || context.targetId || (!p.adopted&&!roots.some(q=>
  (p.modelId&&q.modelId===p.modelId)|| (q.planKey&&q.planKey===(p.baseKey||p.key.match(/^(source|process):[^:]+/)?.[0]||p.key)))))
 .flatMap((proposal,index)=>{
  const resumeId=context.includeAccepted ? existingQuestionStart(draft,proposal)?.id : undefined;
  if(researchOf(draft).questions.length>=200&&!context.targetId&&!resumeId)return [];
  const preview=questionStartPreview(draft,proposal,{...context,targetId:context.targetId||resumeId});
  return [{proposal,matched:preview.matchedIds.length,subCount:preview.subs.length,index,resumeId}];
 }).filter(p=>p.matched>0).sort((a,b)=>b.matched-a.matched||a.index-b.index);
}

// Reopening a prepared route means editing its stable root, not replacing it or
// creating a duplicate. Wording can have been changed since its first adoption.
export function existingQuestionStart(draft,proposal) {
 const key=proposal.baseKey||proposal.key.match(/^(source|process):[^:]+/)?.[0]||proposal.key;
 return researchOf(draft).questions.find(q=>!q.parent_id&&
  ((proposal.modelId&&q.modelId===proposal.modelId)||q.planKey===key||q.text.trim()===proposal.text.trim()));
}
