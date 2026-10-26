import {centralProposals,adoptModelQuestionPlan,adoptSourceQuestionPlan,adoptProcessQuestionPlan,subProposals,modelQuestionPlan,sourceQuestionPlan,processQuestionPlan} from './research-proposals.mjs';
import {addQuestion,editQuestion,setQuestionDesign,researchOf} from './research-plan.mjs';
import {mappedQuestionSuggestions} from './question-writing.mjs';
import {questionCandidate} from './question-quality.mjs';
import {reportQuestionText} from './source-question-presentation.mjs';
import {materialQuestionText} from './investigation.mjs';
import {findMaterial} from './material-lookup.mjs';

export function defaultSubquestionKeys(draft,_subs,_room=Math.max(0,199-researchOf(draft).questions.length)) {
 // Suggestions are choices, not a preselected research design.
 return [];
}

// Shared validated preparation for previews and ranking. Never changes saved
// questions, even when a matching source/model/process plan already exists.
function prepareQuestionStart(draft,proposal,context) {
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
 return result;
}
// Opening a choice needs its default selection, not the ranking's coverage count.
export function questionStartSelection(draft,proposal,context={}) {
 const result=prepareQuestionStart(draft,proposal,context);
 const subs=mappedQuestionSuggestions(proposal.key.startsWith('item:')?[]:subProposals(result.draft,result.questionId,null,context),draft);
 const room=Math.max(0,200-researchOf(result.draft).questions.length);
 const defaults=defaultSubquestionKeys(draft,subs,room);
 const directIds=subs.length?[]:(proposal.ids||[]).filter(id=>draft.included.includes(id));
 return {...result,subs,defaultKeys:defaults,directIds};
}
// Exact plan choices start without preselected children or direct IDs. The
// composer constructs its complete, editable menu after opening; a second menu
// here would be discarded. Adoption still validates the current draft/target.
export function questionStartChoice(draft,proposal,context={}) {
 if((proposal.modelId||/^(source|process):[^:]+/.test(proposal.key))&&!proposal.ids?.length)
  return {...prepareQuestionStart(draft,proposal,context),defaultKeys:[],directIds:[]};
 return questionStartSelection(draft,proposal,context);
}
// Ranking still uses the complete source/model/process coverage, not just the
// currently offered subquestions or their default selection.
function questionStartPlan(draft,proposal,context) {
 const direction=context.direction ?? draft.investigation?.goal?.direction;
 const source=proposal.key.match(/^source:([^:]+)/)?.[1];
 const process=proposal.key.match(/^process:([^:]+)/)?.[1];
 return proposal.modelId?modelQuestionPlan(draft,proposal.modelId,context):source?sourceQuestionPlan(draft,source,direction,context.subquestionDetail):process?processQuestionPlan(draft,process,direction):null;
}
const selectedMatches=(draft,questions,directIds=[])=>[...new Set([...questions.flatMap(s=>s.ids),...directIds])].filter(id=>draft.included.includes(id));
export function questionStartPreview(draft,proposal,context={}) {
 const selection=questionStartSelection(draft,proposal,context),plan=questionStartPlan(draft,proposal,context);
 return {...selection,matchedIds:selectedMatches(draft,plan?.subquestions||selection.subs,selection.directIds)};
}
function questionStartMatches(draft,proposal,context) {
 // The picker shows coverage, not a subquestion count. Exact plans already
 // supply that coverage; do not construct unused subquestion menus for them.
 // Keep adoption checks (target, question limit, design and source validity).
 if((proposal.modelId||/^(source|process):[^:]+/.test(proposal.key))&&!proposal.ids?.length){
  prepareQuestionStart(draft,proposal,context);
  const plan=questionStartPlan(draft,proposal,context);
  if(plan)return selectedMatches(draft,plan.subquestions);
 }
 // Themes and individual questions may use direct IDs only when no mapped
 // subquestions remain. Their existing full preview determines that fallback.
 return questionStartPreview(draft,proposal,context).matchedIds;
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
 const individual=(context.framework?.lines||[]).filter(l=>draft.included.includes(l.id)&&(draft.overrides?.[l.id]?.auditQuestion??l.auditQuestion?.text)?.trim())
  .map(l=>{
    const material=l.source_id && findMaterial(draft.investigation?.materials,l.id);
    const text=draft.overrides?.[l.id]?.auditQuestion ?? (l.source_id
      ? (material ? materialQuestionText(material,'question',{preserveLegacy:true}) : l.auditQuestion.text)
      : questionCandidate(reportQuestionText(l,'auditQuestion','onderzoeksvraag'),'onderzoeksvraag'));
    return {key:'item:'+l.id,label:l.title,text,ids:[l.id],adopted:roots.some(q=>q.text.trim()===l.auditQuestion.text.trim())};
  });
 // Prepared proposals can include locally edited model and material questions.
 // Existing source_id projections are saved materials, as in draftValue; their
 // text can have in-place edits too. Only known source defaults use receipts.
 return [...prepared,...individual].filter(p=>typeof p.text==='string'&&p.text.trim()&&p.text.length<=2000)
 .filter((p,i,all)=>all.findIndex(other=>other.key===p.key&&other.text===p.text)===i)
 .filter(p=>context.includeAccepted || context.targetId || (!p.adopted&&!roots.some(q=>
  (p.modelId&&q.modelId===p.modelId)|| (q.planKey&&q.planKey===(p.baseKey||p.key.match(/^(source|process):[^:]+/)?.[0]||p.key)))))
 .flatMap((proposal,index)=>{
  const resumeId=context.includeAccepted ? existingQuestionStart(draft,proposal)?.id : undefined;
  if(researchOf(draft).questions.length>=200&&!context.targetId&&!resumeId)return [];
  const matchedIds=questionStartMatches(draft,proposal,{...context,targetId:context.targetId||resumeId});
  return [{proposal,matched:matchedIds.length,index,resumeId}];
 }).filter(p=>p.matched>0).sort((a,b)=>b.matched-a.matched||a.index-b.index);
}

// Reopening a prepared route means editing its stable root, not replacing it or
// creating a duplicate. Wording can have been changed since its first adoption.
export function existingQuestionStart(draft,proposal) {
 const key=proposal.baseKey||proposal.key.match(/^(source|process):[^:]+/)?.[0]||proposal.key;
 return researchOf(draft).questions.find(q=>!q.parent_id&&
  ((proposal.modelId&&q.modelId===proposal.modelId)||q.planKey===key||q.text.trim()===proposal.text.trim()));
}
