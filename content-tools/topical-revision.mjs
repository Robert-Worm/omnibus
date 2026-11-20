// Tekstcorrecties op de Topical-bronpakketten voorbereiden (B-094). Een correctieverzoek buiten Git noemt per wijziging
// de bron, het object, het veld en de nieuwe tekst (of exacte vervangingen) met de reden. Een onafhankelijke review
// beoordeelt precies die versie van het verzoek. Dit hulpmiddel ontwerpt en beoordeelt niets: het rekent de
// controlegetallen uit, maakt per geraakt toetspunt de beoordeelde overgang en weigert bij elke afwijking.
import {createHash} from 'node:crypto';
import {applyTopicalTextRevisions, topicalRevisedValue, topicalRevisionTarget, TOPICAL_TEXT_REVISION_FORMAT, validateTopicalTextRevisions} from '../lib/topical-text-revisions.mjs';
import {compactTopicalTrace, topicalTrace, topicalTraceHash} from '../lib/topical-source-trace.mjs';

export const REVISION_REQUEST_FORMAT = 'omnibus-topical-revision-request';
export const REVISION_REVIEW_FORMAT = 'omnibus-topical-revision-review';
export const sha256 = text => createHash('sha256').update(text).digest('hex');
const digest = value => sha256(JSON.stringify(value));

/** Alle trace-hashes (volledig en ingekort) van de selecteerbare toetspunten van de genoemde bronnen. */
function traceHashes(data, sourceIds) {
  const result = new Map();
  for (const packet of data.packages.filter(p => sourceIds.has(p.id)))
    for (const point of packet.catalogue.points.filter(p => p.selection_status === 'SELECTABLE')) {
      const trace = topicalTrace(packet, point);
      result.set(packet.id + ':' + point.id, {sourceId: packet.id, pointId: point.id,
        full: topicalTraceHash(trace, sha256), compact: topicalTraceHash(compactTopicalTrace(trace), sha256)});
    }
  return result;
}

/**
 * @param {{packages:any[],textRevisions?:any}} hydrated alle pakketten met hun geladen gegevens (wordt niet gewijzigd)
 * @param {string} requestRaw het correctieverzoek zoals bewaard
 * @param {string} reviewRaw de review van precies dat verzoek
 * @returns {{status:'HOLD',problems:string[]}|{status:'READY',textRevisions:any,changedPoints:string[],edits:number}}
 */
export function prepareTopicalRevision(hydrated, requestRaw, reviewRaw) {
  const problems = [], say = message => problems.push(message);
  let request, review;
  try { request = JSON.parse(requestRaw); review = JSON.parse(reviewRaw); } catch { return {status: 'HOLD', problems: ['Verzoek of review is geen geldige JSON.']}; }
  if (request?.format !== REVISION_REQUEST_FORMAT || !/^\d{8}\.\d{2}$/u.test(request.edition || '') || !Array.isArray(request.items) || !request.items.length)
    return {status: 'HOLD', problems: [`Geen correctieverzoek (format ${REVISION_REQUEST_FORMAT}, edition zoals 20261120.03, items).`]};
  if (review?.format !== REVISION_REVIEW_FORMAT || review.requestSha256 !== sha256(requestRaw) || !String(review.reviewer || '').trim() ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(review.date || '') || !Array.isArray(review.decisions))
    return {status: 'HOLD', problems: ['De review hoort niet bij deze versie van het verzoek, of mist reviewer, datum of besluiten.']};
  const existing = hydrated.textRevisions ?? {format: TOPICAL_TEXT_REVISION_FORMAT, batches: [], edits: [], transitions: []};
  if (existing.batches.some(batch => batch.id === request.edition)) return {status: 'HOLD', problems: [`Reeks ${request.edition} bestaat al.`]};
  const keys = new Set();
  for (const item of request.items) {
    if (!/^[A-Za-z0-9._-]{1,100}$/u.test(item?.key || '') || keys.has(item.key)) say(`Ongeldige of dubbele sleutel: ${item?.key}`);
    keys.add(item?.key);
    const decision = review.decisions.filter(row => row.key === item?.key);
    if (decision.length !== 1 || decision[0].decision !== 'ACCEPT') say(`${item?.key}: geen aanvaarding in de review (${decision[0]?.decision ?? 'ontbreekt'}).`);
  }
  if (review.decisions.some(row => !keys.has(row.key))) say('De review noemt een correctie die niet in het verzoek staat.');
  if (problems.length) return {status: 'HOLD', problems};

  // Werk op een kopie: eerst de bestaande correcties, dan de nieuwe, elk met de controlegetallen van vóór en na.
  const ids = new Set([...existing.edits, ...request.items].map(item => item.sourceId));
  const relevant = hydrated.packages.filter(p => ids.has(p.id));
  const before = structuredClone({packages: relevant, textRevisions: existing});
  applyTopicalTextRevisions(before, sha256);
  const working = structuredClone(before), reviewSha256 = sha256(reviewRaw);
  const reasonText = reason => typeof reason === 'number' ? existing.reasons[reason] : reason;
  const edits = existing.edits.map(edit => ({...edit, reason: reasonText(edit.reason)}));
  for (const item of request.items) {
    const edit = {batch: request.edition, sourceId: item.sourceId, collection: item.collection, ...(item.id === undefined ? {} : {id: item.id}), field: item.field,
      before: '', after: '', ...(Object.hasOwn(item, 'value') ? {value: item.value} : {replace: item.replace}), reason: item.reason};
    const packet = working.packages.find(p => p.id === item.sourceId);
    let target;
    try { target = packet ? topicalRevisionTarget(packet, edit) : null; } catch (error) { say(`${item.key}: ${error.message}`); continue; }
    if (!target || !Object.hasOwn(target.parent, target.key)) { say(`${item.key}: het veld ${item.sourceId} › ${item.id ?? item.collection} › ${item.field} bestaat niet.`); continue; }
    const current = target.parent[target.key];
    let next;
    try { next = topicalRevisedValue(edit, current); } catch (error) { say(`${item.key}: ${error.message}`); continue; }
    if (digest(next) === digest(current)) { say(`${item.key}: verandert niets.`); continue; }
    target.parent[target.key] = next;
    const previous = edits.findIndex(old => old.sourceId === edit.sourceId && old.collection === edit.collection && old.id === edit.id && old.field === edit.field);
    if (previous >= 0) {
      // Een veld dat al gecorrigeerd was: één correctie van de oorspronkelijke tekst naar de nieuwe.
      edits[previous] = {...edit, before: edits[previous].before, after: digest(next), value: structuredClone(next), replace: undefined,
        reason: edits[previous].reason + ' | ' + edit.reason};
      delete edits[previous].replace;
    } else edits.push({...edit, before: digest(current), after: digest(next)});
  }
  if (problems.length) return {status: 'HOLD', problems};

  const sourceIds = new Set(edits.map(edit => edit.sourceId));
  const old = traceHashes(before, sourceIds), now = traceHashes(working, sourceIds);
  const reviewer = String(review.reviewer).trim();
  const changed = [...now.values()].filter(row => old.get(row.sourceId + ':' + row.pointId)?.full !== row.full);
  // Bestaande overgangen van deze laag blijven: een project van vóór een eerdere overgang komt via de keten van
  // beoordeelde overgangen bij de nieuwe versie (acceptsReviewedTopicalTrace volgt die keten).
  const transitions = [...existing.transitions];
  for (const row of changed) {
    const was = old.get(row.sourceId + ':' + row.pointId);
    const accept = extra => ({format: 'omnibus-reviewed-trace-transition/1', sourceId: row.sourceId, pointId: row.pointId, ...extra,
      review: {decision: 'ACCEPT', basisSha256: reviewSha256, reviewer: extra.reviewer ?? reviewer}});
    transitions.push(accept({previousTraceHash: was.full, currentTraceHash: row.full, previousCompactTraceHash: was.compact, currentCompactTraceHash: row.compact}));
  }
  // Elke reden één keer bewaren: bij duizenden gelijke correcties scheelt dat veel in de geladen gegevens.
  const reasons = [...new Set(edits.map(edit => edit.reason))];
  for (const edit of edits) edit.reason = reasons.indexOf(edit.reason);
  const textRevisions = {format: TOPICAL_TEXT_REVISION_FORMAT, reasons,
    batches: [...existing.batches, {id: request.edition, date: review.date, reviewer, reviewSha256, requestSha256: review.requestSha256, humanValidation: false,
      summary: String(request.summary || '').trim() || `${request.items.length} correcties`}],
    edits, transitions};
  validateTopicalTextRevisions(textRevisions);
  // Controle: de laag op de onveranderde pakketten geeft precies de bewerkte versie.
  const check = structuredClone({packages: relevant, textRevisions});
  applyTopicalTextRevisions(check, sha256);
  for (const id of sourceIds) {
    const a = check.packages.find(p => p.id === id), b = working.packages.find(p => p.id === id);
    if (digest(a.catalogue) !== digest(b.catalogue) || digest(a.context) !== digest(b.context) || digest(a.status) !== digest(b.status))
      return {status: 'HOLD', problems: [`De correctielaag geeft voor ${id} niet de beoordeelde versie.`]};
  }
  return {status: 'READY', textRevisions, edits: request.items.length, changedPoints: changed.map(row => row.sourceId + ':' + row.pointId)};
}
