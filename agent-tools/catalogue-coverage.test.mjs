// Small synthetic source shapes, exercised through the production projections.
// No published data, source archive, browser project or server is opened.
import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readEntry, readRestrictedPoint, flatReadMaterial, modelReadMaterial, themesForPoint} from './read-materials.mjs';

const source = {id: 'F', title: 'Synthetic framework', url: 'https://example.invalid/source', edition: 'Fixture 1'};
const span = {page: 2, start: 4, end: 17, quote: 'Exact 🧭 citaat'};
const record = {id: 'REC', locator: 'Artikel 2', source_spans: [span]};
const point = {id: 'H', title: 'Synthetic HOLD', text: 'Unresolved meaning', selection_status: 'HOLD',
  selection_reason: 'Interpretatie open', scope: 'Alleen sector X', exceptions: ['Uitgezonderd Y'],
  source_links: [{record_id: record.id, contribution: 'PRIMARY', visible_spans: [span]}]};

await test('HOLD behoudt exacte passages, beperkingen en herleiding zonder selectiefabriek', () => {
  const detail = {records: [record], issues: [{id: 'I', description: 'Open bronvraag'}]};
  const before = JSON.stringify({source, point, detail});
  const material = readRestrictedPoint(source, point, detail, {trace: {reviewBasis: 'a'.repeat(64)}});
  assert.match(material.sourceText, /Pagina 2 \[4–17\]\nExact 🧭 citaat/);
  assert.match(material.sourceContext, /HOLD.*Interpretatie open/);
  assert.match(material.sourceContext, /Uitgezonderd Y/);
  assert.deepEqual(JSON.parse(material.readTrace).point, point);
  assert.equal(readEntry('framework', source, point.id, material, {selectionStatus: 'HOLD'}).draftSelectable, false);
  assert.equal(JSON.stringify({source, point, detail}), before);
  assert.throws(() => readRestrictedPoint(source, point, {records: []}), /Ontbrekend bronrecord/);
});

await test('WWKE-achtige linkpassages en XML-only bewijs blijven gescheiden', () => {
  const xml = {...record, evidence_kind: 'XML_ONLY', xml_evidence: {quote: 'Exact XML 🧭'}};
  const material = readRestrictedPoint(source, point, {records: [xml]}, {linkSpans: true});
  assert.match(material.sourceText, /XML · geconsolideerde tekst; geen PDF-markering\nExact XML 🧭/);
  assert.doesNotMatch(material.sourceText, /Exact 🧭 citaat|Pagina 2/);
  const narrow = {...point, source_links: [{...point.source_links[0], visible_spans: [{...span, quote: 'Linkbijdrage'}]}]};
  assert.match(readRestrictedPoint(source, narrow, {records: [record]}, {linkSpans: true}).sourceText, /Linkbijdrage/);
  assert.doesNotMatch(readRestrictedPoint(source, narrow, {records: [record]}, {linkSpans: true}).sourceText, /Exact 🧭 citaat/);
  const absent = readRestrictedPoint(source, point, {records: [{...record, source_spans: []}]});
  assert.equal(readEntry('law', source, point.id, absent).passageStatus, 'NOT_AVAILABLE');
});

await test('flat kader bewaart bronversies en gebruikt uitsluitend de gedeelde passage-uitkomst', () => {
  const p = {id: 'F1', auditNorm: 'Norm', sourceHash: 'b'.repeat(64), sourceContext: 'Voorwaardelijk'};
  const document = {id: 'D', title: 'Fictief document', pdf_hash: p.sourceHash, source_sha256: 'c'.repeat(64)};
  const before = JSON.stringify(p);
  const material = flatReadMaterial(source, p, [document], (d, reference) => {
    assert.equal(d, document); assert.equal(reference.sourceHash, p.sourceHash); return [{...span, label: '§ 2'}];
  });
  assert.equal(material.body, p.auditNorm);
  assert.match(material.sourceText, /Fictief document\n§ 2\nBronfragment 2 \[4–17\]\nExact 🧭 citaat/);
  assert.equal(JSON.parse(material.readTrace).passages[0].sourceHash, p.sourceHash);
  assert.equal(material.sourceContext, p.sourceContext);
  assert.equal(JSON.stringify(p), before);
  assert.equal(flatReadMaterial(source, p, [], () => assert.fail('Geen alternatieve versie')).sourceText, undefined);
});

await test('modellen geven bronverwijzingen en grenzen zonder interviewvraag als broncitaat', () => {
  const model = {id: 'M', version: '1', source: 'Publicatie', limitation: 'Geen meetschaal', usageNotes: 'Verkennend',
    sources: [{id: 'S1', title: 'Primaire publicatie', url: 'https://example.invalid/model'}, {id: 'S2', title: 'Ander werk'}]};
  const item = {id: 'DIM', boundary: 'Alleen samenwerking', definition: 'Samen beslissen'};
  const q = {id: 'Q', sourceIds: ['S1'], sourcePage: 'p. 8', question: 'Hoe ging het?'};
  const material = modelReadMaterial(model, item, q, {title: 'Vraag', question: q.question});
  assert.match(material.sourceContext, /Primaire publicatie/); assert.doesNotMatch(material.sourceContext, /Ander werk/);
  assert.match(material.sourceContext, /Geen meetschaal/); assert.match(material.sourceContext, /Alleen samenwerking/);
  assert.equal(JSON.parse(material.readTrace).question.sourcePage, 'p. 8');
  assert.equal(readEntry('model', model, q.id, material).passageStatus, 'NOT_AVAILABLE');
  assert.equal(material.sourceText, undefined);
});

await test('thema verwijst alleen naar zijn bestaande rapportnormen', () => {
  const themes = [{id: 'T', title: 'Synthetic theme', keywords: 'archief', lineIds: ['L1']}, {id: 'OLD', title: 'Excluded', lineIds: ['OLD']}];
  assert.deepEqual(themesForPoint(themes, {legacy_line_id: 'L1'}).map(t => t.id), ['T']);
  assert.deepEqual(themesForPoint(themes, {legacy_line_id: 'UNKNOWN'}), []);
});

await test('indexEntries loopt de actieve catalogus langs: rapport, wetten, Topical, nieuwe kaders, model en thema', async () => {
  // Replace only the catalogue dependencies of workflow.mjs. Its generator and
  // the read projections above are real; write workflows must never be invoked.
  const sourceCode = `
    export const loads=[];
    export async function ensureCatalogue(keys){loads.push(...keys);}
    export const configureCatalogueReader=()=>{};
    export const baseFramework={},workspaces=[],themes=[{id:'T',title:'Theme',lineIds:['L']}];
    export const corpus=[{framework:{report:{id:'R',title:'Report'}}}];
    export const reportSummaries={R:{admittedIds:['L']}};
    const catalogue={points:[{id:'RP',report_id:'R',legacy_line_id:'L'},{id:'EXCLUDED',report_id:'R',legacy_line_id:'OLD'}]};
    export default catalogue;
    export const cioSourceId='C',wwkeSourceId='W';
    export const cioMetadata={id:'C',title:'CIO',kind:'law'},wwkeMetadata={id:'W',title:'WWKE',kind:'law'};
    export const cioStatus={},cioReviewBasis='basis',wwkeContext={},wwkeStatus={},wwkeReviewBasis='basis',wwkeFilterMap=new Map(),wwkeFilters={vocabularies:{sectors:[]}};
    const normal={id:'OK',title:'Norm',text:'Norm',selection_status:'SELECTABLE',source_links:[],objective_ids:[]};
    const hold={...normal,id:'H',selection_status:'HOLD',selection_reason:'Open'};
    export const cioPoints=[normal,hold],wwkePoints=[normal,hold,{...normal,id:'CTX',selection_status:'CONTEXT_ONLY'}];
    export const cioRecordsFor=()=>[],cioIssuesFor=()=>[],cioGoalFor=()=>null,cioCatalogue={criteria:[],objectives:[]},wwkePointContext=()=>({records:[]});
    const material={title:'Norm',body:'Norm',sourceText:'Exact synthetic quote'};
    export const makeReportPointMaterial=()=>({...material,reportTrace:'report trace'}),makeCioMaterial=p=>{
      if(p.selection_status!=='SELECTABLE')throw Error('HOLD factory called');return {...material,cioTrace:'CIO trace'};};
    export const selectWwkePointsDirect=(draft,ids)=>{if(ids[0]!=='OK')throw Error('HOLD selection called');return {investigation:{materials:[{id:'local',...material,lawTrace:'WWKE trace'}]}}};
    export const foundations=[cioMetadata,wwkeMetadata,{id:'TOP',title:'Topical',kind:'audit'},
      {id:'NEW',title:'New framework',kind:'framework',catalogueAdmission:{schema:'reviewed-flat/v1',reviewBasis:'a'.repeat(64)}}];
    export const topicalPackage=id=>id==='TOP'?{catalogue:{points:[normal,hold]},manifest:{documents:[]}}:null;
    export const makeTopicalMaterial=(p,point)=>{if(point.selection_status!=='SELECTABLE')throw Error('HOLD factory called');return {...material,topicalTrace:'Topical trace'};};
    export const topicalTrace=()=>({records:[],limitations:['Unresolved']}),topicalSpanLocation=()=>'';
    export const preparedFoundationItems=[{id:'F',sourceId:'NEW',title:'Flat',auditNorm:'Norm',auditRole:'norm',reviewStatus:'reviewed'},
      {id:'FH',sourceId:'NEW',title:'Hold',auditNorm:'Norm',auditRole:'norm',reviewStatus:'draft',selection_status:'SELECTABLE'},
      {id:'FC',sourceId:'NEW',title:'Scope',body:'Scope',auditRole:'scope'},
      {id:'HIDDEN',sourceId:'UNADMITTED',title:'Hidden',auditNorm:'Excluded'}];
    export const documentsForFoundation=()=>[],foundationPassages=()=>[];
    export const initialModelLibrary=()=>({models:[{id:'M',title:'Model',source:'Synthetic publication',limitation:'Boundary',
      items:[{id:'I',questions:[{id:'Q',question:'How?'}]}]}]});
    export const selectedModelMaterials=()=>[{title:'Question',body:'Construct',question:'How?'}];
    export const newProject=()=>({draft:{}}),exportPresets=[];
    const forbidden=()=>{throw Error('Read indexing must not run a write workflow')};
    export const setReportPointSelection=forbidden,chooseCioPoints=forbidden,restoreModelLibrary=forbidden,
      scopedExportSelection=forbidden,exportDraftForSelection=forbidden,addMaterials=forbidden,investigationFramework=forbidden,
      validateExportSettings=forbidden,validateDraft=forbidden,addQuestion=forbidden,setQuestionDesign=forbidden,linkLine=forbidden,
      serializeProject=forbidden,parseProjectText=forbidden,readProject=forbidden,exportAuditXlsx=forbidden;
  `;
  const url = 'data:text/javascript,' + encodeURIComponent(sourceCode);
  const hook = registerHooks({resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('/agent-tools/workflow.mjs') && specifier.startsWith('../lib/') && !specifier.endsWith('/admitted-foundation.mjs'))
      return {url, shortCircuit: true};
    return next(specifier, context);
  }});
  try {
    const workflow = await import('./workflow.mjs');
    const entries = [];
    for await (const entry of workflow.indexEntries()) entries.push(entry);
    assert.deepEqual([...new Set(entries.map(e => e.sourceId))], ['R', 'C', 'W', 'TOP', 'NEW', 'M']);
    assert.equal(entries.length, 14);
    assert(!entries.some(e => e.pointId === 'EXCLUDED' || e.pointId === 'HIDDEN'));
    assert.deepEqual(entries.find(e => e.key === 'R|RP').themes.map(t => t.id), ['T']);
    assert.equal(entries.find(e => e.key === 'TOP|OK').material.topicalTrace, 'Topical trace');
    for (const key of ['C|H', 'W|H', 'TOP|H', 'NEW|FH']) {
      assert.equal(entries.find(e => e.key === key).selectionStatus, 'HOLD', key);
      assert.equal(entries.find(e => e.key === key).draftSelectable, false, key);
    }
    assert.equal(entries.find(e => e.key === 'W|CTX').selectionStatus, 'CONTEXT_ONLY');
    assert.equal(entries.find(e => e.key === 'NEW|FC').selectionStatus, 'CONTEXT_ONLY');
    assert.equal(entries.find(e => e.key === 'NEW|F').draftSelectable, false);
    assert.deepEqual(entries.filter(e => e.kind === 'model').map(e => e.level), ['operational', 'management', 'strategic']);
    assert.match(entries.find(e => e.kind === 'model').material.sourceContext, /Boundary/);
    const {loads} = await import(url);
    for (const key of ['catalogue', 'models', 'report:R', 'foundation:NEW', 'source:NEW', 'foundation:TOP']) assert(loads.includes(key), key);
  } finally { hook.deregister(); }
});
