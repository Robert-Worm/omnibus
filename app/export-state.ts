import {scopedExportSelection, selectedModelOptions, exportDraftForSelection} from '../lib/model-library.mjs';
import {creatorWorkbookModel} from '../lib/creator-model.mjs';
import {exportPresets} from '../lib/export-profiles.mjs';
import {requiredExportFields} from '../lib/excel-model.mjs';
import {modelDisplayName} from '../lib/interview-structure.mjs';
import {suggestedExportProfile, researchSubjectDefault, exportScopeDefault, exportTitle} from '../lib/workflow-defaults.mjs';
import {exportFilename} from '../lib/export-design.mjs';
import {planningReview} from '../lib/planning-review.mjs';
import type {Framework, Draft} from '../lib/framework-types';
import type {LibraryModel} from './model-library';
import type {InterviewSettingsValue} from './interview-settings';

/** Pure export inputs and preview. Toolbar and preview-navigation state are not inputs. */
export function exportState(framework: Framework, draft: Draft, config: Record<string, unknown>, models: LibraryModel[]) {
  const get = <T,>(key: string, fallback: T): T => (config[key] as T) ?? fallback;
  const selection = scopedExportSelection(framework, draft);
  const selectedLines = framework.lines.filter(l => selection.included.includes(l.id));
  const profile = get('profile', suggestedExportProfile(selectedLines)), basis = get('basis', 'norms');
  const testScope = get<string[]>('testingAspects', []), testingTerminology = get('testingTerminology', 'obw');
  const storedMeta = get('meta', {version:'0.1', author:'', team:'', scope:exportScopeDefault(draft), change:'Eerste opzet'});
  const meta = {...storedMeta, scope:config.scopeFromInvestigation === true || !config.meta ? exportScopeDefault(draft) : storedMeta.scope};
  const focus = get('focus', researchSubjectDefault(draft).slice(0,160));
  const interview = get<InterviewSettingsValue>('interview', {levels:[],starr:false,triangulation:false,overrides:{}});
  const excludedNorms = get<string[]>('excludedNorms', []);
  const preset = exportPresets.find(p => p.id === profile) ?? exportPresets[0];
  const fields = get<string[]>('fields', preset.fields), notes = get('notes', false);
  const accent = get('accent','blue'), colorMode = get('colorMode','sections');
  const fontFamily = get('fontFamily','Arial'), fontSize = get('fontSize',11);
  const selectedModels = models.filter(m => m.selected), selectedModel = selectedModels.find(m => m.id === basis);
  const modelBasis = basis !== 'norms', modelTitle = selectedModel ? modelDisplayName(selectedModel) : 'Model niet geselecteerd';
  const themes = selection.themes;
  const exportedNormIds = selection.included.filter((id: string) => !excludedNorms.includes(id));
  const exportDraft = {...exportDraftForSelection(draft, exportedNormIds), title:exportTitle(draft)};
  const filename = get('filename', modelBasis ? modelTitle : exportDraft.title);
  const downloadName = exportFilename(filename, profile, meta.version);
  const pickedLines = framework.lines.filter(l => exportedNormIds.includes(l.id));
  const hasCriteria = pickedLines.some(l => l.materialKind !== 'model-question');
  const requiredFields = requiredExportFields(pickedLines, {requiredField:preset.required, notes, researchInterview:profile === 'interview' ? interview : undefined});
  for (const id of ['source','location',...(profile === 'testing' ? ['category','controlObjective','control','criterion'] : [])])
    requiredFields[id] = 'Vast onderdeel van het nieuwe referentiekader';
  let modelOptions = {}, selectionError = '';
  if (modelBasis) {
    try { modelOptions = selectedModelOptions(selectedModel, interview); }
    catch (e) { selectionError = e instanceof Error ? e.message : 'Controleer je modelselectie.'; }
  }
  const choices = {...meta, profile, basis:'norms', fields, questions:true, notes, accent, colorMode, filename,
    fontFamily, fontSize, focus, themeIds:selection.themeIds,
    excludedNorms:[...new Set([...selection.excludedNorms,...excludedNorms])], ...modelOptions,
    researchInterview:!modelBasis && profile === 'interview' ? interview : undefined,
    testingAspects:!modelBasis && profile === 'testing' && hasCriteria ? testScope : undefined, testingTerminology};
  let preview: ReturnType<typeof creatorWorkbookModel> | null = null, validation = '';
  try {
    if (selectionError) throw new Error(selectionError);
    preview = creatorWorkbookModel(framework, exportDraft, choices);
  } catch (e) { validation = e instanceof Error ? e.message : 'Controleer de exportinstellingen.'; }
  const planningIssues = planningReview(framework, draft, exportedNormIds);
  return {selection, selectedLines, profile, basis, testScope, testingTerminology, storedMeta, meta, focus, interview,
    excludedNorms, fields, notes, accent, colorMode, fontFamily, fontSize, preset, selectedModels, selectedModel,
    modelBasis, modelTitle, themes, exportedNormIds, exportDraft, filename, downloadName, pickedLines, hasCriteria,
    requiredFields, choices, preview, validation, planningIssues};
}
