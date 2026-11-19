"use client";
import { materialInterviewLevels } from "@/lib/investigation.mjs";
import {countLabel} from '@/lib/display-count.mjs';
import LegacyCioNotice from "./legacy-cio-notice";
import { useState, useEffect, useMemo } from "react";
import type { ExportGuideStatus } from './workflow-help';
import { FileSpreadsheet, FileText, Check, ClipboardCheck, ShieldCheck, MessagesSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { ToolSelect } from "./catalogue-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {workbookFileSnapshot} from '@/lib/workbook-file-snapshot.mjs';
import {downloadFile,useFileDownload} from './file-download';
import { excelMime, workbookStyles, columnName } from "@/lib/excel-model.mjs";
import { exportInputs } from './export-state';
import {useExportPreview} from './use-export-preview';
import type {WorkbookPreviewStyle} from '@/lib/workbook-preview-types';
import { exportPresets } from "@/lib/export-profiles.mjs";
import type { LibraryModel } from "./model-library";
import InterviewSettings from "./interview-settings";
import { modelDisplayName, selectedQuestionCount } from "@/lib/interview-structure.mjs";
import type { Framework, Draft } from "@/lib/framework-types";
import { testingAspects, testingTerminologies, testingAspectLabel, testingTerminologyHelp } from "@/lib/testing-aspects.mjs";
import { exportFonts, exportFontSizes, exportPalettes, exportPhasePalette } from '@/lib/export-design.mjs';
import { workbookPreviewEntries, workbookPreviewValue } from '@/lib/workbook-preview.mjs';
import { WorkflowIntro } from './workflow-patterns';
import ScrollablePreview from './scrollable-preview';

export default function ExportCreator({
  framework,
  draft,
  disabled,
  onMarkdown,
  models,
  onSettingsChange,
  onGuidanceChange,
  active=true,
}: {
  framework: Framework;
  draft: Draft;
  disabled: boolean;
  onMarkdown: (exportDraft: Draft, options: Record<string, unknown>) => void;
  models: LibraryModel[];
  onSettingsChange?: (settings: Record<string, unknown>) => void;
  onGuidanceChange?: (status: ExportGuideStatus) => void;
  active?:boolean;
}) {
  const {busy,error:fileError} = useFileDownload();
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [localConfig, setConfig] = useState<Record<string, unknown>>({});
  const config = draft.exportSettings ?? localConfig;
  function updateSettings(next: Record<string, unknown>) {
    if (next.meta && !config.meta && next.scopeFromInvestigation === undefined)
      next = { ...next, scopeFromInvestigation: true };
    setConfig(next);
    onSettingsChange?.(next);
  }
  function setting<T>(key: string, current: T): (value: T | ((old: T) => T)) => void {
    return (value) => {
        const next = {
          ...config,
          [key]:
            typeof value === "function"
              ? (value as (old: T) => T)(current)
              : value,
        };
        updateSettings(next);
      };
  }
  const {
    withoutQuestions, autoLinkOn, unlinkedCount, selection, profile, basis, testScope, testingTerminology, keyControl, accountability, kaderUitleg, storedMeta, meta, focus, interview,
    excludedNorms, accent, colorMode, fontFamily, fontSize, selectedModels, selectedModel,
    modelBasis, modelTitle, exportedNormIds, exportDraft, filename, downloadName, pickedLines, hasCriteria,
    choices, selectionError, planningIssues,
  } = useMemo(() => exportInputs(framework, draft, config, models), [framework, draft, config, models]);
  const request=useMemo(()=>({framework,draft,config,models}),[framework,draft,config,models]);
  const calculation=useExportPreview(request,active&&!disabled);
  const {preview,ready}=calculation;
  const validation=selectionError||calculation.validation;
  const questions = choices.questions;
  const setBasis = setting('basis', basis), setTestScope = setting('testingAspects', testScope);
  const setTestingTerminology = setting('testingTerminology', testingTerminology);
  const setKeyControl = setting('keyControl', keyControl), setAutoLink = setting('autoLink', autoLinkOn);
  const setAccountability = setting('accountability', accountability);
  const setKaderUitleg = setting('kaderUitleg', kaderUitleg);
  const setMeta = setting('meta', storedMeta), setFocus = setting('focus', focus);
  const setInterview = setting('interview', interview), setExcludedNorms = setting('excludedNorms', excludedNorms);
  const setAccent = setting('accent', accent), setColorMode = setting('colorMode', colorMode);
  const setFontFamily = setting('fontFamily', fontFamily), setFontSize = setting('fontSize', fontSize);
  const setFilename = setting('filename', filename);
  const count = preview?.selection.norms ?? exportedNormIds.length;
  const hasResearchQuestions = Boolean(draft.research?.questions.length);
  // Hoeveel van de opgenomen toetspunten hebben een interviewvraag per gespreksniveau? Zo kies je bewust (panel ronde 8).
  const interviewLevelCounts = useMemo(() => {
    const opgenomen = new Set(exportedNormIds), perLevel: Record<string, number> = {};
    let total = 0;
    for (const m of draft.investigation?.materials ?? []) {
      const levels = opgenomen.has(m.id) ? (materialInterviewLevels(m) as string[] | null) : null;
      if (!levels) continue;
      total++;
      for (const level of levels) perLevel[level] = (perLevel[level] ?? 0) + 1;
    }
    return { total, perLevel };
  }, [draft.investigation?.materials, exportedNormIds]);
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
  const previewEntries = useMemo(() => workbookPreviewEntries(register), [register]);
  const previewIndex = Math.max(0, previewEntries.findIndex((entry: {key:string}) => entry.key === previewEntryKey));
  const previewEntry = previewEntries[previewIndex];
  const detailPreview = register?.viewer && register?.detailRecords;
  const detailPoint = Math.min(detailPointIndex, Math.max(0, (register?.detailRecords?.length ?? 1) - 1));
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
  function chooseProfile(id: string) {
    const p = exportPresets.find((v) => v.id === id)!;
    updateSettings({ ...config, profile: id, fields: [...p.fields] });
    setSaved(false);
    setError("");
  }
  async function save() {
    if(busy||!ready)return;
    setError("");
    setSaved(false);
    try {
      if(!preview||validation)throw Error(validation||'Controleer de exportinstellingen.');
      const model=workbookFileSnapshot(preview);
      setSaved(await downloadFile({kind:'xlsx',model},downloadName,excelMime));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel-export is niet gelukt.");
    }
  }
  return (
    <section className="export-creator" aria-labelledby="workflow-page-title">
      {!modelBasis && <LegacyCioNotice draft={exportDraft} />}
      <WorkflowIntro title="Hoe wil je je kader gebruiken?">
        Alleen de indeling van je Excelbestand verandert; je kunt later wisselen.
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
      {profile === "testing" && !modelBasis && !hasCriteria && pickedLines.length > 0 && <p className="creator-hint">Je selectie bevat alleen modelvragen. Kies Interviewleidraad voor gesprekken; opzet, bestaan en werking gelden voor normen.</p>}
      <div className="creator-layout">
        <div className="creator-settings">
          <section className="creator-card creator-context" aria-labelledby="creator-context-title">
            <h2 id="creator-context-title">Onderzoek <small>staat in je Excelbestand</small></h2>
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
            {!modelBasis && <>
                <label htmlFor="creator-scope">
                  Onderwerp en afbakening
                  <Textarea
                    id="creator-scope"
                    value={meta.scope}
                    placeholder={`Standaard: ${exportDraft.title}`}
                    maxLength={2000}
                    onChange={(e) => updateSettings({ ...config, meta: { ...meta, scope: e.target.value }, scopeFromInvestigation: false })}
                  />
                </label>
            </>}
          </section>
          <section className="creator-card">
            <h2>Inhoud</h2>
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
          <p id="testing-aspects-help">Kies één of meer.</p>
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
                    levelCounts={interviewLevelCounts}
                  />
                )}
                <div className="creator-selection-summary">
                  {emptyFramework && <h3>Nog geen onderzoeksopzet</h3>}
                  {emptyFramework ? <p>{draft.included.length ? 'Voor deze werkvorm heb je onderzoeksvragen nodig. De risico-controlmatrix kan zonder.' : 'Kies eerst bouwstenen in stap 2.'}</p> : <>
                  <p>{countLabel(exportedNormIds.length,'bouwstenen')} in deze export{withoutQuestions ? ' · zonder onderzoeksvragen' : ''} · <a href="#mijn-kader">wijzigen</a></p>
                  </>}
                  {emptyFramework && (draft.included.length ? <a href="#mijn-kader">Naar stap 3: Bouw je kader</a> : <a href="#grondslagen">Naar stap 2: Verzamel</a>)}
                  {!emptyFramework && !withoutQuestions && unlinkedCount > 0 && <label className="creator-check creator-autolink" htmlFor="export-autolink">
                    <Checkbox id="export-autolink" checked={autoLinkOn} onCheckedChange={(v) => { setAutoLink(v === true); setSaved(false); setError(""); }}/>
                    <span><strong>Koppel bouwstenen zonder onderzoeksvraag automatisch</strong>
                      <small>{autoLinkOn
                        ? `${countLabel(unlinkedCount,'bouwstenen')} ${unlinkedCount===1?'krijgt':'krijgen'} een plek bij een verwante deelvraag of onder je centrale vraag.`
                        : `${countLabel(unlinkedCount,'bouwstenen')} zonder vraag ${unlinkedCount===1?'gaat':'gaan'} niet mee.`}</small></span>
                  </label>}
                  {!emptyFramework && !selection.included.length && (
                    <p>
                      Maak onderzoeksvragen of koppel bouwstenen om je onderzoeksopzet te
                      exporteren.
                    </p>
                  )}
                </div>
                {/* Kiezen wat meegaat gebeurt in stap 3. Een eerder gemaakte uitsluiting blijft zichtbaar en is hier terug te draaien. */}
                {excludedNorms.length > 0 && <p className="creator-excluded">
                  {excludedNorms.length} {excludedNorms.length === 1 ? "bouwsteen is" : "bouwstenen zijn"} eerder uitgesloten van deze export.{" "}
                  <button type="button" onClick={() => setExcludedNorms([])}>Alles weer meenemen</button>
                </p>}
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
          {!modelBasis && hasCriteria && <section className="creator-card creator-options">
            <h2>Excel-opties</h2>
        <fieldset className="creator-extras" aria-label="Excel-opties">
          <label htmlFor="export-accountability">
            <Checkbox id="export-accountability" checked={accountability} onCheckedChange={(v) => { setAccountability(v === true); setSaved(false); setError(""); }}/>
            <span><strong>Blad Verantwoording referentiekader</strong>
              <small>Voor wie volgens de Global Internal Audit Standards werkt (13.4 en 13.6).</small></span>
          </label>
          <label htmlFor="export-kader-uitleg">
            <Checkbox id="export-kader-uitleg" checked={kaderUitleg} onCheckedChange={(v) => { setKaderUitleg(v === true); setSaved(false); setError(""); }}/>
            <span><strong>Uitleg per kader</strong>
              <small>Voor wie elk kader geldt, wat niet is uitgewerkt en wat je zelf vaststelt, op het blad Versiebeheer.</small></span>
          </label>
          {profile === "testing" && <div className="creator-terminology" role="radiogroup" aria-label="Toetslabels in Excel" title={testingTerminologyHelp}>
            <span>Toetslabels</span>
            {testingTerminologies.map(option => <label key={option.id} className="creator-radio">
              <input type="radio" name="export-terminology" value={option.id} checked={testingTerminology === option.id}
                onChange={() => { setTestingTerminology(option.id); setSaved(false); setError(""); }}/>
              <span>{option.id === 'obw' ? 'Nederlands' : 'Engels'} <small>{option.id === 'obw' ? 'Opzet · Bestaan · Werking' : 'Design · Implementation · Operating'}</small></span>
            </label>)}
          </div>}
          {profile === "risk" && (
            <label htmlFor="risk-key-control">
              <Checkbox id="risk-key-control" checked={keyControl} onCheckedChange={(v) => { setKeyControl(v === true); setSaved(false); setError(""); }}/>
              <span><strong>Kolom Key control (ja/nee)</strong>
                <small>Lege kolom om zelf in te vullen.</small></span>
            </label>
          )}
        </fieldset>
          </section>}
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
              <summary>Teamleden</summary>
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
          <details className="creator-card creator-fold">
            <summary><h2>Vormgeving</h2><span>{fontFamily} · {fontSize} pt · kleuren aanpassen</span></summary>
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
          </details>
        </div>
        <aside id="guide-export-preview" tabIndex={-1} className="creator-preview creator-card" aria-label="Exportvoorbeeld" aria-busy={!ready}>
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
            <p>{draft.included.length ? 'Maak onderzoeksvragen in stap 3, of kies de risico-controlmatrix: die kan zonder vragen.' : 'Kies eerst bouwstenen in stap 2.'}</p>
            {draft.included.length ? <a href="#mijn-kader">Naar stap 3: Bouw je kader →</a> : <a href="#grondslagen">Naar stap 2: Verzamel →</a>}
          </div> : <p className="creator-help">
            Voorbeeld
          </p>}
          {!emptyFramework && register?.viewer && register.detailRecords && <div className="export-detail-preview">
            {register.detailRecords.length>0&&<div className="export-preview-navigation">
              <Button variant="outline" size="icon" aria-label="Vorige" title="Vorige" disabled={detailPoint===0} onClick={()=>setDetailPointIndex(detailPoint-1)}><ChevronLeft size={16} aria-hidden="true"/></Button>
              <ToolSelect label="" name="Onderdeel:" value={String(detailPoint)} onChange={value=>setDetailPointIndex(Number(value))} options={register.detailRecords.map((entry: {pointId:string}, i:number)=>({value:String(i),label:`${i+1}. ${String(workbookPreviewValue(register.rows[i+1]?.[6])||entry.pointId)}`}))}/>
              <span aria-live="polite">{detailPoint+1} van {register.detailRecords.length}</span>
              <Button variant="outline" size="icon" aria-label="Volgende" title="Volgende" disabled={detailPoint>=register.detailRecords.length-1} onClick={()=>setDetailPointIndex(detailPoint+1)}><ChevronRight size={16} aria-hidden="true"/></Button>
            </div>}
            <article aria-live="polite" aria-label="Detail van je export" style={{whiteSpace:'pre-wrap',fontFamily,fontSize:fontSize+'pt',lineHeight:1.6,maxHeight:'28rem',overflowY:'auto',padding:'1rem',border:'1px solid var(--border)',borderRadius:8}}>
              {register.viewer.labels.map((label:string, i:number)=><section key={label} style={{marginBottom:'1rem'}}>
                <h4 style={{fontWeight:600,marginBottom:'0.75rem',borderBottom:'1px solid var(--border)',paddingBottom:'0.5rem'}}>{label}</h4>
                {register.detailRecords?.[detailPoint]?.contents[i] || 'Geen informatie beschikbaar.'}
              </section>)}
            </article>
          </div>}
          {!emptyFramework && !detailPreview && !!previewEntries.length && <div className="export-preview-navigation">
            <Button variant="outline" size="icon" aria-label="Vorige" title="Vorige" disabled={previewIndex===0} onClick={()=>setPreviewEntryKey(previewEntries[previewIndex-1].key)}><ChevronLeft size={16} aria-hidden="true"/></Button>
            <ToolSelect label="" name={register?.entries ? 'Bouwsteen:' : 'Rij:'} value={previewEntry.key} onChange={setPreviewEntryKey} options={previewEntries.map((entry: {key:string;label:string}, i:number)=>({value:entry.key,label:`${i+1}. ${entry.label}`}))}/>
            <span aria-live="polite">{previewIndex+1} van {previewEntries.length}</span>
            <Button variant="outline" size="icon" aria-label="Volgende" title="Volgende" disabled={previewIndex===previewEntries.length-1} onClick={()=>setPreviewEntryKey(previewEntries[previewIndex+1].key)}><ChevronRight size={16} aria-hidden="true"/></Button>
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
          {(error || fileError) && <p role="alert">{error || fileError}</p>}
          {calculation.failed && <Button variant="outline" onClick={calculation.retry}>Opnieuw proberen</Button>}
          {!!missingInput.length && <output id="export-missing-input" className="export-input-guidance" data-status-block=""><strong>Nog nodig voor je Excelbestand</strong>{missingInput.map(item=><Button key={item.id} variant="link" onClick={()=>{const input=document.getElementById(item.id);const target=input?.getAttribute('aria-hidden')==='true' ? input.parentElement?.querySelector<HTMLElement>('[role="checkbox"]') : input;target?.scrollIntoView({block:'center',behavior:'smooth'});target?.focus({preventScroll:true});}}>{item.label} →</Button>)}</output>}
          <Button
            className="creator-download"
            aria-describedby={missingInput.length ? 'export-missing-input' : undefined}
            disabled={
              disabled ||
              busy || !ready ||
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
            {busy ? "Bestand maken…" : count === 0 && !modelBasis ? "Download lege Excelopzet (.xlsx)" : "Download Excel (.xlsx)"}
          </Button>
          {!modelBasis && (
            <Button
              variant="outline"
              className="creator-markdown"
              disabled={disabled || busy || !ready || !!validation || !exportedNormIds.length}
              onClick={() => {try {onMarkdown(exportDraft, choices);}catch(e){setError(e instanceof Error ? e.message : 'Tekstexport is niet gelukt.');}}}
            >
              <FileText size={16} aria-hidden="true"/>Download als tekst (.md)
            </Button>
          )}
          {saved && <output className="creator-saved">Vorige download aangemaakt. Download opnieuw na wijzigingen.</output>}
          <details className="creator-method">
            <summary>Over de werkvormen en bronnen</summary>
            <p>Zonder macro’s. Keuzelijsten, opzoeken en filters werken met gewone Excel-functies. Wijzigingen in Excel blijven in het werkboek en worden niet teruggelezen.</p>
            <p>De indeling volgt het referentiesjabloon. Kies hieronder de kleuren en het lettertype. {profile === 'testing' ? 'Uitvoering toont de norm en het volledige toetspunt, met instructie en verwacht bewijs naast elkaar. De detailviewer staat achteraan.' : profile === 'risk' ? 'De matrix blijft compact. Lees de volledige norm, risico’s, beheersing en toetsaanpak in de detailviewer.' : 'De leidraad blijft compact. Lees de volledige vragen, doorvragen en gespreksnotities in de detailviewer.'}</p>
            <p>
              Deze indelingen zijn eigen werkvormen, geen officiële IIA-sjablonen. Een werkvorm
              bepaalt niet welke normen voor je organisatie gelden.
            </p>
            <p>
              Het IIA onderscheidt standaarden, thematische vereisten en praktische richtlijnen.
              Controleer toepasselijkheid, publicatieversie en gebruiksrechten voordat je een model
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
