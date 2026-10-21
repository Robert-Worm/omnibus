"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ModelVariable from "./model-variable";
import DeferredViewerSection from './deferred-viewer-section';
import CevWorkbench from "./cev-workbench";
import ModelIntroduction from './model-introduction';
import ModelInformation from './model-information';
import ModelAbout from './model-about';
import CatalogueCardActions from './catalogue-card-actions';
import {modelCatalogueSelection} from '@/lib/catalogue-selection.mjs';
import OpenItemStrip,{OpenWorkspaceEmpty} from './open-item-strip';
import CatalogueGroups,{CatalogueFamily} from './catalogue-groups';
import DirectorySearch from './directory-search';
import {TermText} from './term-help';
import {CatalogueHeader,ModelChoice} from './catalogue-navigation';
import {modelChoiceSearchText} from '@/lib/content-adapters/model-choice-guide.mjs';
import { usesQuestionWorkbench } from "@/lib/content-adapters/research-models.mjs";
import { normalizeOpenModelIds, resolveOpenModel } from "@/lib/open-models.mjs";
import {
  filterModels,
  modelSubjects,
} from "@/lib/catalogue-filters.mjs";
import { chosenQuestionLevels, chooseModelQuestion, independentModelLevels } from "@/lib/model-context.mjs";
import { questionFormulations, cycleQuestionFormulation } from "@/lib/content-adapters/question-formulations.mjs";
import { RefreshCw, ArrowRight } from "lucide-react";
import {
  interviewLevels,
  modelDisplayName,
} from "@/lib/interview-structure.mjs";
import type {LibraryQuestion,LibraryItem,LibraryModel,ModelLibraryState} from '@/lib/model-library-types';
export type {LibraryIndicator,LibraryQuestion,LibraryItem,LibraryModel,ModelLibraryState} from '@/lib/model-library-types';
export default function ModelLibrary({
  value,
  onChange,
  ready,
  error,
  view,
  onViewChange,
  mode,
  openModelIds,
  onOpenModel,
  onCloseModel,
  onCatalogue,
  onWorkspace,
  onBuilder,
  overview,
  onOverviewChange:setOverview,
  suggestedSubject = "",
  directoryGroup = 'all',
  onDirectoryGroup,
  guided = false,
}: {
  value: ModelLibraryState;
  onChange: (v: ModelLibraryState) => void;
  ready: boolean;
  overview:'questions'|'about';
  onOverviewChange:(value:'questions'|'about')=>void;
  error: string;
  onAdoptModel: (id: string) => void;
  view:{activeModel:string;modelDimension:string;modelQuery:string};
  onViewChange:(patch:Partial<{activeModel:string;modelDimension:string;modelQuery:string}>)=>void;
  mode:'catalogue'|'workspace';
  openModelIds:string[];
  onOpenModel:(id:string)=>void;
  onCloseModel:(id:string)=>void;
  onCatalogue:()=>void;
  onWorkspace:()=>void;
  onBuilder:()=>void;
  suggestedSubject?: string;
  directoryGroup?:string;
  onDirectoryGroup?:(id:string)=>void;
  guided?:boolean;
}) {
  const query=view.modelQuery,active=view.activeModel;
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [localSubject, setLocalSubject] = useState("all");
  const subject=onDirectoryGroup?(directoryGroup||'all'):localSubject;
  const setSubject=(id:string)=>{setLocalSubject(id||'all');onDirectoryGroup?.(id);};
  const [processId, setProcessId] = useState("");
  const filtered = subject !== "all" || processId !== "" || selectedOnly;
  const showList=Boolean(directoryGroup||query.trim()||filtered);
  const setQuery=(modelQuery:string)=>onViewChange({modelQuery});
  const setActive=(id:string|null)=>onViewChange({activeModel:id??'',modelDimension:''});
  const models: LibraryModel[] = filterModels(
    value.models.filter((m) => m.id !== "L01" &&
      modelChoiceSearchText(m).includes(query.trim().toLowerCase()),
    ),
    { subject, processId, selectedOnly },
  );
  const openIds = normalizeOpenModelIds(openModelIds, value.models);
  const openModels = openIds.map((id:string) => value.models.find(m => m.id === id)!);
  const current: LibraryModel | undefined = mode === 'workspace' ? resolveOpenModel(openIds, active, value.models) : undefined;
  function openModel(id:string) {
    onOpenModel(id);
    setActive(id);
    onWorkspace();
  }
  function edit(id: string, patch: Partial<LibraryModel>) {
    onChange({ ...value, models: value.models.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function editItem(id: string, patch: Partial<LibraryItem>) {
    if (current) {
      const previous=current.items.find(i=>i.id===id);
      const selects=patch.included===true ||
        patch.questions?.some(q=>q.included&&!previous?.questions?.find(old=>old.id===q.id)?.included) ||
        patch.indicators?.some(d=>d.included&&!previous?.indicators?.find(old=>old.id===d.id)?.included);
      edit(current.id, { ...(selects?{selected:true}:{}), items: current.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
    }
  }
  function editQuestion(item: LibraryItem, id: string, patch: Partial<LibraryQuestion>) {
    editItem(item.id, {
      questions: item.questions?.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  }
  return (
    <section className={`export-creator models-workspace${mode==='catalogue'?' catalogue-explorer':''}`} data-mode={mode}>
      {error && <p role="alert">{error}</p>}
      {!guided&&mode==='catalogue'&&<><CatalogueHeader title="Verken modellen" description="Open een model om de begrippen, variabelen en bijbehorende interviewvragen te bekijken."/><ModelChoice onReset={()=>{setSubject('');setQuery('');setProcessId('');setSelectedOnly(false);}}/></>}
      {!guided&&mode==='workspace'&&<div className="model-open-navigation">
        {mode==='workspace'&&<OpenItemStrip id="models" items={openModels.map((model:LibraryModel)=>({id:model.id,title:modelDisplayName(model)}))} activeId={current?.id||null} onActivate={setActive} onClose={id=>{onCloseModel(id);if(id===current?.id)setActive(openIds.find(other=>other!==id)||null);}} onExplore={onCatalogue} exploreLabel="Model openen" disabled={!ready}/>}
      </div>}
      {mode==='workspace'&&<div className="law-view-actions model-view-actions"><nav className="law-overview-tabs" aria-label="Modelweergave"><button aria-pressed={overview==='questions'} onClick={()=>setOverview('questions')}>Vragen</button><button disabled={!current} aria-pressed={overview==='about'&&Boolean(current)} onClick={()=>setOverview('about')}>Over dit model</button></nav><Button onClick={onBuilder}>Naar stap 3: Bouw je kader <ArrowRight size={16}/></Button></div>}
      {mode==='workspace'&&current&&overview==='about'&&<ModelAbout model={current}/>}
      {mode==='catalogue' && <>
      {guided&&<DirectorySearch id="model-search" label="Zoek model of modelcategorie" value={query} onChange={setQuery} placeholder="Bijvoorbeeld: gedrag of verandering"/>}
      {!guided&&<DirectorySearch id="model-search" label="Zoek model" value={query} onChange={setQuery} placeholder="Zoek op model, auteur of vraagstuk…"/>}
      <CatalogueGroups hideTitle compact={guided} query={query} noun="modellen" value={directoryGroup} searching={Boolean(query.trim())}
        groups={modelSubjects.map(g=>({id:g.id,title:g.title,count:value.models.filter(m=>m.id!=='L01'&&g.modelIds.includes(m.id)).length}))}
        onChange={id=>{setSubject(id);setQuery('');setProcessId('');setSelectedOnly(false);}}/>
      {showList&&!guided&&filtered&&<p className="creator-help">
        Zoekfilters beperken de getoonde modellen; onderwerp en proces zijn zoekhulp, geen oordeel over geschiktheid.{' '}
        <Button variant="link" onClick={() => { setSubject("all"); setProcessId(""); setSelectedOnly(false); }}>
          Alle modellen tonen
        </Button>
      </p>}</>}
      <div className="model-library-layout cev-active-layout" hidden={mode==='workspace'&&Boolean(current)&&overview==='about'}>
        {mode==='catalogue'&&showList&&<CatalogueFamily noun="modellen" groupId={subject} title={modelSubjects.find(g=>g.id===subject)?.title||'Wetenschappelijke modellen'}><div className="model-catalogue">
          {models.map((m) => (
            <article key={m.id} className="model-catalogue-row" data-open={openIds.includes(m.id)}>
              <div className="directory-child-body">
                <span className="catalogue-card-id">Wetenschappelijk model</span>
                <h4>
                <Button variant="link" disabled={!ready} onClick={() => openModel(m.id)}>
                  {modelDisplayName(m)}{m.id === "L01" && " · oorspronkelijke indeling 2008"}
                </Button>
                </h4>
                <ModelIntroduction model={m} compact showDetails={false}>
                <div className="catalogue-card-stats"><span><strong>{modelCatalogueSelection(m).total}</strong> vragen</span><span><strong>{m.items.length}</strong> {m.items.length===1?'onderdeel':'onderdelen'}</span><span className="catalogue-card-selected"><strong>{modelCatalogueSelection(m).selected}</strong> gekozen in model</span></div>
                </ModelIntroduction>
              </div>
              <CatalogueCardActions layout="buttons" openId={'model-open-'+m.id} title={modelDisplayName(m)} opened={openIds.includes(m.id)} disabled={!ready} onOpen={()=>openModel(m.id)} onToggle={value=>value?onOpenModel(m.id):onCloseModel(m.id)}/>
            </article>
          ))}
          {!models.length && <p>{selectedOnly && !value.models.some((m) => m.selected)
            ? 'Nog geen model gekozen. Zet het filter uit om alle modellen te zien.'
            : filtered
              ? 'Geen model binnen deze filters. Zet de filters uit om alle modellen te zien.'
              : 'Geen modellen gevonden.'}</p>}
        </div></CatalogueFamily>}
        {mode==='workspace'&&!current&&<OpenWorkspaceEmpty prompt="Open een model om de inhoud te bekijken en vragen uit te werken."/>}
        {current && usesQuestionWorkbench(current) ? <CevWorkbench key={current.id} model={current} suggestedSubject={suggestedSubject} activeId={view.modelDimension} onActiveChange={modelDimension=>onViewChange({modelDimension})} disabled={!ready} onChange={patch => edit(current.id, patch)} onAbout={()=>setOverview('about')} onClose={onCatalogue}/> : current ? (
          <section className="creator-card model-question-browser">
            <div className="cev-heading law-browse-intro"><div className="law-viewer-heading"><h2>{modelDisplayName(current)}</h2><output>{current.items.length} {current.items.length===1?'onderdeel':'onderdelen'}</output></div><div className="cev-heading-actions"><ModelInformation model={current} onAbout={()=>setOverview('about')}/><Button variant="outline" onClick={onCatalogue}>Terug naar catalogus</Button></div></div>
            <p className="creator-help">
              Kies vragen per gespreksniveau. Je keuzes blijven bij het wisselen bewaard.
            </p>
            <div className="law-browse-filters model-question-filters" aria-label="Interviewvragen bekijken"><label htmlFor="model-interview-level">
              Gespreksniveau
              <select
                id="model-interview-level"
                aria-label="Voorbeeld interviewniveau"
                value={current.interviewLevel || "operational"}
                onChange={(e) => edit(current.id, {...independentModelLevels(current), interviewLevel:e.target.value})}
              >
                {interviewLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label></div>
            <details>
              <summary>Modelgegevens en centrale vraag</summary>
              <label htmlFor="model-official-name">
                Officiële modelnaam
                <Input
                  id="model-official-name"
                  value={current.officialName ?? current.title}
                  disabled={!ready || current.kind === "kaptein"}
                  maxLength={200}
                  onChange={(e) => edit(current.id, { officialName: e.target.value })}
                />
              </label>
              <label htmlFor="model-usage">
                Waarvoor gebruikt u dit model?
                <Textarea
                  id="model-usage"
                  value={current.usage ?? ""}
                  disabled={!ready}
                  maxLength={1000}
                  onChange={(e) => edit(current.id, { usage: e.target.value })}
                />
              </label>
              <label htmlFor="model-description">
                Theoretische achtergrond / toelichting
                <Textarea
                  id="model-description"
                  value={current.description ?? ""}
                  disabled={!ready}
                  maxLength={3000}
                  onChange={(e) => edit(current.id, { description: e.target.value })}
                />
              </label>
              <label htmlFor="library-title">
                Naam
                <Input
                  id="library-title"
                  disabled={!ready}
                  value={current.title}
                  maxLength={160}
                  onChange={(e) => edit(current.id, { title: e.target.value })}
                />
              </label>
              <label htmlFor="library-source">
                Bron
                <Input
                  id="library-source"
                  disabled={!ready || current.kind === "kaptein"}
                  value={current.source}
                  maxLength={600}
                  onChange={(e) => edit(current.id, { source: e.target.value })}
                />
              </label>
              <label htmlFor="library-version">
                Werkversie
                <Input
                  id="library-version"
                  disabled={!ready}
                  value={current.version}
                  maxLength={40}
                  onChange={(e) => edit(current.id, { version: e.target.value })}
                />
              </label>
              <label htmlFor="library-question">
                Centrale vraag
                <Textarea
                  id="library-question"
                  disabled={!ready}
                  value={current.question}
                  maxLength={600}
                  onChange={(e) => edit(current.id, { question: e.target.value })}
                />
              </label>
            </details>
            <div className="creator-basis">
              <Button
                variant="outline"
                disabled={!ready}
                onClick={() =>
                  edit(current.id, { selected:true, items: current.items.map((i) => ({ ...i, included: true })) })
                }
              >
                Alle variabelen kiezen
              </Button>
              <Button
                variant="ghost"
                disabled={!ready}
                onClick={() =>
                  edit(current.id, { items: current.items.map((i) => ({ ...i, included: false })) })
                }
              >
                {current.kind === "kaptein" ? "Dimensiekeuze wissen" : "Keuze wissen"}
              </Button>
            </div>
            {current.items.map((i,index) => <DeferredViewerSection key={current.id+':'+i.id} immediate={index<4} label={`Toon ${i.title||'variabele'}`}>
             {
              i.indicators ? (
                <ModelVariable
                  key={i.id}
                  item={i}
                  disabled={!ready}
                  level={current.interviewLevel || "operational"}
                  onChange={(patch) => editItem(i.id, patch)}
                />
              ) : (
                <details key={i.id}>
                  <summary>
                    {i.included ? "✓ " : ""}
                    {i.id} · {i.title || "Nieuw onderdeel"}
                    {i.questions && (
                      <> · {i.questions.filter((q) => q.included).length} {i.questions.filter((q) => q.included).length===1?'vraag':'vragen'} gekozen</>
                    )}
                  </summary>
                  <label className="creator-check" htmlFor={"library-include-" + i.id}>
                    <Checkbox
                      id={"library-include-" + i.id}
                      disabled={!ready}
                      checked={i.included}
                      onCheckedChange={(v) => editItem(i.id, { included: Boolean(v) })}
                    />
                    {i.questions ? "Dimensie gebruiken" : "Opnemen in de leidraad"}
                  </label>
                  {i.originalTitle && (
                    <p className="creator-help">Oorspronkelijke dimensie: {i.originalTitle}</p>
                  )}
                  {current.kind === "kaptein" && i.id === "SC003" && (
                    <p className="creator-help">
                      Hoger management: de leidinggevende niveaus boven de direct leidinggevende.
                      Spreek af welke niveaus u onderzoekt.
                    </p>
                  )}
                  {i.questions ? (
                    <div className="model-question-options">
                      <details>
                        <summary>Onderwerp aanpassen</summary>
                        <label htmlFor={"library-title-" + i.id}>
                          Onderwerp in uw leidraad
                          <Input
                            id={"library-title-" + i.id}
                            disabled={!ready}
                            value={i.title}
                            maxLength={160}
                            onChange={(e) => editItem(i.id, { title: e.target.value })}
                          />
                        </label>
                      </details>
                      {!i.included && (
                        <p className="creator-help">
                          Selecteer deze dimensie om vragen te kiezen. Uw eerdere keuzes blijven
                          bewaard.
                        </p>
                      )}
                      {i.included && !i.questions.some((q) => q.included) && (
                        <p className="creator-help">Kies minstens één vraag voor deze dimensie.</p>
                      )}
                      {i.questions.map((q) => (
                        <article className="model-question-option" key={q.id}>
                          <label className="creator-check" htmlFor={"library-prompt-" + q.id}>
                            <Checkbox
                              id={"library-prompt-" + q.id}
                              disabled={!ready || !i.included || (!chosenQuestionLevels(current,q).includes(current.interviewLevel || "operational") && !q.variants?.[current.interviewLevel || "operational"]?.trim())}
                              checked={chosenQuestionLevels(current,q).includes(current.interviewLevel || "operational")}
                              onCheckedChange={(v) =>
                                edit(current.id, chooseModelQuestion(current,i.id,q.id,Boolean(v),current.interviewLevel || "operational"))
                              }
                            />
                            <span>
                              <strong>{q.title}</strong>
                              <span className="model-question-text">
                                {q.variants?.[current.interviewLevel || "operational"] || "Vraag nog formuleren voor dit niveau"}
                              </span>
                            </span>
                          </label>
                          <Button variant="outline" disabled={!ready || questionFormulations(q,current.interviewLevel || "operational").length < 2}
                            aria-label={"Andere formulering voor " + q.title}
                            onClick={() => editQuestion(i,q.id,cycleQuestionFormulation(q,current.interviewLevel || "operational"))}>
                            <RefreshCw size={15} aria-hidden="true" /> Andere formulering
                          </Button>
                          <details>
                            <summary>Doorvragen en aanpassen</summary>
                            <small>{q.id}</small>
                            <label htmlFor={"library-question-" + q.id}>
                              Interviewvraag
                              <Textarea
                                id={"library-question-" + q.id}
                                disabled={!ready}
                                value={q.variants?.[current.interviewLevel || "operational"] ?? ""}
                                maxLength={1200}
                                onChange={(e) =>
                                  editQuestion(i, q.id, { variants:{...q.variants,[current.interviewLevel || "operational"]:e.target.value},
                                    formulationBase:{...q.formulationBase,[current.interviewLevel || "operational"]:e.target.value},
                                    ...((current.interviewLevel || "operational") === "operational" ? {question:e.target.value} : {}) })
                                }
                              />
                            </label>
                            <label htmlFor={"library-probes-" + q.id}>
                              Doorvragen
                              <Textarea
                                id={"library-probes-" + q.id}
                                disabled={!ready}
                                value={q.probes}
                                maxLength={1200}
                                onChange={(e) => editQuestion(i, q.id, { probes: e.target.value })}
                              />
                            </label>
                          </details>
                        </article>
                      ))}
                      <details>
                        <summary>Eigen vraag toevoegen</summary>
                        <p className="creator-help">
                          Een aanvullende vraag voor deze dimensie. Deze wordt niet automatisch
                          geselecteerd.
                        </p>
                        <Button
                          variant="outline"
                          disabled={!ready || i.questions.length >= 100}
                          onClick={() => {
                            let number = 1;
                            while (
                              i.questions?.some(
                                (q) => q.id === i.id + "-E" + String(number).padStart(2, "0"),
                              )
                            )
                              number++;
                            editItem(i.id, {
                              questions: [
                                ...(i.questions ?? []),
                                {
                                  id: i.id + "-E" + String(number).padStart(2, "0"),
                                  dimensionId: i.id,
                                  title: "Eigen vraag",
                                  question: "",
                                  probes: "",
                                  included: false,
                                },
                              ],
                            });
                          }}
                        >
                          Vraag toevoegen
                        </Button>
                      </details>
                    </div>
                  ) : (
                    <>
                      <label htmlFor={"library-title-" + i.id}>
                        Onderwerp
                        <Input
                          id={"library-title-" + i.id}
                          disabled={!ready}
                          value={i.title}
                          maxLength={160}
                          onChange={(e) => editItem(i.id, { title: e.target.value })}
                        />
                      </label>
                      <label htmlFor={"library-question-" + i.id}>
                        Interviewvraag
                        <Textarea
                          id={"library-question-" + i.id}
                          disabled={!ready}
                          value={i.question}
                          maxLength={1200}
                          onChange={(e) => editItem(i.id, { question: e.target.value })}
                        />
                      </label>
                      <label htmlFor={"library-probes-" + i.id}>
                        Doorvragen
                        <Textarea
                          id={"library-probes-" + i.id}
                          disabled={!ready}
                          value={i.probes}
                          maxLength={1200}
                          onChange={(e) => editItem(i.id, { probes: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </details>
              )}
              </DeferredViewerSection>,
            )}
            {current.kind === "own" && (
              <Button
                variant="outline"
                disabled={!ready || current.items.length >= 500}
                onClick={() =>
                  edit(current.id, {
                    items: [
                      ...current.items,
                      {
                        id: current.id + "-" + String(current.items.length + 1).padStart(3, "0"),
                        title: "",
                        question: "",
                        probes: "",
                        included: false,
                      },
                    ],
                  })
                }
              >
                Variabele toevoegen
              </Button>
            )}
          </section>
        ) : null}
      </div>
      {mode==='catalogue'&&<p className="directory-note"><TermText text="Modellen helpen je onderzoek structureren. De uitgewerkte voorbeeldvragen zijn geen gevalideerde meetinstrumenten; beoordeel of ze passen bij jouw context."/></p>}
      {current && !usesQuestionWorkbench(current) && overview==='questions' && <output className="creator-help">Je vraagselectie wordt direct in je kader bewaard.</output>}
    </section>
  );
}
