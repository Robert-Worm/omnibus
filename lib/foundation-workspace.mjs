import {
  foundations,
  foundationProposals,
  validateInvestigation,
  addMaterials,
} from "./investigation.mjs";
import { pageSlice } from "./workspace-view.mjs";
import { researchOf } from "./research-plan.mjs";
import { foundationQuestionPlans } from "./foundations/registry.mjs";
import { adoptSourceQuestionPlan, sourceQuestionPlan } from "./research-proposals.mjs";
import { searchText } from "./criterion-search.mjs";
import {chooseCioPoints,cioSourceId} from './cio-law-adapter.mjs';
import {chooseWwkePoints,selectWwkePointsDirect} from './wwke-law-adapter.mjs';
import {wwkeSourceId} from './wwke-law-data.mjs';
import {catalogueDerived,catalogueReady} from './catalogue-runtime.mjs';
import {foundationSummaries} from './catalogue-summary.mjs';
import {topicalIds} from './topical-content.mjs';
import {isAdmittedFoundation,flatNormSelectable} from './admitted-foundation.mjs';
import {chooseTopicalPoints} from './topical-selection.mjs';
export { foundationQuestionPlans } from "./foundations/registry.mjs";

export {cioSelectionNotices,legacyCioMaterials,supersededCioMaterials} from './cio-selection-notices.mjs';

// An explicit user action: add a suggested question structure; never select extra controls.
export function adoptFoundationQuestions(draft, sourceId, options = {}) {
  const plan = foundationQuestionPlans[sourceId];
  if (!plan && sourceId!==cioSourceId) return draft;
  const target = options.targetId && researchOf(draft).questions.find(q=>q.id===options.targetId && q.parent_id===null);
  const design = target?.researchDesign;
  return adoptSourceQuestionPlan(draft,sourceId,"dimensions",{
    ...(options.targetId ? {targetId:options.targetId,appendOnly:true,design} : {}),
    ...(options.selectedOnly ? {selectedKeys:sourceQuestionPlan(draft,sourceId,design?.direction).subquestions.filter(s=>s.ids.length).map(s=>s.key)} : {}),
  }).draft;
}

// Catalogue records are proposals, never a claim that a whole law has been covered.
const proposalMetadata = {
  "AVG-proposal-1": { id: "AVG-C001", topic: "Gegevensverwerking" },
  "AVG-proposal-2": { id: "AVG-C002", topic: "Privacy by design" },
  "AVG-proposal-3": { id: "AVG-C003", topic: "Informatiebeveiliging" },
};
export const preparedFoundationItems = [];
catalogueDerived(()=>preparedFoundationItems.splice(0,preparedFoundationItems.length,...foundationProposals.map((p) => ({
  ...p,
  ...proposalMetadata[p.originKey],
  reviewStatus: p.reviewStatus || "draft",
}))));

// A source that states for whom and when it applies carries that as scope
// provisions, not as norms; the reader only meets them after opening the source.
// A list entry and a search hit say nothing about applicability, so they point
// at that material instead of leaving the reader to assume the source fits.
const scopeTitlesBySource = new Map();
catalogueDerived(()=>{scopeTitlesBySource.clear();
for (const p of preparedFoundationItems) {
  if (p.auditRole !== 'scope') continue;
  const titles = scopeTitlesBySource.get(p.sourceId);
  if (titles) titles.push(p.title); else scopeTitlesBySource.set(p.sourceId, [p.title]);
}
});
// Aanvinken neemt een hele bron mee: bij BIO2 zijn dat 126 criteriumvoorstellen
// in één klik. De bron is al ingedeeld — in groepen die de bron zelf benoemt, of
// anders in onderwerpen — maar de lijst zei dat niet, dus zag de lezer alleen
// alles of niets. Deze telling noemt de indeling waarop hij kan afbakenen; de
// keuze blijft van hem.
const narrowingBySource = new Map();
catalogueDerived(()=>{narrowingBySource.clear();
for (const p of preparedFoundationItems) {
  if (p.auditRole === 'scope') continue;
  const axes = narrowingBySource.get(p.sourceId) || { groups: new Set(), topics: new Set() };
  if (p.groupId) axes.groups.add(p.groupId);
  if (p.topic) axes.topics.add(p.topic);
  narrowingBySource.set(p.sourceId, axes);
}
});
/** @param {string} sourceId @returns {{count:number,label:string}} */
export function sourceNarrowing(sourceId) {
  const axes = narrowingBySource.get(sourceId);
  if (!axes) return { count: 0, label: '' };
  // Groepen komen uit de bron zelf; onderwerpen zijn een eigen ordening. De
  // eerste gaat voor, de tweede vangt de bron op die geen groepen kent.
  if (axes.groups.size > 1) return { count: axes.groups.size, label: 'groepen' };
  if (axes.topics.size > 1) return { count: axes.topics.size, label: 'onderwerpen' };
  return { count: 0, label: '' };
}

/** @param {string} sourceId @returns {{count:number,titles:string[]}} */
export function sourceScopeProvisions(sourceId) {
  const titles = scopeTitlesBySource.get(sourceId) || [];
  return { count: titles.length, titles };
}

export function foundationWorkspace(
  draft,
  options = {},
  items = preparedFoundationItems,
  sources = foundations,
) {
  const wb = validateInvestigation(draft.investigation);
  const open = new Set(wb.sourceIds);
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const adopted = new Map(wb.materials.filter((m) => m.originKey).map((m) => [m.originKey, m]));
  const included = new Set(draft.included);
  // Normalize each typed token as a phrase: keep a full criterion ID together.
  const terms = String(options.query || '').trim().split(/\s+/).map(searchText).filter(Boolean);
  const rows = items
    .filter((p) => open.has(p.sourceId) && sourceMap.has(p.sourceId))
    .map((p) => {
      const existing = adopted.get(p.originKey);
      return {
        ...p,
        source: sourceMap.get(p.sourceId),
        selected: Boolean(existing && included.has(existing.id)),
        materialId: existing?.id,
      };
    });
  const matchesTerms=p=>{
    if(!terms.length)return true;
    const text=searchText([p.id,p.materialId,p.title,p.auditNorm,p.body,p.question,p.location,p.topic,p.source.title,
      p.risk,p.control,p.sourceContext,p.sourceControlId,p.groupTitle,p.groupDescription,p.previousIds].join(' '));
    return terms.every(t=>text.includes(t));
  };
  const contextItems=rows.filter(p=>p.auditRole==='scope'&&(!options.sourceId||p.sourceId===options.sourceId)&&matchesTerms(p));
  const normRows=rows.filter(p=>p.auditRole!=='scope');
  const sourceRows =
    options.sourceId && open.has(options.sourceId)
      ? normRows.filter((p) => p.sourceId === options.sourceId)
      : normRows;
  const topics = [...new Set(sourceRows.map((p) => p.topic))].sort((a, b) =>
    a.localeCompare(b, "nl"),
  );
  const topic = topics.includes(options.topic) ? options.topic : "";
  const groups = [...new Map(sourceRows.filter(p => !topic || p.topic === topic)
    .filter(p => p.groupId).map(p => [p.groupId, { id: p.groupId, title: p.groupTitle, description: p.groupDescription, sourceId: p.sourceId }])).values()];
  const groupId = groups.some(g => g.id === options.groupId) ? options.groupId : "";
  // Every criterion in the catalogue is currently AI-reviewed; none has been
  // released by a person. The filter keeps filtering — an AI review is not a
  // human release, and with the filter on the list belongs empty while that
  // holds. This count only says whether there is anything to filter at all, so
  // the control can stay away where it would promise a distinction the material
  // cannot make.
  const released = sourceRows.filter((p) => p.reviewStatus === "reviewed").length;
  const filtered = sourceRows.filter(
    (p) =>
      (!topic || p.topic === topic) &&
      (!groupId || p.groupId === groupId) &&
      (!options.selectedOnly || p.selected) &&
      (!options.reviewedOnly || p.reviewStatus === "reviewed") &&
      matchesTerms(p),
  );
  const pagination = pageSlice(filtered, options.page || 0, 25);
  // Bulk actions use the complete filtered set, never just the current page.
  // Hidden search/review results must not be silently added to a group selection.
  const groupResults = groups.map(g => {
    const matches = filtered.filter(p => p.groupId === g.id);
    const whole = sourceRows.filter(p => p.groupId === g.id);
    return { ...g, items: matches, total: matches.length,
      selected: matches.filter(p => p.selected).length,
      groupTotal: whole.length, groupSelected: whole.filter(p => p.selected).length };
  }).filter(g => g.total);
  return {
    ...pagination,
    rows: filtered.slice(pagination.page * 25, pagination.page * 25 + 25),
    filtered,
    topics,
    groups,
    groupResults,
    contextItems,
    released,
    total: normRows.length,
    selected: normRows.filter((p) => p.selected).length,
    coverage: sources
      .filter((s) => open.has(s.id))
      .map((s) => {
        const set = normRows.filter((p) => p.sourceId === s.id);
        return {
          source: s,
          available: set.length,
          reviewed: set.filter((p) => p.reviewStatus === "reviewed").length,
          selected: set.filter((p) => p.selected).length,
          completeness: sourceMap.get(s.id)?.coverage || "Niet vastgesteld",
        };
      }),
  };
}

export function chooseFoundationItems(draft, items, include, sources = foundations) {
  const topicalId=topicalIds.find(id=>items.some(p=>p.sourceId===id));
  if(topicalId){
    const chosen=items.filter(p=>p.sourceId===topicalId),rest=items.filter(p=>!chosen.includes(p));
    const next=chooseTopicalPoints(draft,topicalId,chosen.map(p=>p.id),include);
    return rest.length?chooseFoundationItems(next,rest,include,sources):next;
  }
  const wwkeItems=items.filter(p=>p.sourceId===wwkeSourceId);
  if(wwkeItems.length){
    // Collection and discovery use the same unconfirmed research selection as
    // the WWKE viewer. A selection is never a completed scope assessment.
    const ids=wwkeItems.map(p=>p.id);
    const next=include?selectWwkePointsDirect(draft,ids):chooseWwkePoints(draft,ids,false);
    const rest=items.filter(p=>p.sourceId!==wwkeSourceId);
    return rest.length?chooseFoundationItems(next,rest,include,sources):next;
  }
  const cioItems=items.filter(p=>p.sourceId===cioSourceId);
  if(cioItems.length){
    const next=chooseCioPoints(draft,cioItems.map(p=>p.id),include);
    const rest=items.filter(p=>p.sourceId!==cioSourceId);
    return rest.length ? chooseFoundationItems(next,rest,include,sources) : next;
  }
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const wb = validateInvestigation(draft.investigation);
  const eligible = items.filter(p=>!include||!isAdmittedFoundation(sourceMap.get(p.sourceId))||flatNormSelectable(p)).filter(
    (p) => sourceMap.has(p.sourceId) && wb.sourceIds.includes(p.sourceId) &&
      (p.auditRole!=='scope'||!include||wb.materials.some(m=>m.originKey===p.originKey)),
  );
  const openSources = new Set(draft.investigation.sourceIds);
  const applicable = eligible.filter((p) => sourceMap.has(p.sourceId) && openSources.has(p.sourceId));
  if (include) {
    // One batch rather than one draft rebuild per criterion.
    return addMaterials(
      draft,
      applicable.map((p) => {
        const source = sourceMap.get(p.sourceId);
        return {
          ...p,
          body: p.auditNorm || p.body,
          foundationId: source.id,
          sourceTitle: source.title,
          sourceUrl: p.sourceUrl || source.url,
          edition: p.edition || source.edition,
        };
      }),
    );
  }
  // Deselecting scanned every material per criterion; one index and one pass.
  const byKey = new Map(wb.materials.filter((m) => m.originKey).map((m) => [m.originKey, m]));
  const drop = new Set();
  for (const p of applicable) {
    const old = byKey.get(p.originKey);
    if (old) drop.add(old.id);
  }
  if (!drop.size) return draft;
  return { ...draft, included: draft.included.filter((id) => !drop.has(id)) };
}

export function closeFoundation(draft, sourceId) {
  const wb = validateInvestigation(draft.investigation);
  // Closing the browsing scope must never delete collected work or its question links.
  return {
    ...draft,
    investigation: { ...wb, sourceIds: wb.sourceIds.filter((id) => id !== sourceId) },
  };
}

// Rebuild only when a content package arrives, not for every visible card.
const selectableBySource = new Map();
catalogueDerived(()=>{selectableBySource.clear();
for (const p of preparedFoundationItems) {
  if (p.auditRole === 'scope') continue;
  if(isAdmittedFoundation(foundations.find(s=>s.id===p.sourceId))&&!flatNormSelectable(p))continue;
  const list = selectableBySource.get(p.sourceId);
  if (list) list.push(p); else selectableBySource.set(p.sourceId, [p]);
}
});
// The chosen origin keys depend only on the draft, which is replaced whenever it
// changes, so one set per draft serves every card in that render.
const includedKeysByDraft = new WeakMap();
function includedOriginKeys(draft) {
  const cached = includedKeysByDraft.get(draft);
  if (cached) return cached;
  const included = new Set(draft.included);
  const keys = new Set(validateInvestigation(draft.investigation).materials
    .filter(m => included.has(m.id)).map(m => m.originKey));
  includedKeysByDraft.set(draft, keys);
  return keys;
}

// Source checkboxes select criteria; opening/closing a reader is a separate action.
export function foundationSelection(draft, sourceId) {
  const items = selectableBySource.get(sourceId) || [];
  const keys = includedOriginKeys(draft);
  if(!catalogueReady(['foundation:'+sourceId])&&foundationSummaries[sourceId]){
    const summary=foundationSummaries[sourceId],ids=summary.pointIds;
    const selected=ids.filter((id,index)=>keys.has(summary.originKeys?.[index]??sourceId+':'+id)).length;
    return {items:[],total:ids.length,selected,all:ids.length>0&&selected===ids.length,partial:selected>0&&selected<ids.length};
  }
  const selected = items.filter(p => keys.has(p.originKey)).length;
  return {items, total: items.length, selected, all: items.length > 0 && selected === items.length,
    partial: selected > 0 && selected < items.length};
}

export function chooseFoundationSource(draft, sourceId, include) {
  if (!foundations.some(s => s.id === sourceId)) throw Error('Onbekende bron.');
  const wb = validateInvestigation(draft.investigation);
  const opened = {...draft, investigation: {...wb, sourceIds: [...new Set([...wb.sourceIds, sourceId])]}};
  // Atomic: capacity errors leave the original draft, including open sources, untouched.
  return chooseFoundationItems(opened, foundationSelection(draft, sourceId).items, include);
}
