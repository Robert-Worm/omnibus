// Aflevering van de Topical-kaders aan de browser (snelheid, testronde 20-11). Een deel van de gepubliceerde gegevens
// leest de browser nooit: de redactionele voorgeschiedenis van een toetspunt (editorial_context) en de auteurscontext van
// de vragen. Die blijven in de publicatie, zodat de publicatiecontrole alles ziet, maar onder een eigen sleutel
// (archive:…) die de browser niet ophaalt. De beoordeelde overgangen en de tekstcorrecties gaan mee met de gegevens van
// hun bron in plaats van bij het openen van de pagina.
//
// Dit verandert geen inhoud: de volledig samengestelde module is na het herverpakken byte voor byte gelijk aan ervoor
// (op de nieuwe hulpvelden na). Een bewaard project met een volledige herleiding wordt gecontroleerd tegen het
// controlegetal van die volledige herleiding (fullTraceHashes), dat hier wordt uitgerekend.
import {createHash} from 'node:crypto';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {applyTopicalTextRevisions} from '../lib/topical-text-revisions.mjs';
import {topicalTrace, topicalTraceHash} from '../lib/topical-source-trace.mjs';

export const TOPICAL_MODULE = 'lib/topical-reviewed.json';
const sha256 = text => createHash('sha256').update(text).digest('hex');
const LOCAL = /^(?:foundation|archive|source|questions):([^:]+):local:lib\/topical-reviewed\.json:\d+$/u;
// Interviewvragen en hun reviews: nodig in de viewer, bij de vraagopzet en de export, niet om een onderwerp te kiezen (B-097).
const QUESTION_FIELDS = new Set(['interviewReviews', 'interviewPlans']);
// Velden van een kader die de browser niet leest (alleen de publicatiecontrole en de auteursstraat).
const ARCHIVE_FIELDS = new Set(['questionAuthoringContext', 'authoringContexts', 'layeredParentRelations', 'reportingFieldMatrix',
  'context_records', 'source_dispositions', 'sourceRelationIndex', 'requirementIndex']);
const CHUNK = 1_500_000;
const DERIVED = new Set(['reviewedTraceTransitions', 'fullTraceHashes']);

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const derived = path => path[0] === 'textRevisions' || (path[0] === 'packages' && path.length === 3 && DERIVED.has(path[2]));
function hydrate(initial, value, read, keys) {
  const data = structuredClone(initial);
  for (const key of keys) applyCatalogueEdits(data, JSON.parse(read(value.refs[key].hash)));
  return data;
}
/** Vergelijk zonder de hulpvelden en zonder de volgorde van de per bron geleverde correcties. */
function comparable(module) {
  const copy = structuredClone(module);
  for (const packet of copy.packages ?? []) { delete packet.fullTraceHashes; delete packet.pointCounts; }
  if (copy.textRevisions) for (const list of ['edits', 'transitions'])
    copy.textRevisions[list] = (copy.textRevisions[list] ?? []).map(entry => JSON.stringify(entry)).sort();
  return JSON.stringify(copy);
}

/**
 * Verpak de Topical-module opnieuw. read(hash) geeft de opgeslagen resource, write(payload) slaat er een op en geeft de hash.
 * @param {any} value de runtimepublicatie (wordt niet gewijzigd)
 * @param {{read:(hash:string)=>string,write:(payload:string)=>string,textRevisions?:any}} io
 */
export function packTopicalDelivery(value, {read, write, textRevisions}) {
  const keys = value.registrations[TOPICAL_MODULE] ?? [], local = keys.filter(key => LOCAL.test(key)), other = keys.filter(key => !LOCAL.test(key));
  const initial = value.modules[TOPICAL_MODULE];
  // De logische inhoud: alles samengesteld; de correctielaag zoals opgegeven (of zoals gepubliceerd).
  const logical = hydrate(initial, value, read, keys);
  if (textRevisions) logical.textRevisions = structuredClone(textRevisions);
  const packets = logical.packages.map((packet, index) => ({packet, index})).filter(({packet}) => local.some(key => key.split(':')[1] === packet.id));
  // Controlegetal van de volledige herleiding per toetspunt, met de correctielaag toegepast (zoals de browser hem ziet).
  const view = structuredClone(logical);
  applyTopicalTextRevisions(view, sha256);
  const fullTraceHashes = new Map(packets.map(({packet}) => {
    const shown = view.packages.find(p => p.id === packet.id), hashes = {};
    for (const point of shown.catalogue.points) if (point.selection_status === 'SELECTABLE' && isObject(point.editorial_context) && Object.keys(point.editorial_context).length)
      hashes[point.id] = topicalTraceHash(topicalTrace(shown, point), sha256);
    return [packet.id, hashes];
  }));

  // Het nieuwe begin: overgangen en correcties leeg; ze komen per bron mee.
  const next = structuredClone(initial);
  if (logical.textRevisions) next.textRevisions = {...structuredClone(logical.textRevisions), edits: [], transitions: []};
  for (const {index} of packets) {
    if (Object.hasOwn(next.packages[index], 'reviewedTraceTransitions')) next.packages[index].reviewedTraceTransitions = [];
    next.packages[index].fullTraceHashes = {};
    // Aantal kiesbare toetspunten per norm: zo telt het onderwerpfilter zonder de hele bron te laden (snelheid).
    const counts = {};
    for (const point of logical.packages[index].catalogue.points ?? []) if (point.selection_status === 'SELECTABLE') counts[point.criterion_id] = (counts[point.criterion_id] ?? 0) + 1;
    next.packages[index].pointCounts = counts;
  }
  // Loop de bestaande wijzigingen in volgorde door en splits ze in een deel voor de browser en een archiefdeel.
  // De volgorde van de sleutels blijft gelijk aan de volgorde van de wijzigingen, zodat het samengestelde geheel gelijk blijft.
  const segments = [];
  const push = (kind, source, edit) => {
    const last = segments.at(-1), bytes = Buffer.byteLength(JSON.stringify(edit));
    if (last && last.kind === kind && last.source === source && last.bytes + bytes < CHUNK) { last.edits.push(edit); last.bytes += bytes; }
    else segments.push({kind, source, edits: [edit], bytes});
  };
  const simulation = structuredClone(next), late = [];
  for (const key of keys) {
    const source = key.split(':')[1];
    for (const edit of JSON.parse(read(value.refs[key].hash))) {
      if (!LOCAL.test(key)) { applyCatalogueEdits(simulation, [structuredClone(edit)]); continue; }
      if (derived(edit.path)) continue;
      const [root, index, part, field] = edit.path;
      const archived = key.startsWith('archive:') || (root === 'packages' && part === 'catalogue' && ARCHIVE_FIELDS.has(field)) || edit.path.includes('editorial_context');
      if (archived) { push('archive', source, edit); applyCatalogueEdits(simulation, [structuredClone(edit)]); continue; }
      const question = key.startsWith('questions:') || (root === 'interviewReviews') || (root === 'packages' && part === 'catalogue' && QUESTION_FIELDS.has(field));
      if (question) { push('questions', source, edit); applyCatalogueEdits(simulation, [structuredClone(edit)]); continue; }
      // Brontekst per pagina: alleen nodig in de bronviewer, die de bron (source:…) apart laadt.
      if (key.startsWith('source:') || (root === 'packages' && part === 'documents' && edit.path[4] === 'pages')) { push('source', source, edit); applyCatalogueEdits(simulation, [structuredClone(edit)]); continue; }
      if (root === 'packages' && part === 'catalogue' && edit.path.length === 3 && isObject(edit.value)) {
        // Eén toewijzing met velden van beide soorten: in de oorspronkelijke volgorde in stukken.
        let run = null;
        for (const [name, item] of Object.entries(edit.value)) {
          const kind = ARCHIVE_FIELDS.has(name) ? 'archive' : QUESTION_FIELDS.has(name) ? 'questions' : 'browser';
          if (!run || run.kind !== kind) { if (run) { push(run.kind, source, run.edit); applyCatalogueEdits(simulation, [structuredClone(run.edit)]); } run = {kind, edit: {path: edit.path, value: {}}}; }
          run.edit.value[name] = item;
        }
        if (run) { push(run.kind, source, run.edit); applyCatalogueEdits(simulation, [structuredClone(run.edit)]); }
        continue;
      }
      if (root === 'packages' && part === 'catalogue' && field === 'points' && edit.path.length === 4 && Array.isArray(edit.value)) {
        // Toetspunten zonder hun redactionele voorgeschiedenis; die komt aan het eind in het archief.
        const shown = edit.value.map(point => isObject(point?.editorial_context) && Object.keys(point.editorial_context).length ? {...point, editorial_context: {}} : point);
        const browserEdit = {...edit, value: shown};
        push('browser', source, browserEdit); applyCatalogueEdits(simulation, [structuredClone(browserEdit)]);
        // De voorgeschiedenis komt aan het eind in het archief, op de plek die het toetspunt dan heeft.
        for (const [i, point] of edit.value.entries()) if (shown[i] !== point) late.push({source, index, id: point.id, value: point.editorial_context});
        continue;
      }
      push('browser', source, edit); applyCatalogueEdits(simulation, [structuredClone(edit)]);
    }
  }
  for (const {source, index, id, value: history} of late) {
    const points = simulation.packages[index].catalogue.points, at = points.findIndex(point => point.id === id);
    if (at < 0 || points.filter(point => point.id === id).length !== 1) throw Error('Toetspunt niet eenduidig bij het verpakken: ' + id);
    push('archive', source, {path: ['packages', index, 'catalogue', 'points', at, 'editorial_context'], value: history});
  }
  // Per bron: overgangen, controlegetallen en correcties, mee met de bron.

  const revisions = logical.textRevisions;
  for (const {packet, index} of packets) {
    const transitions = packet.reviewedTraceTransitions ?? [];
    for (let i = 0; i < transitions.length; i += 2000)
      push('browser', packet.id, {path: ['packages', index, 'reviewedTraceTransitions'], value: transitions.slice(i, i + 2000)});
    push('browser', packet.id, {path: ['packages', index, 'fullTraceHashes'], value: fullTraceHashes.get(packet.id)});
    if (revisions) for (const list of ['edits', 'transitions']) {
      const own = revisions[list].filter(entry => entry.sourceId === packet.id);
      for (let i = 0; i < own.length; i += 1500) push('browser', packet.id, {path: ['textRevisions', list], value: own.slice(i, i + 1500)});
    }
  }
  if (revisions && revisions.edits.concat(revisions.transitions).some(entry => !packets.some(({packet}) => packet.id === entry.sourceId)))
    throw Error('Correctie voor een bron zonder eigen gegevens.');
  // Nieuwe sleutels en verwijzingen.
  const result = structuredClone(value), counters = new Map(), newKeys = [];
  for (const key of local) delete result.refs[key];
  for (const segment of segments) {
    const prefix = (segment.kind === 'browser' ? 'foundation' : segment.kind) + ':' + segment.source + ':local:' + TOPICAL_MODULE;
    const n = counters.get(prefix) ?? 0; counters.set(prefix, n + 1);
    const payload = JSON.stringify(segment.edits), hash = write(payload), key = prefix + ':' + n;
    result.refs[key] = {release: value.release, hash, bytes: Buffer.byteLength(payload)};
    newKeys.push(key);
  }
  result.modules[TOPICAL_MODULE] = next;
  // Andere sleutels behouden hun plaats ten opzichte van elkaar; de herverpakte komen op de plek van de eerste oude.
  const first = keys.findIndex(key => LOCAL.test(key));
  result.registrations[TOPICAL_MODULE] = first < 0 ? [...other, ...newKeys] : [...keys.slice(0, first).filter(key => !LOCAL.test(key)), ...newKeys, ...keys.slice(first).filter(key => !LOCAL.test(key))];

  // Controle 1: alles samengesteld is gelijk aan de logische inhoud.
  const full = hydrate(next, result, read, result.registrations[TOPICAL_MODULE]);
  if (comparable(full) !== comparable(logical)) throw Error('Herverpakken veranderde de inhoud; niets geschreven.');
  // Controle 2: wat de browser ophaalt, bevat geen archiefdelen en geen redactionele voorgeschiedenis.
  const browserKeys = result.registrations[TOPICAL_MODULE].filter(key => key.startsWith('foundation:'));
  const browser = hydrate(next, result, read, browserKeys);
  for (const {index} of packets) {
    const catalogue = browser.packages[index].catalogue;
    const left = catalogue.points.find(point => isObject(point.editorial_context) && Object.keys(point.editorial_context).length);
    if (left) throw Error('Redactionele voorgeschiedenis in de browserlevering: ' + left.id);
  }
  const size = keysOf => keysOf.reduce((sum, key) => sum + result.refs[key].bytes, 0);
  return {value: result, report: {browserBytes: size(browserKeys.filter(key => LOCAL.test(key))), sourceTextBytes: size(result.registrations[TOPICAL_MODULE].filter(key => key.startsWith('source:') && LOCAL.test(key))),
    questionBytes: size(result.registrations[TOPICAL_MODULE].filter(key => key.startsWith('questions:'))), archiveBytes: size(result.registrations[TOPICAL_MODULE].filter(key => key.startsWith('archive:'))),
    beforeBytes: local.reduce((sum, key) => sum + value.refs[key].bytes, 0), inlineBytes: Buffer.byteLength(JSON.stringify(next)), keys: newKeys.length}};
}
