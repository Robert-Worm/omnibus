// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/research-flow.mjs";
import { addQuestion, researchOf, linkLine, unlinkLine } from "@/lib/research-plan.mjs";
import { reviewedResearchGroups } from "@/lib/reviewed-reports.mjs";

// Only the exact generated heading is migrated; custom project names stay intact.
export function personalDraft(draft, framework) {
  if (draft.title === framework.title || draft.title === 'Auditkader subsidiebeheer')
    return { ...draft, title: "Mijn auditkader" };
  return draft;
}
export function centralSuggestion() {
  return data.centralSuggestion;
}
const groups = data.groups;
const normalized = (text) => text.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");
groups.push(...reviewedResearchGroups);
export function subSuggestions(draft, parentId) {
  const r = researchOf(draft),
    children = r.questions.filter((q) => q.parent_id === parentId);
  return groups
    .map((g) => ({ ...g, ids: g.ids.filter((id) => draft.included.includes(id)) }))
    .filter(
      (g) =>
        g.ids.length &&
        !children.some(
          (q) =>
            normalized(q.text) === normalized(g.text) ||
            (q.text.trim() &&
              g.ids.every((id) => r.links.some((l) => l.question_id === q.id && l.line_id === id))),
        ),
    );
}
export function subSuggestionReuseId(draft, parentId, key) {
  const suggestion = subSuggestions(draft, parentId).find((g) => g.key === key);
  if (!suggestion) return null;
  const existing = researchOf(draft).questions.find(
    (q) =>
      q.parent_id === parentId &&
      !q.text.trim() &&
      suggestion.ids.every((id) =>
        researchOf(draft).links.some((l) => l.question_id === q.id && l.line_id === id),
      ),
  );
  return existing?.id ?? null;
}
export function adoptSubSuggestion(draft, parentId, key) {
  const suggestion = subSuggestions(draft, parentId).find((g) => g.key === key);
  if (!suggestion) return draft;
  const existing = subSuggestionReuseId(draft, parentId, key);
  if (existing)
    return {
      ...draft,
      research: {
        ...researchOf(draft),
        questions: researchOf(draft).questions.map((q) =>
          q.id === existing ? { ...q, text: suggestion.text, origin: "suggested" } : q,
        ),
      },
    };
  const result = addQuestion(draft, parentId, suggestion.text, "suggested");
  let next = result.draft;
  for (const id of suggestion.ids) next = linkLine(next, id, result.question.id);
  return next;
}
// Only norm cards carry drag payloads. Editing/reordering questions is explicit.
// Invalid destinations are deliberate no-ops, never native text insertion.
export function normDrop(draft, payload, targetId, blocked = false) {
  const r = researchOf(draft);
  if (blocked) return { valid: false, action: "cancel", label: "Laat los om te annuleren" };
  if(payload?.type==='group') {
    const ids=payload.lineIds;
    if(!Array.isArray(ids)||!ids.length||ids.length>1000||new Set(ids).size!==ids.length||
      ids.some(id=>!draft.included.includes(id))||
      (payload.from!==null && ids.some(id=>!r.links.some(l=>l.line_id===id&&l.question_id===payload.from))))
      return {valid:false,action:'cancel',label:'Deze groep is gewijzigd; begin opnieuw met slepen.'};
    if(targetId==='bank') return {valid:payload.from!==null,action:payload.from===null?'cancel':'unlink',label:'Loslaten: groep ontkoppelen'};
    if(!r.questions.some(q=>q.id===targetId)||payload.from===targetId)
      return {valid:false,action:'cancel',label:'Laat los om te annuleren'};
    if(payload.from===null && ids.every(id=>r.links.some(l=>l.line_id===id&&l.question_id===targetId)))
      return {valid:false,action:'cancel',label:'Al aan deze vraag gekoppeld'};
    return {valid:true,action:payload.from===null?'copy':'move',label:`Loslaten: ${ids.length} bouwstenen ${payload.from===null?'koppelen':'verplaatsen'}`};
  }
  if (!payload || payload.type !== "line" || !draft.included.includes(payload.lineId))
    return { valid: false, action: "cancel", label: "Laat los om te annuleren" };
  if (
    payload.from !== null &&
    !r.links.some((l) => l.line_id === payload.lineId && l.question_id === payload.from)
  )
    return { valid: false, action: "cancel", label: "Laat los om te annuleren" };
  if (targetId === "bank")
    return payload.from === null
      ? { valid: false, action: "cancel", label: "Dit onderdeel staat al in uw selectie" }
      : { valid: true, action: "unlink", label: "Loslaten: ontkoppelen" };
  const target = r.questions.find((q) => q.id === targetId);
  if (!target) return { valid: false, action: "cancel", label: "Laat los om te annuleren" };
  if (
    payload.from === targetId ||
    (payload.from === null &&
      r.links.some((l) => l.line_id === payload.lineId && l.question_id === targetId))
  )
    return { valid: false, action: "cancel", label: "Al aan deze vraag gekoppeld" };
  return {
    valid: true,
    action: payload.from === null ? "copy" : "move",
    label: payload.from === null ? "Loslaten: norm koppelen" : "Loslaten: koppeling verplaatsen",
  };
}

export function applyGroupDrop(draft,payload,targetId,blocked=false) {
  const result=normDrop(draft,payload,targetId,blocked);
  if(payload?.type!=='group'||!result.valid)return draft;
  return payload.lineIds.reduce((next,id)=>result.action==='unlink'
    ? unlinkLine(next,id,payload.from) : linkLine(next,id,targetId,payload.from),draft);
}
