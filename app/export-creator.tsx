"use client";
import {countLabel} from '@/lib/display-count.mjs';
import LegacyCioNotice from "./legacy-cio-notice";
import { useState, useEffect } from "react";
import type { ExportGuideStatus } from './workflow-help';
import { FileSpreadsheet, Check, ClipboardCheck, ShieldCheck, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { exportAuditXlsx } from "@/lib/excel-export.mjs";
import { excelMime, exportFields, workbookStyles, requiredExportFields, columnName } from "@/lib/excel-model.mjs";
import { creatorWorkbookModel } from "@/lib/creator-model.mjs";
import type {WorkbookPreviewStyle} from '@/lib/workbook-preview-types';
import { exportPresets } from "@/lib/export-profiles.mjs";
import {
  scopedExportSelection,
  selectedModelOptions,
  exportDraftForSelection,
} from "@/lib/model-library.mjs";
import type { LibraryModel } from "./model-library";
import InterviewSettings, { type InterviewSettingsValue } from "./interview-settings";
import { modelDisplayName, selectedQuestionCount } from "@/lib/interview-structure.mjs";
import { normId } from "@/lib/norm-navigation.mjs";
import type { Framework, Draft } from "@/lib/framework-types";
import { testingAspects, testingTerminologies, testingAspectLabel, testingTerminologyHelp } from "@/lib/testing-aspects.mjs";
import { planningReview } from "@/lib/planning-review.mjs";
import { exportFonts, exportFontSizes, exportPalettes, exportFilename, exportPhasePalette } from '@/lib/export-design.mjs';
import { suggestedExportProfile, researchSubjectDefault, exportScopeDefault, exportTitle } from '@/lib/workflow-defaults.mjs';
import { workbookPreviewEntries, workbookPreviewValue } from '@/lib/workbook-preview.mjs';
import { WorkflowIntro, WorkflowOutcome } from './workflow-patterns';
import ScrollablePreview from './scrollable-preview';

export default function ExportCreator({
  framework,
  draft,
  disabled,
  onMarkdown,
  models,
  onSettingsChange,
  onGuidanceChange,
}: {
  framework: Framework;
  draft: Draft;
  disabled: boolean;
  onMarkdown: (exportDraft: Draft, options: Record<string, unknown>) => void;
  models: LibraryModel[];
  onSettingsChange?: (settings: Record<string, unknown>) => void;
  onGuidanceChange?: (status: ExportGuideStatus) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [localConfig, setConfig] = useState<Record<string, unknown>>({});
  const config = draft.exportSettings ?? localConfig;
  function updateSettings(next: Record<string, unknown>) {
    if (next.meta && !config.meta && next.scopeFromInvestigation === undefined)
      next = { ...next, scopeFromInvestigation: true };
    setConfig(next);
    onSettingsChange?.(next);
  }
  function setting<T>(key: string, fallback: T): [T, (value: T | ((old: T) => T)) => void] {
    return [
      (config[key] as T) ?? fallback,
      (value) => {
        const next = {
          ...config,
          [key]:
            typeof value === "function"
              ? (value as (old: T) => T)((config[key] as T) ?? fallback)
              : value,
        };
        updateSettings(next);
      },
    ];
  }
  const selection = scopedExportSelection(framework, draft);
  const selectedLines = framework.lines.filter(l => selection.included.includes(l.id));
  const [profile] = setting("profile", suggestedExportProfile(selectedLines)),
    [basis, setBasis] = setting("basis", "norms");
  const [testScope, setTestScope] = setting<string[]>("testingAspects", []);
  const [testingTerminology, setTestingTerminology] = setting("testingTerminology", "obw");
  const [storedMeta, setMeta] = setting("meta", {
    version: "0.1",
    author: "",
    team: "",
    scope: exportScopeDefault(draft),
    change: "Eerste opzet",
  });
  const meta = { ...storedMeta, scope: config.scopeFromInvestigation === true || !config.meta
    ? exportScopeDefault(draft) : storedMeta.scope };
  const [focus, setFocus] = setting("focus", researchSubjectDefault(draft).slice(0,160));
  const [interview, setInterview] = setting<InterviewSettingsValue>("interview", {
    levels: [],
    starr: false,
    triangulation: false,
    overrides: {},
  });
  const [excludedNorms, setExcludedNorms] = setting<string[]>("excludedNorms", []);
  const [fields, setFields] = setting<string[]>("fields", (exportPresets.find(p => p.id === profile) ?? exportPresets[0]).fields);
  const questions = true;
  const [notes, setNotes] = setting("notes", false);
  const [accent, setAccent] = setting("accent", "blue"),
    [colorMode, setColorMode] = setting("colorMode", "sections");
  const [fontFamily,setFontFamily]=setting('fontFamily','Arial');
  const [fontSize,setFontSize]=setting('fontSize',11);
  const preset = exportPresets.find((p) => p.id === profile) ?? exportPresets[0];
  const selectedModels = models.filter((m) => m.selected);
  const selectedModel = selectedModels.find((m) => m.id === basis);
  const modelBasis = basis !== "norms";
  const modelTitle = selectedModel ? modelDisplayName(selectedModel) : "Model niet geselecteerd";
  const themes = selection.themes;
  const exportedNormIds = selection.included.filter((id: string) => !excludedNorms.includes(id));
  const exportDraft = {...exportDraftForSelection(draft, exportedNormIds), title: exportTitle(draft)};
  const [filename, setFilename] = setting('filename', modelBasis ? modelTitle : exportDraft.title);
  const downloadName = exportFilename(filename, profile, meta.version);
  const pickedLines = framework.lines.filter((l) => exportedNormIds.includes(l.id));
  const hasCriteria = pickedLines.some(l => l.materialKind !== "model-question");
  const requiredFields=requiredExportFields(pickedLines,{requiredField:preset.required,notes,
    researchInterview:profile==="interview" ? interview : undefined});
  for(const id of ['source','location',...(profile==='testing'?['category','controlObjective','control','criterion']:[])])requiredFields[id]='Vast onderdeel van het nieuwe referentiekader';
  let modelOptions = {},
    selectionError = "";
  if (modelBasis) {
    try {
      modelOptions = selectedModelOptions(selectedModel, interview);
    } catch (e) {
      selectionError = e instanceof Error ? e.message : "Controleer je modelselectie.";
    }
  }
  const choices = {
    ...meta,
    profile,
    basis: "norms",
    fields,
    questions,
    notes,
    accent,
    colorMode,
    filename,
    fontFamily, fontSize,
    focus,
    themeIds: selection.themeIds,
    excludedNorms: [...new Set([...selection.excludedNorms, ...excludedNorms])],
    ...modelOptions,
    researchInterview: !modelBasis && profile === "interview" ? interview : undefined,
    testingAspects: !modelBasis && profile === "testing" && hasCriteria ? testScope : undefined,
    testingTerminology,
  };
  let preview: ReturnType<typeof creatorWorkbookModel> | null = null,
    validation = "";
  try {
    if (selectionError) throw new Error(selectionError);
    preview = creatorWorkbookModel(framework, exportDraft, choices);
  } catch (e) {
    validation = e instanceof Error ? e.message : "Controleer de exportinstellingen.";
  }
  const count = preview?.selection.norms ?? exportedNormIds.length;
  const hasResearchQuestions = Boolean(draft.research?.questions.length);
  const emptyFramework = !modelBasis && count === 0 && !hasResearchQuestions;
  const missingInput = [
    validation === 'Kies het niveau van de geïnterviewde.' || validation === 'Kies het niveau van de geïnterviewde' ? {id:'interview-level-operational',label:'Kies het gespreksniveau'} : null,
    profile === 'testing' && hasCriteria && !modelBasis && !testScope.length ? {id:'testing-aspect-opzet',label:'Kies wat je wilt toetsen'} : null,
    !meta.version.trim() ? {id:'creator-version',label:'Vul het versienummer in'} : null].filter(Boolean) as {id:string;label:string}[];
  const [previewSheet, setPreviewSheet] = useState("");
  // Reuse the export's own validation; do not create a second set of rules.
  const guideStatus = JSON.stringify({missing: missingInput[0] || null, validation});
  useEffect(() => { onGuidanceChange?.(JSON.parse(guideStatus)); }, [guideStatus, onGuidanceChange]);
  const [previewEntryKey, setPreviewEntryKey] = useState("");
  const [detailPointIndex, setDetailPointIndex] = useState(0);
  const register = preview?.sheets.find((s: {name: string}) => s.name === previewSheet)
    ?? (!modelBasis && count === 0 && hasResearchQuestions ? preview?.sheets.find((s: {name:string}) => s.name === '02 Onderzoeksvragen') : undefined)
    ?? preview?.sheets.find((s: {entries?: unknown; registerKind?: string}) => s.entries && s.registerKind !== "testing")
    ?? preview?.sheets.at(-1);
  const previewEntries = workbookPreviewEntries(register);
  const previewIndex = Math.max(0, previewEntries.findIndex((entry: {key:string}) => entry.key === previewEntryKey));
  const previewEntry = previewEntries[previewIndex];
  const detailPreview = register?.viewer && register?.detailRecords;
  const detailPoint = Math.min(detailPointIndex, Math.max(0, (register?.detailRecords?.length ?? 1) - 1));
  const templateLayout = true;
  const design: WorkbookPreviewStyle[] = preview?.previewStyles || workbookStyles({ accent, colorMode, fontFamily, fontSize });
  const previewHeaderRow = register?.headerRow || 5;
  const previewHidden = (i:number) => register?.hiddenColumns?.includes(i) || register?.previewHiddenColumns?.includes(i);
  const previewGroups: {index:number; span:number; label:string}[] = [];
  if (register?.columnIds && !register.templateStyles) for (let i=0; i<register.rows[3].length;) {
    if(register.hiddenColumns?.includes(i)){i++;continue;}
    const merge = register.merges.find((range:string)=>range.startsWith(columnName(i)+'4:'));
    const end = merge?.split(':')[1].replace(/\d/g,'');
    // Excel column names contain only ASCII A–Z, not arbitrary display text.
    const span = end ? end.split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-i : 1;
    const label = register.rows[3][i];
    previewGroups.push({index:i,span,label:typeof label === 'string' ? label : ''});
    i += span;
  }
  const planningIssues = planningReview(framework, draft, exportedNormIds);
  function chooseProfile(id: string) {
    const p = exportPresets.find((v) => v.id === id)!;
    updateSettings({ ...config, profile: id, fields: [...p.fields] });
    setSaved(false);
    setError("");
  }
  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = exportAuditXlsx(framework, exportDraft, {
        ...choices,
        exportedAt: new Date().toISOString(),
      });
      const url = URL.createObjectURL(new Blob([new Uint8Array(data).buffer], { type: excelMime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel-export is niet gelukt.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="export-creator" aria-labelledby="workflow-page-title">
      {!modelBasis && <LegacyCioNotice draft={exportDraft} />}
      <WorkflowIntro title="Hoe wil je je kader gebruiken?">
        Kies de werkvorm die past bij je onderzoek. Je kunt deze keuze later wijzigen.
      </WorkflowIntro>
      <fieldset className="creator-presets" aria-label="Werkvorm">
        <legend className="sr-only">Werkvorm</legend>
        {exportPresets.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            className="creator-preset workflow-choice"
            aria-pressed={profile === p.id}
            onClick={() => chooseProfile(p.id)}
          >
            <span className="workflow-choice-top">
              <span className="discovery-icon">
                {p.id === 'testing' ? <ClipboardCheck size={25} aria-hidden="true" /> : p.id === 'risk' ? <ShieldCheck size={25} aria-hidden="true" /> : <MessagesSquare size={25} aria-hidden="true" />}
              </span>
              {profile === p.id && <Check className="workflow-choice-selected" size={18} aria-hidden="true" />}
            </span>
            <span className="preset-heading">{p.title}</span>
            <span>{p.description}</span>
          </Button>
        ))}
      </fieldset>
      <WorkflowOutcome title="Eén onderzoeksopzet, drie werkvormen">
        Alleen de indeling van je Excelbestand verandert. Je vragen, bouwstenen en koppelingen in Omnibus blijven behouden.
      </WorkflowOutcome>
      {profile === "testing" && !modelBasis && !hasCriteria && pickedLines.length > 0 && <p className="creator-hint">Je selectie bevat alleen modelvragen. Kies Interviewleidraad voor gesprekken; opzet, bestaan en werking gelden voor normen.</p>}
      <div className="creator-layout">
        <div className="creator-settings">
          <section className="creator-card">
            <h2>Inhoud</h2>
            <p className="creator-help">
              Exporteer de bouwstenen die aan je onderzoeksvragen zijn gekoppeld.
            </p>
      {profile === "testing" && !modelBasis && hasCriteria && (
        <fieldset className="creator-testing-aspects" aria-describedby="testing-aspects-help">
          <legend>Wat wil je toetsen?</legend>
          <div>
            {testingAspects.map((a) => (
              <label key={a.id} data-selected={testScope.includes(a.id)} htmlFor={"testing-aspect-" + a.id}>
                <Checkbox
                  id={"testing-aspect-" + a.id}
                  checked={testScope.includes(a.id)}
                  onCheckedChange={(checked) => {
                    setTestScope(
                      checked ? [...testScope, a.id] : testScope.filter((id) => id !== a.id),
                    );
                    setSaved(false);
                    setError("");
                  }}
                />
                <span>
                  <strong>{testingAspectLabel(a.id, testingTerminology)}</strong>
                  <small>{a.id === 'werking' ? 'Werkt de maatregel in de gekozen periode?' : a.description}</small>
                </span>
              </label>
            ))}
          </div>
          <p id="testing-aspects-help">
            Kies één of meer onderdelen voor Toetsuitvoering. Bij een maatregel die nog niet in gebruik is,
            kun je alleen {testingAspectLabel("opzet", testingTerminology)} onderzoeken.
          </p>
          <details className="creator-terminology-options">
            <summary>Toetslabels aanpassen</summary>
            <label className="creator-testing-terminology" htmlFor="creator-testing-terminology">Toetsterminologie in Excel
              <select id="creator-testing-terminology" value={testingTerminology} aria-describedby="testing-terminology-help"
                onChange={e => { setTestingTerminology(e.target.value); setSaved(false); setError(""); }}>
                {testingTerminologies.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <p id="testing-terminology-help">{testingTerminologyHelp}</p>
            <p>{testingAspectLabel("bestaan", testingTerminology)} veronderstelt een ingerichte maatregel;
              {" "}{testingAspectLabel("werking", testingTerminology)} bovendien een afgebakende periode. Je Excelbestand bevat één rij per bouwsteen.</p>
          </details>
        </fieldset>
      )}
            {(selectedModels.length > 0 || modelBasis) && (
              <details className="legacy-model-export">
                <summary>Losse modelleidraad (buiten deze onderzoeksopzet)</summary>
                <fieldset className="creator-basis" aria-label="Basis voor de leidraad">
                  {[
                    ["norms", "Gekoppelde bouwstenen"],
                    ...selectedModels.map((m) => [m.id, modelDisplayName(m)]),
                  ].map(([id, label]) => (
                    <Button
                      key={id}
                      variant="outline"
                      aria-pressed={basis === id}
                      onClick={() => {
                        setBasis(id);
                        setError("");
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </fieldset>
              </details>
            )}
            <label htmlFor="creator-focus">
              <span>Onderzoeksobject <span className="field-requirement">optioneel</span></span>
              <Input
                id="creator-focus"
                value={focus}
                placeholder="Organisatie, proces of onderwerp"
                maxLength={160}
                onChange={(e) => setFocus(e.target.value)}
              />
            </label>
            {modelBasis ? (
              <div className="creator-selection-summary">
                <h3>{modelTitle}</h3>
                <p>
                  {selectedModel?.id} · {selectedModel?.items.filter((i) => i.included).length ?? 0}{" "}
                  variabelen gekozen in Modellen
                  {selectedModel?.kind === "kaptein" && (
                    <> · {selectedQuestionCount(selectedModel)} vraagtemplates</>
                  )}
                </p>
                {selectedModel && (
                  <InterviewSettings
                    model={selectedModel}
                    value={interview}
                    onChange={setInterview}
                  />
                )}
                <a href="#modellen">Model en onderdelen wijzigen</a>
                {profile !== "interview" && (
                  <p>
                    Dit model gebruikt een interviewleidraad. Kies die werkvorm of kies expliciet de
                    gekoppelde bouwstenen.
                  </p>
                )}
              </div>
            ) : (
              <>
                <label htmlFor="creator-scope">
                  Onderwerp en afbakening
                  <Textarea
                    id="creator-scope"
                    value={meta.scope}
                    placeholder={exportDraft.title}
                    maxLength={2000}
                    onChange={(e) => updateSettings({ ...config, meta: { ...meta, scope: e.target.value }, scopeFromInvestigation: false })}
                  />
                </label>
                {profile === "interview" && (
                  <InterviewSettings
                    model={{
                      id: "investigation",
                      title: "Onderzoek",
                      version: "1",
                      source: "",
                      question: "",
                      kind: "own",
                      selected: true,
                      items: [],
                    }}
                    fixedSelection={exportedNormIds.length > 0 && exportedNormIds.every(id =>
                      draft.investigation?.materials.some(m => m.id === id && m.interviewLevel))}
                    value={interview}
                    onChange={setInterview}
                  />
                )}
                <div className="creator-selection-summary">
                  <h3>{emptyFramework ? 'Nog geen onderzoeksopzet' : 'Gekozen inhoud'}</h3>
                  {emptyFramework ? <p>{draft.included.length ? 'Je bouwstenen zijn gekozen. Maak onderzoeksvragen en koppel de bouwstenen die je wilt meenemen.' : 'Maak onderzoeksvragen en voeg de bouwstenen toe die je wilt onderzoeken.'}</p> : <>
                  <p>
                    {countLabel(draft.included.length,'bouwstenen')} gekozen · {selection.included.length} gekoppeld · {exportedNormIds.length} in deze export
                  </p>
                  <div className="creator-sheet-list">
                    {themes.map((t: { id: string; title: string; lineIds: string[] }) => (
                      <span key={t.id}>
                        {t.title} (
                        {exportedNormIds.filter((id: string) => t.lineIds.includes(id)).length})
                      </span>
                    ))}
                  </div>
                  </>}
                  <a href="#mijn-kader">{emptyFramework ? 'Naar stap 3: Bouw je kader' : 'Onderzoeksvragen en koppelingen wijzigen'}</a>
                  {!!selection.excludedNorms.length && (
                    <p className="creator-help">
                      {selection.excludedNorms.length} niet-gekoppelde bouwstenen gaan niet mee.
                    </p>
                  )}
                  {!emptyFramework && !selection.included.length && (
                    <p>
                      Maak onderzoeksvragen of koppel bouwstenen om je onderzoeksopzet te
                      exporteren.
                    </p>
                  )}
                </div>
                {selectedLines.length > 0 && <details className="creator-review">
                  <summary>Exportselectie aanpassen ({count})</summary>
                  {selectedLines.map((l) => (
                    <label className="creator-check" key={l.id}>
                      <Checkbox
                        checked={!excludedNorms.includes(l.id)}
                        onCheckedChange={(v) =>
                          setExcludedNorms((old) =>
                            v ? old.filter((id) => id !== l.id) : [...old, l.id],
                          )
                        }
                      />
                      <span>
                        <small>{normId(l.id)}</small>
                        {l.title}
                      </span>
                    </label>
                  ))}
                  <p className="creator-help">
                    Uitsluiten geldt alleen voor deze export. Je auditkader blijft behouden.
                  </p>
                </details>}
                {!!planningIssues.length && (
                  <details className="creator-review">
                    <summary>Nog uit te werken ({planningIssues.length})</summary>
                    <ul>
                      {planningIssues.map((p: { id: string; title: string; missing: string[] }) => (
                        <li key={p.id}>
                          <strong>{p.title}</strong>
                          <span className="creator-review-status">{p.missing.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                    <a href="#mijn-kader">Aanvullen in je kader</a>
                  </details>
                )}
              </>
            )}
          </section>
          <section className="creator-card">
            <h2>Vormgeving</h2>
            {templateLayout && <p className="creator-help">De indeling volgt het referentiesjabloon. Kies hieronder de kleuren en het lettertype. {profile === 'testing' ? 'Uitvoering toont de norm en het volledige toetspunt, met instructie en verwacht bewijs naast elkaar. De detailviewer staat achteraan.' : profile === 'risk' ? 'De matrix blijft compact. Lees de volledige norm, risico’s, beheersing en toetsaanpak in de detailviewer.' : 'De leidraad blijft compact. Lees de volledige vragen, doorvragen en gespreksnotities in de detailviewer.'}</p>}
            <fieldset className="creator-basis" aria-label="Kleurgebruik">
              <Button
                variant="outline"
                aria-pressed={colorMode === "uniform"}
                onClick={() => setColorMode("uniform")}
              >
                Eén kleurenpalet
              </Button>
              <Button
                variant="outline"
                aria-pressed={colorMode === "sections"}
                onClick={() => setColorMode("sections")}
              >
                Kleuren per werkfase
              </Button>
            </fieldset>
            {colorMode === 'sections' && <figure className="export-palette-preview" aria-label="Bijpassende kleuren voor de werkfasen">{exportPhasePalette(accent).map((color, i)=><span key={i} style={{backgroundColor:'#'+color.dark}} />)}</figure>}
            <fieldset className="creator-colors" aria-label="Auditkleuren">
              <legend>Hoofdkleur · alle werkbladen</legend>
              {Object.entries(exportPalettes).filter(([id])=>id.startsWith('audit-')).map(([id, palette]) => (
                <Button
                  key={id}
                  variant="outline"
                  title={'#' + palette.dark}
                  aria-pressed={accent === id}
                  onClick={() => setAccent(id)}
                >
                  <span style={{ backgroundColor: '#' + palette.dark }} />
                  {palette.label}
                </Button>
              ))}
            </fieldset>
            <details><summary>Overige paletten{!accent.startsWith('audit-') ? ' · '+(Object.entries(exportPalettes).find(([id])=>id===accent)?.[1].label || '') : ''}</summary>
              <fieldset className="creator-colors" aria-label="Overige accentkleuren">
                {Object.entries(exportPalettes).filter(([id])=>!id.startsWith('audit-')).map(([id,palette])=>(
                  <Button key={id} variant="outline" aria-pressed={accent===id} onClick={()=>setAccent(id)} title={'#'+palette.dark}><span style={{backgroundColor:'#'+palette.dark}}/>{palette.label}</Button>
                ))}
              </fieldset>
            </details>
            <div className="creator-two creator-typography">
              <label htmlFor="export-font">Lettertype<select id="export-font" value={fontFamily} onChange={e=>setFontFamily(e.target.value)}>{exportFonts.map(f=><option key={f}>{f}</option>)}</select></label>
              <label htmlFor="export-font-size">Tekstgrootte<select id="export-font-size" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}>{exportFontSizes.map(s=><option key={s} value={s}>{s} pt{s===11?' · standaard':''}</option>)}</select></label>
            </div>
            {!modelBasis && !templateLayout && (
              <details>
                <summary>Kolommen en werkbladen aanpassen</summary>
                {profile === "testing" && hasCriteria && testScope.length > 0 && <p className="creator-help">Toetsaanpak, bewijs en oordelen staan op Toetsuitvoering.</p>}
                <div className="creator-field-grid">
                  {exportFields
                    .filter(f=>profile!=='interview' || !pickedLines.length || !pickedLines.every(l=>l.materialKind==='model-question') || !['auditQuestion','procedure'].includes(f.id))
                    .filter((f) => f.id !== "testingAspects")
                    .filter((f) => profile !== "testing" || !hasCriteria || !testScope.length ||
                      !["procedure", ...(pickedLines.some(l => l.materialKind === "model-question") ? [] : ["documentation"]), "observation", "evidenceLocation", "verdict", "tester", "testedOn", "status"].includes(f.id))
                    .map((f) => (
                      <label className="creator-check" key={f.id}>
                        <Checkbox
                          checked={fields.includes(f.id) || Boolean(requiredFields[f.id])}
                          disabled={Boolean(requiredFields[f.id])}
                          onCheckedChange={(v) =>
                            setFields((old) =>
                              v ? [...old, f.id] : old.filter((id) => id !== f.id),
                            )
                          }
                        />
                        <span>{f.label}{requiredFields[f.id] && <small>{requiredFields[f.id]}</small>}</span>
                      </label>
                    ))}
                </div>
                <label className="creator-check" htmlFor="creator-questions">
                  <Checkbox
                    id="creator-questions"
                    checked={true}
                    disabled
                  />
                  Onderzoeksvragen met beide viewers (vast onderdeel)
                </label>
                <label className="creator-check" htmlFor="creator-notes">
                  <Checkbox
                    id="creator-notes"
                    checked={notes}
                    onCheckedChange={(v) => setNotes(Boolean(v))}
                  />
                  Bestaande auditnotities opnemen
                </label>
              </details>
            )}
          </section>
          <section className="creator-card">
            <h2>Versie en team</h2>
            <label htmlFor="creator-filename">Bestandsnaam
              <Input id="creator-filename" value={filename} maxLength={100} onChange={e=>setFilename(e.target.value)} aria-describedby="export-filename-preview" />
            </label>
            <p id="export-filename-preview" className="creator-help export-filename-preview">{downloadName}</p>
            <div className="creator-two">
              <label htmlFor="creator-version">
                Versie
                <Input
                  id="creator-version"
                  value={meta.version}
                  maxLength={100}
                  onChange={(e) => setMeta((v) => ({ ...v, version: e.target.value }))}
                />
              </label>
              <label htmlFor="creator-author">
                Naam
                <Input
                  id="creator-author"
                  value={meta.author}
                  maxLength={100}
                  onChange={(e) => setMeta((v) => ({ ...v, author: e.target.value }))}
                />
              </label>
            </div>
            <details>
              <summary>Teamleden en wijziging invullen</summary>
              <div className="creator-two">
                {Array.from({ length: 5 }, (_, i) => (
                  <label key={i} htmlFor={"creator-member-" + i}>
                    Teamlid {i + 1}
                    <Input
                      id={"creator-member-" + i}
                      maxLength={100}
                      value={meta.team.split("\n")[i] ?? ""}
                      onChange={(e) =>
                        setMeta((v) => {
                          const names = Array.from(
                            { length: 5 },
                            (_, j) => v.team.split("\n")[j] ?? "",
                          );
                          names[i] = e.target.value;
                          return { ...v, team: names.join("\n") };
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label htmlFor="creator-change">
                Wat is gewijzigd?
                <Input
                  id="creator-change"
                  value={meta.change}
                  maxLength={1000}
                  onChange={(e) => setMeta((v) => ({ ...v, change: e.target.value }))}
                />
              </label>
            </details>
          </section>
        </div>
        <aside id="guide-export-preview" tabIndex={-1} className="creator-preview creator-card" aria-label="Exportvoorbeeld">
          <div className="creator-preview-heading">
            <FileSpreadsheet size={22} />
            <h2>Je export</h2>
            <span>
              {count}{" "}
              {modelBasis
                ? count === 1
                  ? "interviewvraag"
                  : "interviewvragen"
                : count === 1
                  ? "bouwsteen"
                  : "bouwstenen"}
            </span>
          </div>
          {!emptyFramework && !!preview?.sheets.length && <ol className="creator-sheet-list creator-preview-tabs" aria-label="Werkblad bekijken">
            {preview?.sheets.map((s: { name: string }) => (
              <li key={s.name}><Button variant="ghost" aria-pressed={register?.name === s.name}
                onClick={() => {setPreviewSheet(s.name);setPreviewEntryKey("");}}>{s.name}</Button></li>
            ))}
          </ol>}
          {!emptyFramework && <h3>{modelBasis ? modelTitle : exportDraft.title}</h3>}
          {emptyFramework ? <div className="creator-empty-state">
            <h3>Hier verschijnt je werkdocument</h3>
            <p>Werk eerst je onderzoeksvragen uit. Daarna kun je hier de inhoud bekijken en je Excelbestand downloaden.</p>
            <a href="#mijn-kader">Naar stap 3: Bouw je kader →</a>
          </div> : <p className="creator-help">
            Controleer de inhoud per onderdeel. Schuif voor de overige kolommen. Excel-formules worden hier niet berekend.
          </p>}
          {!emptyFramework && register?.viewer && register.detailRecords && <div className="export-preview-navigation">
            <label htmlFor="export-detail-point">Onderdeel bekijken
              <select id="export-detail-point" value={detailPoint} onChange={e=>setDetailPointIndex(Number(e.target.value))} disabled={!register.detailRecords.length}>
                {register.detailRecords.map((entry: {pointId:string}, i:number)=><option key={entry.pointId} value={i}>{workbookPreviewValue(register.rows[i+1][6])}</option>)}
              </select>
            </label>
            <article aria-live="polite" aria-label="Detail van je export" style={{whiteSpace:'pre-wrap',fontFamily,fontSize:fontSize+'pt',lineHeight:1.6,maxHeight:'28rem',overflowY:'auto',padding:'1rem',border:'1px solid var(--border)',borderRadius:8}}>
              {register.viewer.labels.map((label:string, i:number)=><section key={label} style={{marginBottom:'1rem'}}>
                <h4 style={{fontWeight:600,marginBottom:'0.75rem',borderBottom:'1px solid var(--border)',paddingBottom:'0.5rem'}}>{label}</h4>
                {register.detailRecords?.[detailPoint]?.contents[i] || 'Geen informatie beschikbaar.'}
              </section>)}
            </article>
          </div>}
          {!emptyFramework && !detailPreview && !!previewEntries.length && <div className="export-preview-navigation">
            <label htmlFor="export-preview-entry">{register?.entries ? 'Bouwsteen bekijken' : 'Rij bekijken'}
              <select id="export-preview-entry" value={previewEntry.key} onChange={e=>setPreviewEntryKey(e.target.value)}>
                {previewEntries.map((entry: {key:string;label:string}, i:number)=><option key={entry.key} value={entry.key}>{i+1}. {entry.label}</option>)}
              </select>
            </label>
            <div><Button variant="outline" disabled={previewIndex===0} onClick={()=>setPreviewEntryKey(previewEntries[previewIndex-1].key)}>Vorige</Button>
              <span aria-live="polite">{previewIndex+1} van {previewEntries.length}</span>
              <Button variant="outline" disabled={previewIndex===previewEntries.length-1} onClick={()=>setPreviewEntryKey(previewEntries[previewIndex+1].key)}>Volgende</Button></div>
          </div>}
          {!emptyFramework && register && !detailPreview && (
            <>
            {register.registerKind === 'testing' && register.entries?.[previewIndex]?.parent && <section aria-label="Norm bij dit toetspunt" style={{padding:'1rem',marginBottom:'0.75rem',whiteSpace:'pre-wrap',background:'#'+design[51].fill,border:'1px solid #'+(design[51].border || '9AAFC0'),borderRadius:6}}><strong>Norm</strong><p>{register.entries[previewIndex].parent}</p></section>}
            <ScrollablePreview className={`creator-table-scroll${register.name === '02 Onderzoeksvragen' ? ' is-question-preview' : ''}`}>
              <table style={{fontFamily,fontSize:fontSize+'pt'}}>
                <thead>
                  {!!previewGroups.length && <tr>
                    {previewGroups.map(({index,span,label}) => {
                      const style = design[register.cellStyles[4]?.[index] ?? register.rowStyles[4] ?? 1];
                      return <th key={index} colSpan={span} scope="colgroup" style={{background:'#'+style.fill,color:'#'+style.color}}>{label}</th>;
                    })}
                  </tr>}
                  <tr>
                    {register.rows[previewHeaderRow-1].map((label, i) => previewHidden(i) ? null : (
                      <th
                        key={i}
                        style={{
                          background:
                            "#" + design[register.cellStyles[previewHeaderRow]?.[i] ?? register.rowStyles[previewHeaderRow]].fill,
                          color:
                            "#" +
                            design[register.cellStyles[previewHeaderRow]?.[i] ?? register.rowStyles[previewHeaderRow]].color,
                        }}
                      >
                        {typeof label === 'string' ? label : workbookPreviewValue(label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(previewEntry?.rows ?? [[]]).map((row:unknown[], rowIndex:number)=><tr key={rowIndex}>
                    {row.map((v: unknown, i: number) => {
                      if(previewHidden(i))return null;
                      const sourceRow=(previewEntry?.row||previewHeaderRow+1)+rowIndex;
                      const style=design[register.cellStyles[sourceRow]?.[i] ?? register.rowStyles[sourceRow] ?? 1];
                      return <td key={i} style={{background:'#'+style.fill,color:'#'+style.color,border:style.border?'1px solid #'+style.border:undefined}}>{workbookPreviewValue(v)}</td>;
                    })}
                  </tr>)}
                </tbody>
              </table>
            </ScrollablePreview>
            </>
          )}
          {validation && !missingInput.some(item=>/^(interview-level|testing-aspect)-/.test(item.id)) && <output id="guide-export-check" tabIndex={-1} className="creator-help">{validation}</output>}
          {error && <p role="alert">{error}</p>}
          {!!missingInput.length && <output id="export-missing-input" className="export-input-guidance" data-status-block=""><strong>Nog nodig voor je Excelbestand</strong>{missingInput.map(item=><Button key={item.id} variant="link" onClick={()=>{const input=document.getElementById(item.id);const target=input?.getAttribute('aria-hidden')==='true' ? input.parentElement?.querySelector<HTMLElement>('[role="checkbox"]') : input;target?.scrollIntoView({block:'center',behavior:'smooth'});target?.focus({preventScroll:true});}}>{item.label} →</Button>)}</output>}
          <Button
            className="creator-download"
            aria-describedby={missingInput.length ? 'export-missing-input' : undefined}
            disabled={
              disabled ||
              busy ||
              !!validation ||
              !meta.version.trim() ||
              (count === 0 &&
                !(
                  draft.investigation &&
                  questions &&
                  draft.research?.questions.length &&
                  !modelBasis
                ))
            }
            onClick={() => void save()}
          >
            <FileSpreadsheet size={18} />
            {busy ? "Excel maken…" : count === 0 && !modelBasis ? "Download lege Excelopzet (.xlsx)" : "Download Excel (.xlsx)"}
          </Button>
          {saved && <output>Vorige download aangemaakt. Download opnieuw na wijzigingen.</output>}
          <p className="creator-help">
            Zonder macro’s. Keuzelijsten, opzoeken en filters werken met gewone Excel-functies.
            Wijzigingen in Excel blijven in het werkboek en worden niet teruggelezen.
          </p>
          {!modelBasis && (
            <Button
              variant="ghost"
              disabled={disabled || busy || !!validation || !exportedNormIds.length}
              onClick={() => {try {onMarkdown(exportDraft, choices);}catch(e){setError(e instanceof Error ? e.message : 'Tekstexport is niet gelukt.');}}}
            >
              {profile === 'interview' ? 'Deze interviewselectie' : profile === 'risk' ? 'Deze risicoselectie' : 'Deze normselectie'} als tekst (.md)
            </Button>
          )}
          <details className="creator-method">
            <summary>Over de werkvormen en bronnen</summary>
            <p>
              Deze indelingen zijn eigen werkvormen, geen officiële IIA-sjablonen. Een werkvorm
              bepaalt niet welke normen voor je organisatie gelden.
            </p>
            <p>
              Het IIA onderscheidt standaarden, thematische vereisten en praktische richtlijnen.
              Controleer toepasselijkheid, publicatieversie en gebruiksrechten voordat u een model
              overneemt.
            </p>
            <a
              href="https://www.theiia.org/en/standards/2024-standards/global-guidance/"
              target="_blank"
              rel="noreferrer"
            >
              IIA Global Guidance
            </a>
            <br />
            <a
              href="https://www.theiia.org/en/standards/2024-standards/topical-requirements/"
              target="_blank"
              rel="noreferrer"
            >
              IIA Topical Requirements
            </a>
          </details>
        </aside>
      </div>
    </section>
  );
}
