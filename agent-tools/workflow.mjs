// Shared application domain logic, bundled against the pinned database release.
// This module never reads a user's browser storage or changes source content.
import {configureCatalogueReader} from './catalogue-transport.mjs';
import {ensureCatalogue} from '../lib/catalogue-runtime.mjs';
import {baseFramework, corpus, workspaces, themes} from '../lib/application-catalogue.mjs';
import {reportSummaries} from '../lib/catalogue-summary.mjs';
import catalogue from '../lib/report-point-catalogue.mjs';
import {makeReportPointMaterial, setReportPointSelection} from '../lib/report-point-adapter.mjs';
import {cioSourceId, cioPoints, cioMetadata, makeCioMaterial, chooseCioPoints, cioGoalFor} from '../lib/cio-law-adapter.mjs';
import {wwkeSourceId, wwkePoints, wwkeMetadata, wwkeFilters} from '../lib/wwke-law-data.mjs';
import {selectWwkePointsDirect} from '../lib/wwke-law-adapter.mjs';
import {cioRecordsFor, cioIssuesFor, cioStatus, cioReviewBasis, cioCatalogue} from '../lib/cio-law-data.mjs';
import {wwkePointContext, wwkeContext, wwkeStatus, wwkeReviewBasis, wwkeFilterMap} from '../lib/wwke-law-data.mjs';
import {topicalPackage, makeTopicalMaterial, topicalTrace, topicalSpanLocation} from '../lib/topical-content.mjs';
import {preparedFoundationItems} from '../lib/foundation-workspace.mjs';
import {documentsForFoundation, foundationPassages} from '../lib/foundation-reader.mjs';
import {isAdmittedFoundation, flatNormSelectable} from '../lib/admitted-foundation.mjs';
import {readEntry, readRestrictedPoint, flatReadMaterial, modelReadMaterial, themesForPoint} from './read-materials.mjs';
import {initialModelLibrary, restoreModelLibrary, scopedExportSelection, exportDraftForSelection} from '../lib/model-library.mjs';
import {foundations, selectedModelMaterials, addMaterials, investigationFramework, validateExportSettings} from '../lib/investigation.mjs';
import {newProject} from '../lib/new-project.mjs';
import {validateDraft} from '../lib/framework-model.mjs';
import {addQuestion, setQuestionDesign, linkLine} from '../lib/research-plan.mjs';
import {serializeProject, parseProjectText} from '../lib/project-codec.mjs';
import {readProject} from '../lib/project-session.mjs';
import {exportAuditXlsx} from '../lib/excel-export.mjs';
import {exportPresets} from '../lib/export-presets.mjs';

export {configureCatalogueReader};
export async function initialize() { await ensureCatalogue(['catalogue', 'models']); }
export function options() {
  return {workforms: exportPresets.map(p => ({id: p.id, title: p.title})),
    sectors: wwkeFilters.vocabularies.sectors,
    interviewLevels: [{id: 'operational', title: 'Operationeel'}, {id: 'management', title: 'Tactisch / Management'}, {id: 'strategic', title: 'Strategisch'}]};
}

function modelSelection(model, pointId, level, subject = '') {
  const copy = structuredClone(model);
  copy.selected = true;
  copy.researchSubject = subject;
  for (const item of copy.items) {
    item.included = item.questions?.some(q => q.id === pointId) ?? false;
    for (const indicator of item.indicators ?? []) indicator.included = true;
    for (const q of item.questions ?? []) {
      q.included = q.id === pointId;
      q.selectedLevels = q.included ? [level] : [];
    }
  }
  return copy;
}
// Used only when preparing a release, never on search or server startup.
export async function* indexEntries() {
  await initialize();
  for (const c of corpus) {
    const sourceId = c.framework.report.id;
    await ensureCatalogue(['report:' + sourceId]);
    const admitted = new Set(reportSummaries[sourceId]?.admittedIds ?? []);
    for (const p of catalogue.points.filter(p => p.report_id === sourceId && admitted.has(p.legacy_line_id)))
      yield readEntry('report', c.framework.report, p.id, makeReportPointMaterial(catalogue, p.id, 'generic'),
        {themes: themesForPoint(themes, p)});
  }
  // Follow the same active catalogue as the application, including future
  // admitted flat frameworks. Archived/unadmitted sources never enter here.
  for (const source of foundations) {
    await ensureCatalogue(['foundation:' + source.id, 'source:' + source.id]);
    const topical = topicalPackage(source.id);
    if (source.id === cioSourceId) {
      for (const p of cioPoints) yield readEntry('law', cioMetadata, p.id,
        p.selection_status === 'SELECTABLE' ? makeCioMaterial(p) : readRestrictedPoint(cioMetadata, p,
          {records: cioRecordsFor(p), issues: cioIssuesFor(p), criterion: cioCatalogue.criteria.find(c => c.id === p.criterion_id),
            objectives: cioCatalogue.objectives.filter(o => p.objective_ids.includes(o.id)), goals: p.objective_ids.map(cioGoalFor).filter(Boolean)},
          {trace: {status: cioStatus, reviewBasis: cioReviewBasis}}),
        {selectionStatus: p.selection_status, selectionReason: p.selection_reason});
    } else if (source.id === wwkeSourceId) {
      for (const p of wwkePoints) {
        let material;
        if (p.selection_status === 'SELECTABLE') {
          const draft = selectWwkePointsDirect(newProject(baseFramework).draft, [p.id]);
          const {id: _id, ...selected} = draft.investigation.materials[0];
          material = selected;
        } else material = readRestrictedPoint(wwkeMetadata, p, wwkePointContext(p), {linkSpans: true,
          trace: {sourceContext: wwkeContext, sourceStatus: wwkeStatus, reviewBasis: wwkeReviewBasis, filterMapping: wwkeFilterMap.get(p.id)}});
        yield readEntry('law', wwkeMetadata, p.id, material, {selectionStatus: p.selection_status, selectionReason: p.selection_reason});
      }
    } else if (topical) {
      for (const p of topical.catalogue.points) yield readEntry('framework', source, p.id,
        p.selection_status === 'SELECTABLE' ? makeTopicalMaterial(topical, p) : readRestrictedPoint(source, p, topicalTrace(topical, p),
          {spanLocation: span => topicalSpanLocation(topical.manifest.documents, span)}),
        {selectionStatus: p.selection_status, selectionReason: p.selection_reason, draftSelectable: false});
    } else {
      for (const p of preparedFoundationItems.filter(p => p.sourceId === source.id)) {
        const status = p.auditRole !== 'norm' && isAdmittedFoundation(source) ? 'CONTEXT_ONLY' :
          isAdmittedFoundation(source) ? (flatNormSelectable(p) ? 'SELECTABLE' : 'HOLD') : p.selection_status || 'SELECTABLE';
        const reference = {...p, foundationId: source.id};
        yield readEntry(source.kind === 'law' ? 'law' : source.kind === 'model' ? 'model' : 'framework', source, p.id,
          flatReadMaterial(source, p, documentsForFoundation(reference), foundationPassages),
          {selectionStatus: status, selectionReason: p.selection_reason, draftSelectable: false});
      }
    }
  }
  for (const model of initialModelLibrary().models)
    for (const item of model.items)
      for (const q of item.questions ?? [])
        for (const level of ['operational', 'management', 'strategic']) {
          const [material] = selectedModelMaterials(modelSelection(model, q.id, level));
          if (material) yield readEntry('model', model, q.id, modelReadMaterial(model, item, q, material), {level});
        }
}

async function hydrate(entries) {
  await initialize();
  await ensureCatalogue([...new Set(entries.filter(e => e.kind !== 'model')
    .map(e => (e.kind === 'report' ? 'report:' : 'foundation:') + e.sourceId))]);
}

export async function prepareProject(spec, entries) {
  await hydrate(entries);
  const project = newProject(baseFramework);
  let draft = {...project.draft, title: spec.title,
    investigation: {...project.draft.investigation, purpose: spec.intake.purpose, scope: spec.intake.scope}};
  const lineByKey = new Map();
  for (const entry of entries) {
    const before = new Set(draft.included);
    if (entry.kind === 'report') draft = setReportPointSelection(draft, catalogue, [entry.pointId], true, 'generic');
    else if (entry.sourceId === cioSourceId) draft = chooseCioPoints(draft, [entry.pointId], true);
    else if (entry.sourceId === wwkeSourceId) draft = selectWwkePointsDirect(draft, [entry.pointId], spec.sector || '');
    else if (entry.kind === 'model') {
      const model = project.modelLibrary.models.find(m => m.id === entry.sourceId);
      if (!model) throw Error('Onbekend actief model.');
      const selected = modelSelection(model, entry.pointId, entry.level, spec.intake.object);
      draft = addMaterials(draft, selectedModelMaterials(selected));
      model.selected = true;
      model.researchSubject = spec.intake.object;
      const dimension = model.items.find(i => i.questions?.some(q => q.id === entry.pointId));
      dimension.included = true;
      for (const indicator of dimension.indicators ?? []) indicator.included = true;
      const q = dimension.questions.find(q => q.id === entry.pointId);
      q.included = true;
      q.selectedLevels = [...new Set([...(q.selectedLevels ?? []), entry.level])];
    } else throw Error('Deze bron is niet beschikbaar voor een nieuw onderzoek.');
    const added = draft.included.filter(id => !before.has(id));
    if (added.length !== 1) throw Error('Selectie niet toegestaan of dubbel: ' + entry.key);
    lineByKey.set(entry.key, added[0]);
    const selection = spec.selections.find(s => s.key === entry.key);
    draft.notes[added[0]] = 'AI-concept — te beoordelen\nSelectiereden: ' + selection.reason;
  }
  const questionIds = new Map();
  for (const question of spec.questions) {
    if (questionIds.has(question.key)) throw Error('Dubbele vraagsleutel: ' + question.key);
    const parentId = question.parent ? questionIds.get(question.parent) : null;
    if (question.parent && !parentId) throw Error('Zet de centrale vraag vóór de deelvragen.');
    const added = addQuestion(draft, parentId, question.text, 'suggested');
    draft = added.draft;
    questionIds.set(question.key, added.question.id);
    if (!parentId) draft = setQuestionDesign(draft, added.question.id, {direction: spec.direction, topic: spec.intake.object});
    for (const key of question.selections) {
      if (!lineByKey.has(key)) throw Error('Vraag verwijst naar een niet gekozen bouwsteen: ' + key);
      draft = linkLine(draft, lineByKey.get(key), added.question.id);
    }
  }
  const linked = new Set(draft.research.links.map(l => l.line_id));
  if (draft.included.some(id => !linked.has(id))) throw Error('Koppel elke gekozen bouwsteen aan minstens één onderzoeksvraag; er wordt niets stilzwijgend weggelaten.');
  // Agent-authored questions are project-local variants, never source edits.
  for (const question of spec.interviewQuestions) {
    const id = lineByKey.get(question.selection);
    if (!id) throw Error('Interviewvraag verwijst naar een niet gekozen bouwsteen.');
    const material = draft.investigation.materials.find(m => m.id === id);
    if (material.kind === 'model-question') throw Error('Behoud de beoordeelde modelvraag; kies een passend niveau of pas deze later in de viewer aan.');
    material[{operational: 'questionOperational', management: 'questionManagement', strategic: 'questionStrategic'}[question.level]] = question.text;
  }
  const settings = spec.export;
  draft.exportSettings = validateExportSettings({...settings, basis: 'norms', questions: true, focus: spec.intake.object,
    interview: {...settings.interview, overrides: {}},
    fields: exportPresets.find(p => p.id === settings.profile).fields, scopeFromInvestigation: false});
  project.draft = validateDraft(draft, baseFramework);
  project.view = {...project.view, page: 'framework', researchRoute: 'question'};
  const reopened = readProject(parseProjectText(serializeProject(project)), newProject(baseFramework), {
    restoreDraft: d => validateDraft(d, baseFramework), restoreModels: restoreModelLibrary, themes: workspaces,
  }).project;
  if (JSON.stringify(reopened.draft) !== JSON.stringify(project.draft)) throw Error('Het concept kon niet zonder wijzigingen worden heropend.');
  return {project, lines: Object.fromEntries(lineByKey), questions: Object.fromEntries(questionIds)};
}

export async function exportProject(project, entries) {
  await hydrate(entries);
  const draft = validateDraft(project.draft, baseFramework);
  const framework = investigationFramework(baseFramework, draft);
  const selection = scopedExportSelection(framework, draft);
  if (selection.included.length !== draft.included.length) throw Error('De export zou gekozen bouwstenen weglaten.');
  const settings = draft.exportSettings;
  const options = {...settings, ...settings.meta, researchInterview: settings.profile === 'interview' ? settings.interview : undefined,
    exportedAt: new Date().toISOString()};
  return exportAuditXlsx(framework, exportDraftForSelection(draft, selection.included), options);
}
export {serializeProject, parseProjectText};
