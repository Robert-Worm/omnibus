import { sourceFields } from "./framework-source-items.mjs";
import { directionLabel } from "./research-directions.mjs";
import { activeProcesses } from './process-catalogue.mjs';

export const emptyResearch = () => ({ questions: [], links: [] });
export const researchOf = (draft) => draft.research ?? emptyResearch();
// Reset only the working selection or question structure, never collected source material.
export function resetResearch(draft, target) {
  if (!['selection', 'questions'].includes(target)) throw Error('Onbekende herstelactie.');
  const research = researchOf(draft);
  return {...draft,
    ...(target === 'selection' ? {included: []} : {}),
    research: {questions: target === 'questions' ? [] : research.questions, links: []},
  };
}
// Display numbers follow the current hierarchy; saved links keep their stable IDs.
export function questionNumbers(draft) {
  const questions = researchOf(draft).questions;
  return Object.fromEntries(
    questions
      .filter((q) => q.parent_id === null)
      .flatMap((q, index) => [
        [q.id, String(index + 1)],
        ...questions
          .filter((s) => s.parent_id === q.id)
          .map((s, i) => [s.id, `${index + 1}.${i + 1}`]),
      ]),
  );
}
export function questionLabel(draft, question) {
  return `${questionNumbers(draft)[question.id]} · ${question.text.trim() || (question.parent_id ? "Deelvraag nog te formuleren" : "Centrale vraag nog te formuleren")}`;
}
const unique = (values) => [...new Set(values)];
export function validateResearch(value, lineIds) {
  if (
    !value ||
    !Array.isArray(value.questions) ||
    !Array.isArray(value.links) ||
    value.questions.length > 200 ||
    value.links.length > 20000
  )
    throw new Error("Ongeldige onderzoeksopzet.");
  const ids = new Set();
  for (const q of value.questions) {
    if (
      !q ||
      typeof q !== "object" ||
      !/^q-[1-9][0-9]*$/.test(q.id) ||
      ids.has(q.id) ||
      typeof q.text !== "string" ||
      q.text.length > 2000 ||
      !["user", "suggested"].includes(q.origin) ||
      (q.parent_id !== null && typeof q.parent_id !== "string")
    )
      throw new Error("Ongeldige onderzoeksvraag.");
    ids.add(q.id);
    if(q.subject!==undefined && (typeof q.subject!=='string'||q.subject.length>1000))throw Error('Ongeldig vraagonderwerp.');
    if(q.modelSubject!==undefined && (typeof q.modelSubject!=='string'||q.modelSubject.length>1000))throw Error('Ongeldig modelonderwerp.');
    if(q.modelIndicatorIds!==undefined && (q.parent_id===null || !Array.isArray(q.modelIndicatorIds) ||
      !q.modelIndicatorIds.length || q.modelIndicatorIds.length>100 ||
      new Set(q.modelIndicatorIds).size!==q.modelIndicatorIds.length ||
      q.modelIndicatorIds.some(id=>typeof id!=='string'||id.length>300||!/^[A-Za-z0-9_-]+$/.test(id))))
      throw Error('Ongeldige indicatorkoppeling bij de onderzoeksvraag.');
    for (const key of ["modelId", "modelDimensionKey", "planKey", "planPartKey"]) if (q[key] !== undefined &&
      (typeof q[key] !== "string" || !q[key].trim() || q[key].length > 300)) throw new Error("Ongeldige modelverwijzing.");
    if (q.linkMode !== undefined && (q.parent_id !== null || !["manual","central","dimensions"].includes(q.linkMode))) throw new Error("Ongeldige koppelwijze.");
    if (q.subquestionDetail !== undefined && (q.parent_id !== null || !['broad','specific'].includes(q.subquestionDetail))) throw new Error('Ongeldig detailniveau voor deelvragen.');
    if (q.researchDesign !== undefined && (q.parent_id !== null ||
      !q.researchDesign || !directionLabel(q.researchDesign.direction) ||
      typeof q.researchDesign.topic !== "string" || !q.researchDesign.topic.trim() ||
      q.researchDesign.topic.length > 1000)) throw new Error("Ongeldige onderzoeksrichting.");
  }
  for (const q of value.questions)
    if (
      q.parent_id !== null &&
      !value.questions.some((p) => p.id === q.parent_id && p.parent_id === null && p.id !== q.id)
    )
      throw new Error("Een deelvraag moet bij een centrale vraag horen.");
  const pairs = new Set();
  for (const link of value.links) {
    const pair = link?.question_id + "|" + link?.line_id;
    if (!link || !ids.has(link.question_id) || !lineIds.has(link.line_id) || pairs.has(pair))
      throw new Error("Ongeldige koppeling tussen vraag en onderdeel.");
    pairs.add(pair);
  }
  return {
    questions: value.questions.map(({ id, text, parent_id, origin, subject, researchDesign, modelId, modelSubject, modelDimensionKey, modelIndicatorIds, planKey, planPartKey, linkMode, subquestionDetail }) => ({
      id,
      text,
      parent_id,
      origin,
      ...(subject!==undefined ? {subject} : {}),
      ...(modelId ? {modelId} : {}),
      ...(modelSubject!==undefined ? {modelSubject} : {}),
      ...(modelDimensionKey ? {modelDimensionKey} : {}),
      ...(modelIndicatorIds ? {modelIndicatorIds: [...modelIndicatorIds]} : {}),
      ...(planKey ? {planKey} : {}),
      ...(planPartKey ? {planPartKey} : {}),
      ...(linkMode ? {linkMode} : {}),
      ...(subquestionDetail ? {subquestionDetail} : {}),
      ...(researchDesign ? {researchDesign: {direction: researchDesign.direction, topic: researchDesign.topic}} : {}),
    })),
    links: value.links.map(({ question_id, line_id }) => ({ question_id, line_id })),
  };
}
// Attach the selected design only on explicit acceptance of a central question.
export function setQuestionDesign(draft, id, design) {
  if (!design) return draft;
  const r = researchOf(draft);
  const q = r.questions.find(q => q.id === id && q.parent_id === null);
  if (!q || !directionLabel(design.direction) || typeof design.topic !== "string" ||
      !design.topic.trim() || design.topic.length > 1000) throw new Error("Ongeldige onderzoeksrichting.");
  return {...draft, research: {...r, questions: r.questions.map(q => q.id === id
    ? {...q, researchDesign: {direction: design.direction, topic: design.topic}} : q)}};
}
/** @param {string|null} [parent_id] */
export function addQuestion(draft, parent_id = null, text = "", origin = "user") {
  const r = researchOf(draft);
  if (r.questions.length >= 200) throw new Error("Maximaal 200 onderzoeksvragen per concept.");
  if (parent_id !== null && !r.questions.some((q) => q.id === parent_id && q.parent_id === null))
    throw new Error("Onbekende centrale vraag.");
  if (typeof text !== "string" || text.length > 2000 || !["user", "suggested"].includes(origin))
    throw new Error("Ongeldige vraag.");
  let n = 1;
  while (r.questions.some((q) => q.id === `q-${n}`)) n++;
  const question = { id: `q-${n}`, parent_id, text, origin };
  return {
    question,
    draft: { ...draft, research: { ...r, questions: [...r.questions, question] } },
  };
}
export function editQuestion(draft, id, text, origin = "user") {
  const r = researchOf(draft);
  if (
    typeof text !== "string" ||
    text.length > 2000 ||
    !["user", "suggested"].includes(origin) ||
    !r.questions.some((q) => q.id === id)
  )
    throw new Error("Ongeldige vraag.");
  return {
    ...draft,
    research: {
      ...r,
      questions: r.questions.map((q) => {
        if(q.id!==id)return q;
        // Recognize old process questions before their wording changes. Do not
        // infer a process from a user's edited or unrelated research question.
        const process=q.parent_id===null && !q.planKey && !q.modelId && activeProcesses.find(p=>p.question===q.text);
        return {...q,...(process ? {planKey:`process:${process.id}`} : {}),text,origin};
      }),
    },
  };
}
export function deleteQuestion(draft, id) {
  const r = researchOf(draft);
  if (!r.questions.some((q) => q.id === id)) throw new Error("Onbekende vraag.");
  const removed = new Set([id, ...r.questions.filter((q) => q.parent_id === id).map((q) => q.id)]);
  return {
    ...draft,
    research: {
      questions: r.questions.filter((q) => !removed.has(q.id)),
      links: r.links.filter((l) => !removed.has(l.question_id)),
    },
  };
}
/** @param {string|null} [beforeId] */
export function moveQuestion(draft, id, parent_id, beforeId = null) {
  const r = researchOf(draft),
    q = r.questions.find((q) => q.id === id);
  if (
    !q ||
    id === parent_id ||
    (parent_id !== null && !r.questions.some((p) => p.id === parent_id && p.parent_id === null)) ||
    (parent_id !== null && r.questions.some((p) => p.parent_id === id))
  )
    throw new Error(
      "Een centrale vraag met deelvragen kan niet onder een andere vraag worden geplaatst.",
    );
  const questions = r.questions.filter((p) => p.id !== id);
  const index =
    beforeId === null
      ? questions.length
      : questions.findIndex((p) => p.id === beforeId && p.parent_id === parent_id);
  if (index < 0) throw new Error("Ongeldige volgorde.");
  const moved = { ...q, parent_id };
  if (parent_id !== null) { delete moved.researchDesign; delete moved.modelId; delete moved.planKey; delete moved.linkMode; }
  else { delete moved.modelDimensionKey; delete moved.planPartKey; delete moved.modelIndicatorIds; }
  if (q.parent_id !== parent_id) { delete moved.modelDimensionKey; delete moved.planPartKey; delete moved.modelIndicatorIds; }
  questions.splice(index, 0, moved);
  return { ...draft, research: { ...r, questions } };
}
// Drag from a question moves that one link. Drag from the bank adds a link.
// Other links to the same norm are deliberately retained.
/** @param {string|null} [fromQuestion] */
export function linkLine(draft, line_id, question_id, fromQuestion = null) {
  const r = researchOf(draft);
  if (!draft.included.includes(line_id) || !r.questions.some((q) => q.id === question_id))
    throw new Error("Selecteer eerst een onderdeel en een geldige vraag.");
  let links = r.links.filter((l) => !(l.line_id === line_id && l.question_id === fromQuestion));
  if (!links.some((l) => l.line_id === line_id && l.question_id === question_id))
    links = [...links, { question_id, line_id }];
  return { ...draft, research: { ...r, links } };
}
export function unlinkLine(draft, line_id, question_id) {
  const r = researchOf(draft);
  return {
    ...draft,
    research: {
      ...r,
      links: r.links.filter((l) => !(l.line_id === line_id && l.question_id === question_id)),
    },
  };
}
// Explicit, question-local actions: retain selection, source data and other questions.
export function unlinkQuestionLines(draft, questionId) {
  const r = researchOf(draft);
  if (!r.questions.some(q=>q.id===questionId)) throw Error('Kies een geldige vraag.');
  return {...draft, research:{...r, links:r.links.filter(l=>l.question_id!==questionId)}};
}
export function linkQuestionLines(draft, questionId, ids) {
  const r = researchOf(draft);
  if (!r.questions.some(q=>q.id===questionId)) throw Error('Kies een geldige vraag.');
  const requested = new Set(ids);
  const existing = new Set(r.links.filter(l=>l.question_id===questionId).map(l=>l.line_id));
  const additions = [...new Set(draft.included)].filter(id=>requested.has(id)&&!existing.has(id))
    .map(line_id=>({question_id:questionId,line_id}));
  return {...draft,research:{...r,links:[...r.links,...additions]}};
}
export function questionLineIds(draft, id, children = false) {
  const r = researchOf(draft),
    ids = new Set([
      id,
      ...(children ? r.questions.filter((q) => q.parent_id === id).map((q) => q.id) : []),
    ]);
  return unique(
    r.links
      .filter((l) => ids.has(l.question_id) && draft.included.includes(l.line_id))
      .map((l) => l.line_id),
  );
}
export function unassignedIds(draft) {
  const linked = new Set(researchOf(draft).links.map((l) => l.line_id));
  return draft.included.filter((id) => !linked.has(id));
}
// Explicit user action only. Never move an existing link or reselect an item.
export function linkUnassigned(draft, questionId, ids) {
  if (!researchOf(draft).questions.some(q=>q.id===questionId && q.parent_id===null))
    throw Error('Kies een centrale vraag.');
  const requested = new Set(ids);
  return unassignedIds(draft).filter(id=>requested.has(id))
    .reduce((next,id)=>linkLine(next,id,questionId),draft);
}
export function suggestResearch(framework, draft) {
  const lines = framework.lines.filter((l) => draft.included.includes(l.id));
  if (!lines.length) return [];
  // Reuse the selected items' proposed audit questions, without inventing source claims.
  return [
    {
      text: "In hoeverre is het subsidiebeheer binnen de gekozen scope navolgbaar en beheerst?",
      children: lines.map((l) => {
        const field = sourceFields(l, "auditQuestion").find((f) =>
          fieldIncluded(draft, l.id, f.id),
        );
        return { text: draft.overrides[l.id]?.[field.id] ?? field.text, line_ids: [l.id] };
      }),
    },
  ];
}
export function applySuggestion(draft, suggestion, withChildren = true) {
  let result = addQuestion(draft, null, suggestion.text, "suggested");
  let next = result.draft;
  const rootId = result.question.id;
  for (const child of suggestion.children) {
    let target = rootId;
    if (withChildren) {
      result = addQuestion(next, rootId, child.text, "suggested");
      next = result.draft;
      target = result.question.id;
    }
    for (const id of child.line_ids) next = linkLine(next, id, target);
  }
  return next;
}
export function fieldIncluded(draft, lineId, fieldId) {
  return !(draft.excludedFields?.[lineId] ?? []).includes(fieldId);
}
export function chooseField(draft, line, kind, fieldId, include) {
  const fields = sourceFields(line, kind);
  if (!fields.some((f) => f.id === fieldId)) throw new Error("Onbekend brononderdeel.");
  const current = draft.excludedFields?.[line.id] ?? [];
  const next = include ? current.filter((id) => id !== fieldId) : unique([...current, fieldId]);
  if (fields.every((f) => next.includes(f.id)))
    throw new Error("Behoud minimaal één onderdeel per basisveld.");
  return { ...draft, excludedFields: { ...draft.excludedFields, [line.id]: next } };
}
export function validateFieldChoices(value, framework) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Ongeldige veldkeuze.");
  const result = {};
  for (const [id, excluded] of Object.entries(value)) {
    const line = framework.lines.find((l) => l.id === id);
    if (!line || !Array.isArray(excluded) || new Set(excluded).size !== excluded.length)
      throw new Error("Ongeldige veldkeuze.");
    const kinds = [
      "objective",
      "risk",
      "control",
      "criterion",
      "finding",
      "auditQuestion",
      "procedure",
      "owner",
    ];
    const all = kinds.flatMap((k) => sourceFields(line, k));
    if (
      excluded.some((id) => !all.some((f) => f.id === id)) ||
      kinds.some((k) => sourceFields(line, k).every((f) => excluded.includes(f.id)))
    )
      throw new Error("Onbekend of volledig uitgesloten basisveld.");
    result[id] = [...excluded];
  }
  return result;
}
export function exportResearch(framework, draft) {
  const r = researchOf(draft);
  if (!r.questions.length) return [];
  const lineLabel = (id) => `${framework.reports&&/^K\d+$/.test(id)?'H01-'+id:id} — ${framework.lines.find((l) => l.id === id)?.title ?? id}`;
  const out = [
    "## Onderzoeksopzet",
    "",
    "Vragen en koppelingen zijn onderzoeksvoorstellen. Het aantal onderdelen zegt niets over de volledigheid of beantwoording van een vraag.",
    "",
  ];
  const emit = (q, heading) => {
    const ids = questionLineIds(draft, q.id);
    out.push(
      `${heading} ${questionLabel(draft, q).replace(/[\r\n]+/g, " ")}`,
      `Vraag-ID: ${q.id} · ${q.origin === "suggested" ? "Voorgesteld — te beoordelen" : "Eigen onderzoeksvraag"}.`,
      ...ids.map((id) => `- ${lineLabel(id)}`),
      ...(ids.length ? [] : ["- Nog geen onderdelen rechtstreeks gekoppeld."]),
      "",
    );
  };
  for (const q of r.questions.filter((q) => q.parent_id === null)) {
    emit(q, "###");
    out.push(
      `Totaal: ${questionLineIds(draft, q.id, true).length} unieke onderdelen, inclusief deelvragen.`,
      "",
    );
    for (const sub of r.questions.filter((s) => s.parent_id === q.id)) emit(sub, "####");
  }
  const remaining = unassignedIds(draft);
  out.push(
    remaining.length ? "### Nog niet gekoppeld" : "### Koppelingen in deze export",
    ...(remaining.length
      ? remaining.map((id) => "- " + lineLabel(id))
      : ["Alle in deze export opgenomen onderdelen zijn gekoppeld."]),
    "",
    "De volledige onderdelen en bronverantwoording staan hieronder; een gedeeld onderdeel is één keer uitgewerkt.",
    "",
  );
  return out;
}
