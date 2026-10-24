import { centralSuggestions as themeCentral, scopedSubSuggestions as themeSubs, themeCatalogue } from "./theme-workspaces.mjs";
import { foundationQuestionPlans } from "./foundations/registry.mjs";
import { foundations, foundationProposals, validateInvestigation } from "./investigation.mjs";
import { addQuestion, editQuestion, linkLine, researchOf, setQuestionDesign } from "./research-plan.mjs";
import { activeProcesses as processes, processResearchTopics } from "./process-catalogue.mjs";
import { directionPlan, intendedUseQuestion } from "./research-directions.mjs";
import { researchGoalText } from './research-goal.mjs';
import { contextualModelQuestion, contextualQuestion } from "./model-context.mjs";
import { directedSourceQuestions, researchTopicQuestion } from './research-wording.mjs';
import {cioCatalogue,cioSourceId} from './cio-law-data.mjs';
import {cioQuestionGroups} from './cio-question-detail.mjs';
import {proposalFormulation} from './research-question-formulations.mjs';
import {catalogueDerived} from './catalogue-runtime.mjs';
import {topicalPackage} from './topical-content.mjs';
import {questionCandidate} from './question-quality.mjs';

const normalized = text => (text || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");
const matches = (a, b) => normalized(a) === normalized(b);
// The form gate is shared with export. Passing it is still not a substantive
// review receipt; saved research questions never pass through this projection.
function candidatePlan(plan) {
  return plan && questionCandidate(plan.text, 'onderzoeksvraag') ? {...plan,
    subquestions: plan.subquestions.filter(q => questionCandidate(q.text, 'onderzoeksvraag'))} : null;
}
// Presentation only: equal wording shares a preview, never its source identity,
// adoption state, subquestions or mappings. Near-equal questions stay separate.
export function groupCentralProposals(proposals) {
  const groups = new Map();
  for (const proposal of proposals) {
    const key = normalized(proposal.text);
    if (!groups.has(key)) groups.set(key, {text:proposal.text, proposals:[]});
    groups.get(key).proposals.push(proposal);
  }
  return [...groups.values()];
}
// Coverage describes the explicit editorial mapping, not proven audit coverage.
// Research-question wording may follow selected titles; norms are never rewritten.
const catalogueByOrigin = new Map();
catalogueDerived(() => {
  // Catalogue contents arrive on demand; refresh on load and on rollback.
  catalogueByOrigin.clear();
  for (const item of foundationProposals) catalogueByOrigin.set(item.originKey, item);
});
function mappedSubquestion(q, selected, key, label) {
  const expected = [...new Set(q.originKeys || [])];
  const ids = q.ids || selected.filter(m => expected.includes(m.originKey)).map(m => m.id);
  const matched = new Set(selected.filter(m => ids.includes(m.id)).map(m => m.originKey));
  // Scope provisions remain in the source plan, but cannot be selected as criteria.
  // Unknown mappings stay visible: they must not be presented as unchosen criteria.
  const missing = expected.filter(origin => !matched.has(origin)&&catalogueByOrigin.get(origin)?.auditRole!=='scope');
  const missingCriteria = missing.map(originKey=>{
    const item=catalogueByOrigin.get(originKey);
    return {originKey,code:item?.sourceControlId||item?.id||originKey,
      title:item?.title||'Niet beschikbaar in de huidige catalogus',available:Boolean(item)};
  });
  return {key, text: q.text, ids, label,
    selectedTitles:selected.filter(m=>ids.includes(m.id)).map(m=>m.title),
    ...(missing.length ? {scopeNote:'Controleer of de vraag past bij je selectie.',missingCriteria} : {})};
}
// Research questions for the auditor, not verbatim interview prompts or new norms.
const cevDimensionQuestions = {
  AI01:'In hoeverre is voor mensen duidelijk wat in het werk van hen wordt verwacht',
  AI02:'Welk voorbeeld geven leidinggevenden en bestuur in hun dagelijkse keuzes',
  AI03:'Welke mogelijkheden en belemmeringen ervaren mensen om hun werk zorgvuldig uit te voeren',
  AI04:'Wat helpt of belemmert mensen om zich in te zetten voor de gezamenlijke afspraken',
  AI05:'Hoe komen het handelen van mensen en de gevolgen daarvan in beeld',
  AI06:'Hoe worden vragen, twijfels en lastige situaties besproken',
  AI07:'Hoe spreken mensen elkaar aan op wat zij doen',
  AI08:'Hoe wordt gereageerd op het naleven en niet naleven van afspraken',
};

// Editorial research proposals, not additional legal requirements or automatic selection.
function sourcePlans(draft,subquestionDetail='specific',wb=validateInvestigation(draft.investigation)) {
  const materials = wb.materials.filter(m => draft.included.includes(m.id));
  return foundations.flatMap(source => {
    const selected = materials.filter(m => m.foundationId === source.id ||
      (!m.foundationId && m.sourceUrl === source.url && m.sourceTitle === source.title));
    if (!wb.sourceIds.includes(source.id) && !selected.length) return [];
    const topicalPlan=topicalPackage(source.id)?.questionPlan;
    // Historical mappings are compatibility alternatives, not additional gaps.
    const activeTopicalPlan=topicalPlan&&{...topicalPlan,subquestions:topicalPlan.subquestions.map(q=>({...q,originKeys:q.originKeys.filter(key=>catalogueByOrigin.has(key)||selected.some(m=>m.originKey===key))}))};
    const prepared = source.id===cioSourceId ? {
      central:'Hoe zijn de voor dit onderzoek toepasselijke taken en bevoegdheden van het CIO-stelsel ingericht en aantoonbaar ingevuld?',
      subquestions:cioQuestionGroups(cioCatalogue.objectives,subquestionDetail).map(g=>({key:subquestionDetail==='broad'?'broad:'+g.key:g.key,text:g.text,originKeys:cioCatalogue.points.filter(p=>p.selection_status==='SELECTABLE'&&p.objective_ids.some(id=>g.objectives.includes(id))).map(p=>cioSourceId+':'+p.id)})),
    } : activeTopicalPlan || foundationQuestionPlans[source.id];
    const plan = prepared || {
      central: `Hoe zijn de voor dit onderzoek relevante onderdelen van ${source.title} uitgewerkt en hoe wordt de uitvoering onderbouwd?`,
      subquestions: [
        { text: `Welke onderdelen van ${source.title} zijn van toepassing op ons onderzoek en waarom?`, originKeys: [] },
        ...selected.map(m => ({...m, question: draft.overrides?.[m.id]?.auditQuestion ?? m.question}))
          .filter(m => m.question?.trim()).map(m => ({ key:`material:${m.id}`, text: m.question, ids: [m.id] })),
        ...(!selected.length ? [
          { text: "Hoe zijn de gekozen onderdelen vertaald naar afspraken, verantwoordelijkheden en toetsbare normen?", originKeys: [] },
          { text: "Met welk bewijs kan de uitvoering worden beoordeeld en welke tekortkomingen vragen opvolging?", originKeys: [] },
        ] : []),
      ],
    };
    // A curated plan must not hide questions the auditor added personally.
    // Do not infer mappings for unknown catalogue origin keys.
    const customQuestions = prepared ? selected.filter(m => !m.originKey)
      .map(m => ({...m, question: draft.overrides?.[m.id]?.auditQuestion ?? m.question}))
      .filter(m => m.question?.trim())
      .map(m => ({key:`material:${m.id}`, text:m.question, ids:[m.id]})) : [];
    return [{ key: `source:${source.id}`, sourceId: source.id, label: source.title, text: plan.central,
      ...(source.id===cioSourceId?{subquestionDetail}:{}),
      subquestions: [...plan.subquestions, ...customQuestions].map((q, i) =>
        mappedSubquestion(q, selected, `source:${source.id}:${q.key ?? i}`, source.title)) }];
  });
}

// Both catalogue adoption and the central-question picker use this same plan.
// Only explicit adoption changes questions; saved text and manual links stay put.
function directedPlan(draft, plan, direction = draft.investigation?.goal?.direction) {
  const topic = draft.investigation?.goal?.subject?.trim() || plan.topic || `de toepassing van ${plan.label}`;
  const design = directionPlan(direction, topic, draft.investigation?.researchApproach);
  return design ? {...plan, text:design.text, direction, topic,
    subquestions:directedSourceQuestions(plan.sourceId || (plan.processId === 'PR01' ? 'DEVOPS' : ''), plan.subquestions, direction)} : plan;
}

function modelPlans(draft, models = [], wb=validateInvestigation(draft.investigation)) {
  const materials = wb.materials.filter(m => draft.included.includes(m.id));
  return models.filter(model => model.selected || materials.some(m => m.originKey?.startsWith(model.id + ":")))
    .filter(model => model.question?.trim()).map(model => ({
      key: `model:${model.id}`, modelId: model.id, label: model.officialName || model.title,
      modelSubject:model.researchSubject?.trim() || '',
      text: contextualModelQuestion(model),
      subquestions: model.researchSubquestions ? model.researchSubquestions.flatMap(sub => {
        const selected = materials.filter(m => m.originKey?.startsWith(model.id + ':') &&
          sub.indicatorIds.includes(m.location?.split(' / ')[1]) && matches(m.topic, model.researchSubject));
        return selected.length ? [{key: `model:${model.id}:${sub.id}`,
          text: contextualQuestion(sub.question, model.researchSubject),
          indicatorIds: [...sub.indicatorIds], ids: selected.map(m => m.id)}] : [];
      }) : model.items.flatMap(item => {
        const selected = materials.filter(m => m.originKey?.startsWith(model.id + ":") &&
          m.location?.split(" / ")[0] === item.id && matches(m.topic,model.researchSubject));
        if (!selected.length) return [];
        return [{ key: `model:${model.id}:${item.id}`,
          text: item.researchQuestion ? contextualQuestion(item.researchQuestion, model.researchSubject) : model.id==='CEV-AI' && cevDimensionQuestions[item.id]
            ? `${cevDimensionQuestions[item.id]}${model.researchSubject ? ' bij ' + model.researchSubject : ''}?`
            : model.kind === "kaptein"
            ? `Wat helpt of belemmert zorgvuldig handelen op het gebied van ${item.title.toLocaleLowerCase("nl")}${model.researchSubject ? " bij " + model.researchSubject : ""}?`
            : `Wat blijkt uit de gekozen indicatoren over ${item.title.toLocaleLowerCase("nl")}${model.researchSubject ? " bij " + model.researchSubject : ""}?`,
          ids: selected.map(m => m.id) }];
      }),
    }));
}

// Process identity survives wording changes. Only explicit, reviewed mappings
// attach criteria; a link to a broad framework is not evidence of relevance.
export function processQuestionPlan(draft, processId, direction = draft.investigation?.goal?.direction) {
  const process = processes.find(p => p.id === processId);
  if (!process) return null;
  return candidatePlan(processPlan(draft,process,validateInvestigation(draft.investigation),direction));
}
function processPlan(draft,process,wb,direction=draft.investigation?.goal?.direction) {
  const processId=process.id;
  const selected = wb.materials.filter(m => draft.included.includes(m.id));
  const questions = processId === 'PR01' ? foundationQuestionPlans.DEVOPS.subquestions.map((q,i)=>({...q,originKeys:[...q.originKeys,...(i===1?['DORA:2022-2554-R01-R06:026']:[])]})) : processId === 'PR02' ? [
    {text:'Hoe wordt bepaald wie welke toegang nodig heeft?', originKeys:['NIS2:2022-2555-C2:022']},
    {text:'Hoe worden toegangsrechten toegekend, gewijzigd en ingetrokken?', originKeys:['DORA:2022-2554-R01-R06:024']},
    {text:'Hoe wordt gecontroleerd of toegangsrechten nog passen bij het werk?', originKeys:[]},
  ] : processId === 'PR03' ? foundationQuestionPlans.AVG.subquestions.map((q,i)=>({...q,
    // Legacy user snapshots retain their own text and IDs; only an explicit
    // question-plan action may link them alongside the reviewed catalogue.
    originKeys:[...q.originKeys,...[['AVG-proposal-1'],['AVG-proposal-2'],['AVG-proposal-3']][i]],
  })) : (processResearchTopics[processId] || []).map(topic => ({
    text: researchTopicQuestion(topic, direction), originKeys: [],
  }));
  return directedPlan(draft, {key:`process:${process.id}`, processId:process.id, label:process.title,
    topic:process.title.toLocaleLowerCase('nl'), text:process.question,
    subquestions:questions.map((q,i)=>({...mappedSubquestion(q,selected,`process:${process.id}:${i}`,process.title),
      scopeNote: 'Procesvoorstel: controleer of de vraag past bij de gekozen normen. Niet alle onderdelen van het proces hoeven in je onderzoek te vallen.'}))},direction);
}
function processPlans(draft,wb) {
  const roots=researchOf(draft).questions.filter(q=>q.parent_id===null);
  return processes.filter(p=>draft.investigation?.processId===p.id || roots.some(q=>q.planKey===`process:${p.id}` || matches(q.text,p.question)))
    .map(p=>processPlan(draft,p,wb));
}
// One synchronous calculation shares one fresh validation result internally.
// Never keep it between calls or accept a caller-supplied validation shortcut.
function plans(draft,context,wb) {
  return [...processPlans(draft,wb), ...sourcePlans(draft,context.subquestionDetail,wb), ...modelPlans(draft,context.models,wb)];
}

export function chooseProcess(draft, processId) {
  const process=processes.find(p=>p.id===processId);
  if(!process)throw Error('Onbekend proces.');
  const wb=validateInvestigation(draft.investigation);
  return {...draft,investigation:{...wb,processId,scope: !wb.scope || processes.some(p=>p.title===wb.scope) ? process.title : wb.scope}};
}
/** @param {string} [mode] */
export function adoptProcessQuestionPlan(draft, processId, mode, options={}) {
  if(!processQuestionPlan(draft,processId))throw Error('Onbekend proces.');
  const existing=researchOf(draft).questions.find(q=>q.parent_id===null &&
    (options.targetId ? q.id===options.targetId : q.planKey===`process:${processId}`));
  return adoptQuestionPlan(chooseProcess(draft,processId),processQuestionPlan(draft,processId,options.design?.direction),mode ?? existing?.linkMode ?? 'manual',options);
}
/** @returns {Array<{key:string, label:string, text:string, adopted:boolean, modelId?:string, topic?:string, direction?:string}>} */
export function centralProposals(draft, context = {}) {
  const goal = draft.investigation?.goal;
  const direction = context.direction ?? goal?.direction;
  const roots = researchOf(draft).questions.filter(q => q.parent_id === null);
  const wb = validateInvestigation(draft.investigation), sourceIds = wb.sourceIds;
  // Viewer tabs are navigation, not the research selection. A source with
  // currently selected, mapped building blocks remains eligible when closed.
  // Retained but deselected material does not revive a source; model opt-in stays unchanged.
  const activePlans = plans(draft, context, wb).filter(p =>
    (!p.sourceId || sourceIds.includes(p.sourceId) || p.subquestions.some(s=>s.ids.length>0)) &&
    (!p.modelId || context.models?.some(m => m.id === p.modelId && m.selected)));
  let all = [...activePlans, ...themeCentral(draft, context.themeIds || [], context.framework)
    .map(p => ({...p, label: "Thema"}))];
  if (direction) {
    const themes = context.framework ? themeCatalogue(context.framework) : [];
    all = all.map(p => {
      const model = (context.models || []).find(m => p.key === `model:${m.id}`);
      // A model's prepared question and dimension plan are one coherent proposal.
      // Do not replace its central question with an unrelated generic intervention template.
      if (model) return p;
      const theme = themes.find(t => t.id === p.themeId);
      const label = theme?.title || p.label;
      const topic = p.topic || (model ? (model.researchSubject?.trim() || `het handelen in de organisatie vanuit ${label}`)
        : p.sourceId ? `de toepassing van ${label}` : (theme?.title.toLocaleLowerCase("nl") || "het gekozen proces"));
      if (p.sourceId || p.processId) return {...directedPlan(draft,p,direction),key:`${p.key}:${direction}`,baseKey:p.key};
      const plan = directionPlan(direction, topic, draft.investigation?.researchApproach);
      return plan ? {...p, ...plan, key: `${p.key}:${direction}`, label} : p;
    });
  }
  if (researchGoalText(goal) && direction) {
    const plan = directionPlan(direction, goal.subject, draft.investigation?.researchApproach);
    if (plan) {
      // Same research design, second wording: one that carries the intended use.
      // Offered beside the plain one so the auditor chooses, rather than being
      // handed a single long question.
      const withUse = intendedUseQuestion(plan.text, direction, goal.intendedUse);
      if (withUse) all.unshift({...plan, text: withUse, key: `goal:${direction}:use`,
        label: 'Bij je onderzoeksdoelstelling · met het beoogde gebruik'});
      all.unshift({...plan, key: `goal:${direction}`, label: 'Bij je onderzoeksdoelstelling'});
    }
  }
  return all.filter((p, i) => questionCandidate(p.text, 'onderzoeksvraag') &&
    all.findIndex(other => matches(other.text, p.text) && other.modelId === p.modelId && other.sourceId === p.sourceId && other.processId === p.processId) === i)
    .map(p => ({...p, ...(p.subquestions ? {subquestions:p.subquestions.filter(q => questionCandidate(q.text,'onderzoeksvraag'))} : {}),
      adopted: roots.some(q => matches(q.text, p.text) && (!p.modelId || q.modelId === p.modelId) && (!(p.sourceId || p.processId) || q.planKey === (p.baseKey || p.key)))}));
}

// Preview and explicit adoption only use already-collected, still-selected model questions.
export function modelQuestionPlan(draft, modelId, context = {}) {
  return candidatePlan(modelPlans(draft, context.models).find(p => p.modelId === modelId));
}

export function sourceQuestionPlan(draft, sourceId, direction = draft.investigation?.goal?.direction, subquestionDetail='specific') {
  const plan = sourcePlans(draft,subquestionDetail).find(p => p.sourceId === sourceId);
  return candidatePlan(plan ? directedPlan(draft, plan, direction) : null);
}

export function adoptSourceQuestionPlan(draft, sourceId, mode = "dimensions", options = {}) {
  const detail=options.subquestionDetail ?? researchOf(draft).questions.find(q=>q.id===options.targetId)?.subquestionDetail;
  const plan = sourceQuestionPlan(draft, sourceId, options.design?.direction,detail);
  if (!plan) throw new Error("Dit kader is niet beschikbaar in uw selectie.");
  return adoptQuestionPlan(draft,plan,mode,options);
}
function adoptQuestionPlan(draft, plan, mode, options) {
  if (!["manual","central","dimensions"].includes(mode)) throw new Error("Onbekende koppelwijze.");
  if(!plan)throw Error('Dit onderzoeksplan is niet beschikbaar.');
  let next = draft;
  let root = researchOf(next).questions.find(q => q.parent_id === null &&
    (options.targetId ? q.id === options.targetId : q.planKey === plan.key));
  if (options.targetId && !root) throw new Error("Onbekende centrale vraag.");
  if (!root) root = researchOf(next).questions.find(q => q.parent_id === null && !q.planKey && matches(q.text, plan.text));
  // Recognize untagged saved plans where only the central wording was edited.
  if (!root && plan.subquestions.length) {
    const candidates = researchOf(next).questions.filter(q => q.parent_id === null && !q.planKey && plan.subquestions.every(s =>
      researchOf(next).questions.some(c => c.parent_id === q.id && matches(c.text,s.text))));
    if(candidates.length===1)root=candidates[0];
  }
  if (!root) {const added=addQuestion(next,null,options.text ?? plan.text,options.origin || "suggested");next=added.draft;root=added.question;}
  else if(options.text !== undefined && !options.appendOnly)next=editQuestion(next,root.id,options.text,options.origin || "suggested");
  if (!options.appendOnly) next={...next,research:{...researchOf(next),questions:researchOf(next).questions.map(q=>{if(q.id!==root.id)return q;const {modelId:_modelId,subquestionDetail:_subquestionDetail,...rest}=q;return {...rest,planKey:plan.key,linkMode:mode,...(plan.subquestionDetail?{subquestionDetail:plan.subquestionDetail}:{})};})}};
  if(options.design && !options.appendOnly)next=setQuestionDesign(next,root.id,options.design);
  else if(!options.appendOnly && plan.direction && !researchOf(next).questions.find(q=>q.id===root.id)?.researchDesign)
    next=setQuestionDesign(next,root.id,{direction:plan.direction,topic:plan.topic});
  for(const sub of plan.subquestions) {
    if(mode==="manual")break;
    if(mode==="dimensions" && options.selectedKeys && !options.selectedKeys.includes(sub.key))continue;
    let target=root.id;
    if(mode==="dimensions") {
      let child=researchOf(next).questions.find(q=>q.parent_id===root.id && (q.planPartKey===sub.key || matches(q.text,sub.text)));
      if(!child){const added=addQuestion(next,root.id,sub.text,"suggested");next=added.draft;child=added.question;}
      target=child.id;
      next={...next,research:{...researchOf(next),questions:researchOf(next).questions.map(q=>q.id===target ? {...q,planPartKey:sub.key} : q)}};
    }
    for(const id of sub.ids)if(!researchOf(next).links.some(l=>l.line_id===id))next=linkLine(next,id,target);
  }
  return {draft:next,questionId:root.id};
}

// Link only newly selected material to an explicitly accepted structure. Never undo
// a manual unlink, move an existing link, create questions or choose between roots.
export function linkNewSelections(previous, draft) {
  const fresh=new Set(draft.included.filter(id=>!previous.included.includes(id)));
  if(!fresh.size)return draft;
  let next=draft;
  const wb=validateInvestigation(draft.investigation),materials=wb.materials;
  const sources=[...processPlans(draft,wb), ...sourcePlans(draft,undefined,wb),...sourcePlans(draft,'broad',wb).filter(p=>p.sourceId===cioSourceId)];
  for(const m of materials.filter(m=>fresh.has(m.id))) {
    if(researchOf(next).links.some(l=>l.line_id===m.id))continue;
    const candidates=[];
    // Explicitly adopted subquestions retain their own source mapping when
    // several sources share a root. Root identity and wording need not change.
    for (const part of sources.flatMap(p=>p.subquestions).filter(s=>s.ids.includes(m.id))) {
      candidates.push(...researchOf(next).questions.filter(q=>q.parent_id && q.planPartKey===part.key &&
        researchOf(next).questions.find(root=>root.id===q.parent_id)?.linkMode!=='manual').map(q=>q.id));
    }
    for(const root of researchOf(next).questions.filter(q=>q.parent_id===null && ["central","dimensions"].includes(q.linkMode))) {
      const source=sources.find(p=>p.key===root.planKey&&(p.subquestionDetail||'specific')===(root.subquestionDetail||'specific'));
      const part=source?.subquestions.find(s=>s.ids.includes(m.id));
      const modelMatch=root.modelId && m.originKey?.startsWith(root.modelId+":") &&
        matches(root.modelSubject,m.topic);
      if(!part && !modelMatch)continue;
      if(root.linkMode==="central")candidates.push(root.id);
      else {
        const key=part?.key || `model:${root.modelId}:${m.location?.split(" / ")[0]}`;
        candidates.push(...researchOf(next).questions.filter(q=>q.parent_id===root.id &&
          (q.planPartKey===key || (modelMatch && q.modelIndicatorIds
            ? q.modelIndicatorIds.includes(m.location?.split(' / ')[1]) : q.modelDimensionKey===key))).map(q=>q.id));
      }
    }
    if(new Set(candidates).size===1)next=linkLine(next,m.id,candidates[0]);
  }
  return next;
}

export function adoptModelQuestionPlan(draft, modelId, mode, context = {}, options = {}) {
  if (!["manual", "central", "dimensions"].includes(mode)) throw new Error("Onbekende modelkoppeling.");
  let root = options.targetId && researchOf(draft).questions.find(q => q.id === options.targetId && q.parent_id === null);
  if (options.targetId && !root) throw new Error("Onbekende centrale vraag.");
  const planContext=root && root.modelId===modelId && root.modelSubject!==undefined
    ? {...context,models:(context.models||[]).map(m=>m.id===modelId ? {...m,researchSubject:root.modelSubject}:m)} : context;
  const plan = modelQuestionPlan(draft, modelId, planContext);
  if (!plan) throw new Error("Dit model is niet beschikbaar in uw selectie.");
  const wording = options.text ?? plan.text;
  if (!root) root = researchOf(draft).questions.find(q => q.parent_id === null && q.modelId === modelId && matches(q.text, wording));
  let next;
  if (root) next = editQuestion(draft, root.id, wording, options.origin || "suggested");
  else { const added = addQuestion(draft, null, wording, options.origin || "suggested"); next = added.draft; root = added.question; }
  next = {...next, research: {...researchOf(next), questions: researchOf(next).questions.map(q => {if(q.id!==root.id)return q;const {planKey:_planKey,...rest}=q;return {...rest,modelId,modelSubject:plan.modelSubject,linkMode:mode};})}};
  if (options.design) next = setQuestionDesign(next, root.id, options.design);
  for (const sub of plan.subquestions) {
    if (mode === "manual") break;
    if (mode === "dimensions" && options.selectedKeys && !options.selectedKeys.includes(sub.key)) continue;
    let target = root.id;
    if (mode === "dimensions") {
      const existing = researchOf(next).questions.find(q => q.parent_id === root.id &&
        (q.modelDimensionKey === sub.key || matches(q.text, sub.text)));
      if (existing) target = existing.id;
      else {
        const added = addQuestion(next, root.id, sub.text, "suggested"); next = added.draft; target = added.question.id;
      }
      next = {...next, research: {...researchOf(next), questions: researchOf(next).questions.map(q => q.id === target ?
        {...q, modelDimensionKey: sub.key, ...(sub.indicatorIds ? {modelIndicatorIds: [...sub.indicatorIds]} : {})} : q)}};
    }
    for (const id of sub.ids) if (!researchOf(next).links.some(l => l.line_id === id)) next = linkLine(next, id, target);
  }
  return {draft: next, questionId: root.id};
}

/** @param {string|null} [targetId] */
export function subProposals(draft, parentId, targetId = null, context = {}) {
  const r = researchOf(draft), parent = r.questions.find(q => q.id === parentId);
  if (!parent || parent.parent_id !== null) return [];
  const wb=validateInvestigation(draft.investigation);
  return subProposalsFor(draft,r,parent,targetId,context,wb);
}
// A menu may offer broad and specific questions together. Share one fresh
// validation within that calculation, never across calls or from a caller.
export function subProposalsByDetail(draft,parentId,details,context={}) {
  const r=researchOf(draft),parent=r.questions.find(q=>q.id===parentId);
  if(!parent||parent.parent_id!==null||!details.length)return [];
  const wb=validateInvestigation(draft.investigation);
  return details.flatMap(detail=>subProposalsFor(draft,r,parent,null,{...context,subquestionDetail:detail},wb));
}
function subProposalsFor(draft,r,parent,targetId,context,wb) {
  const parentId=parent.id;
  const available = plans(draft, {...context,subquestionDetail:context.subquestionDetail ?? parent.subquestionDetail},wb).map(p => p.sourceId
    ? directedPlan(draft,p,parent.researchDesign?.direction ?? context.direction) : p);
  const exact = available.find(p => p.key === parent.planKey) || (!parent.researchDesign && available.find(p => matches(p.text, parent.text)));
  const process = processes.find(p => parent.planKey===`process:${p.id}` || matches(p.question, parent.text));
  const chosenProcessPlan = process && processPlan(draft,process,wb,parent.researchDesign?.direction ?? context.direction);
  const themeMatch = () => themeCentral({...draft, included: []}, context.themeIds || [], context.framework).some(p => matches(p.text, parent.text));
  const design = parent.researchDesign && directionPlan(parent.researchDesign.direction, parent.researchDesign.topic, draft.investigation?.researchApproach);
  // A self-written central question carries no research design. That used to drop
  // the direction's own subquestions and its advice question — the step back to
  // what the assignment giver has to decide — so the better the auditor's own
  // question, the less support remained. Direction and subject are already in the
  // goal, so that support stays available whoever wrote the question. It is added
  // to the suggestions from the auditor's own selection, never in their place.
  const goal = draft.investigation?.goal;
  const goalDesign = !design && goal?.direction && goal.subject?.trim()
    ? directionPlan(goal.direction, goal.subject, draft.investigation?.researchApproach) : null;
  const designSubs = design ? [...design.subquestions, design.advice]
    : goalDesign ? [...goalDesign.subquestions, goalDesign.advice] : [];
  const model = parent.modelId ? modelPlans(draft,(context.models||[]).map(m=>m.id===parent.modelId && parent.modelSubject!==undefined ? {...m,researchSubject:parent.modelSubject}:m),wb).find(p=>p.modelId===parent.modelId) : null;
  // What the auditor's own selection suggests: the open themes first, then the
  // plans of the sources and models still in the workspace. These carry the
  // building blocks, so a branch that leaves them out hands back questions with
  // nothing attached and every link has to be made by hand.
  // Exact source/model/process plans already determine their subquestions.
  // Build fallback theme suggestions only when the chosen branch needs them;
  // the current investigation is still validated above on every call.
  const fromSelection = () => [
    ...(!process || process.themeId ? themeSubs(draft, parentId, targetId) : []),
    ...available.filter(p => !process || process.sourceIds.includes(p.sourceId)).flatMap(p => p.subquestions)
      .filter(s => s.ids.length || (!process && available.length === 1)),
  ];
  const suggestions = chosenProcessPlan ? [...chosenProcessPlan.subquestions, ...designSubs] : model ? [...model.subquestions, ...designSubs]
    // A question taken from the research goal carries a design but matches no
    // plan among the available ones, so this branch used to return the
    // direction's questions alone. Every branch adds to the selection's own
    // suggestions; none replaces them.
    : exact ? [...exact.subquestions, ...designSubs] : design ? [...design.subquestions, ...fromSelection().filter(s => s.ids.length), design.advice]
    : themeMatch() ? [...themeSubs(draft, parentId, targetId), ...designSubs] : [...fromSelection(), ...designSubs];
  const children = r.questions.filter(q => q.parent_id === parentId && q.id !== targetId);
  const merged = [];
  for (const s of suggestions) {
    if (!questionCandidate(s.text, 'onderzoeksvraag')) continue;
    const existing = merged.find(p => matches(p.text, s.text));
    if (existing) {
      existing.ids = [...new Set([...existing.ids, ...s.ids])];
      if(s.missingCriteria?.length) existing.missingCriteria=[...new Map([...(existing.missingCriteria||[]),...s.missingCriteria].map(item=>[item.originKey,item])).values()];
      if(s.scopeNote&&!existing.scopeNote) existing.scopeNote=s.scopeNote;
    }
    else merged.push({...s, ids: [...s.ids]});
  }
  if(context.includeAdopted)return merged;
  // Explicit mixed choices may share all their points. Only an already adopted
  // identity (or the same wording with its own complete links) is suppressed.
  if(context.allowOverlap) return merged.filter(s=>!children.some(q=>
    q.planPartKey===s.key || q.modelDimensionKey===s.key ||
    (matches(q.text,s.text) && s.ids.every(id=>r.links.some(l=>l.line_id===id&&l.question_id===q.id)))));
  return merged.filter(s => !children.some(q =>
      (matches(q.text, s.text) && (!s.ids.length || s.ids.every(id => r.links.some(l => l.line_id === id)))) ||
      (!targetId && q.text.trim() && s.ids.length && s.ids.every(id => r.links.some(l => l.line_id === id && l.question_id === q.id)))));
}

export function proposalReuseId(draft, parentId, key, context = {}) {
  const s = subProposals(draft, parentId, null, context).find(p => p.key === key);
  if (!s?.ids.length) return null;
  const r = researchOf(draft);
  const dimension = r.questions.find(q => q.parent_id === parentId && (q.modelDimensionKey === s.key || q.planPartKey === s.key));
  if (dimension) return dimension.id;
  const matching = r.questions.find(q => q.parent_id === parentId && matches(q.text, s.text));
  if (matching) return matching.id;
  return r.questions.find(q => q.parent_id === parentId && !q.text.trim() &&
    s.ids.every(id => r.links.some(l => l.line_id === id && l.question_id === q.id)))?.id || null;
}

export function adoptSubProposal(draft, parentId, key, context = {}, options = {}) {
  const s = subProposals(draft, parentId, null, context).find(p => p.key === key);
  if (!s) return draft;
  const reuse = proposalReuseId(draft, parentId, key, context);
  const existing = researchOf(draft).questions.find(q => q.id === reuse);
  const preserveText = (existing?.modelDimensionKey === s.key || existing?.planPartKey === s.key) && existing.text.trim();
  const added = reuse ? {draft: preserveText ? draft : editQuestion(draft, reuse, s.text, "suggested"), question: {id: reuse}}
    : addQuestion(draft, parentId, proposalFormulation(s.text,options.formulation), "suggested");
  let next = added.draft;
  if(s.key.startsWith("source:") || s.key.startsWith("process:"))next={...next,research:{...researchOf(next),questions:researchOf(next).questions.map(q=>q.id===added.question.id ? {...q,planPartKey:s.key} : q)}};
  if (s.key.startsWith("model:")) next = {...next, research: {...researchOf(next), questions: researchOf(next).questions.map(q =>
    q.id === added.question.id ? {...q, modelDimensionKey: s.key,
      ...(s.indicatorIds ? {modelIndicatorIds: [...s.indicatorIds]} : {})} : q)}};
  // Explicit overlap adds another question link, never another selected point.
  // Other workflows retain their existing unassigned-only behaviour.
  for (const id of s.ids) if (context.allowOverlap || !researchOf(next).links.some(l => l.line_id === id))
    next = linkLine(next, id, added.question.id);
  return next;
}

export function applyProposalWording(draft, questionId, key, context = {}) {
  const q = researchOf(draft).questions.find(q => q.id === questionId);
  if (!q?.parent_id) return draft;
  const s = subProposals(draft, q.parent_id, questionId, context).find(p => p.key === key);
  return s ? editQuestion(draft, questionId, s.text, "suggested") : draft;
}
