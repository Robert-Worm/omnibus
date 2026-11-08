// Exportregel zonder zware afhankelijkheden, zodat ook de exportberekening in de worker hem kan laden.
// Alleen voor de export: gekozen bouwstenen die bij geen vraag horen, gaan mee (besluit beheerder 8 november 2026).
// Eerst onder een deelvraag waar al een verwant toetspunt hangt: dezelfde norm, dezelfde beheersdoelstelling
// of een verwante NOREA- of RTS/ITS-norm. Anders onder de eerste centrale vraag. Het project zelf verandert niet.
import {verwanteNormen} from './norea-verwant.mjs';

const normVan = pointId => String(pointId ?? '').replace(/-P\d+[A-Za-z0-9-]*$/u, '');
function kenmerken(line, material) {
  const sourceId = material?.foundationId || '';
  const pointId = line?.sourcePointId || material?.sourcePointId || '';
  const norm = pointId && normVan(pointId) !== pointId ? normVan(pointId) : '';
  return {sourceId, norm, groep: line?.collectionGroup?.id || '',
    verwant: new Set(norm ? verwanteNormen(sourceId, norm).map(l => l.id + '|' + l.label) : [])};
}
function score(u, l) {
  if (u.sourceId && u.sourceId === l.sourceId && u.norm && u.norm === l.norm) return 3;
  if (u.groep && u.groep === l.groep) return 2;
  if (u.norm && l.norm && [...u.verwant].some(v => v.startsWith(l.sourceId + '|'))) {
    // verwant op normniveau: de NOREA-kant noemt de RTS-norm, of andersom
    const terug = verwanteNormen(l.sourceId, l.norm).some(x => x.id === u.sourceId);
    if (terug && verwanteNormen(u.sourceId, u.norm).some(x => x.id === l.sourceId)) return 1;
  }
  return 0;
}

export function linkUnlinkedForExport(draft, framework) {
  const r = draft.research;
  const central = r?.questions?.find((q) => q.parent_id === null);
  if (!central) return { draft, autoLinked: [], central: null, placed: {} };
  const questionIds = new Set(r.questions.map((q) => q.id));
  const geldig = r.links.filter((l) => questionIds.has(l.question_id));
  const linked = new Set(geldig.map((l) => l.line_id));
  const autoLinked = [...new Set(draft.included.filter((id) => !linked.has(id)))];
  if (!autoLinked.length) return { draft, autoLinked, central, placed: {} };
  const lines = new Map((framework?.lines ?? []).map((l) => [l.id, l]));
  const materials = new Map((draft.investigation?.materials ?? []).map((m) => [m.id, m]));
  const info = id => kenmerken(lines.get(id), materials.get(id));
  const deelvragen = r.questions.filter((q) => q.parent_id !== null);
  const perVraag = new Map(deelvragen.map((q) => [q.id, geldig.filter((l) => l.question_id === q.id).map((l) => info(l.line_id))]));
  const placed = {};
  const extra = autoLinked.map((line_id) => {
    const u = info(line_id);
    let best = null, bestScore = 0;
    for (const q of deelvragen) {
      const s = Math.max(0, ...perVraag.get(q.id).map((l) => score(u, l)));
      if (s > bestScore) { best = q; bestScore = s; }
    }
    const question_id = best ? best.id : central.id;
    placed[line_id] = question_id;
    return { question_id, line_id };
  });
  return { draft: { ...draft, research: { ...r, links: [...r.links, ...extra] } }, autoLinked, central, placed };
}
