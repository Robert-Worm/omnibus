import { sourceFields } from "./framework-source-items.mjs";
import { draftValue } from "./framework-model.mjs";
import { fieldIncluded, questionLineIds } from "./research-plan.mjs";
export function planningReview(framework, draft, ids = draft.included) {
  const issues = [];
  for (const q of draft.research?.questions || [])
    if (!q.text.trim())
      issues.push({ id: q.id, title: "Vraag nog te formuleren", missing: ["Vraagtekst"] });
    else if(!questionLineIds(draft,q.id,true).some(id=>ids.includes(id)))
      issues.push({id:q.id,title:q.text,missing:['Nog geen bouwstenen gekoppeld aan deze vraag']});
  for (const l of framework.lines.filter((l) => ids.includes(l.id))) {
    const has = (kind) =>
      sourceFields(l, kind).some(
        (f) => fieldIncluded(draft, l.id, f.id) && draftValue(l, f.id, draft).trim(),
      );
    const missing = [];
    if (!has("criterion"))
      missing.push(l.materialKind === "model-question" ? "Onderzoeksfocus" : "Norm");
    if (!has("auditQuestion")) missing.push("Toets- of interviewvraag");
    if (!has("procedure")) missing.push("Toetsaanpak");
    if (l.source_id && !draft.investigation?.materials.find((m) => m.id === l.id)?.location)
      missing.push("Bronverwijzing");
    if (missing.length) issues.push({ id: l.id, title: l.title, missing });
  }
  return issues;
}
