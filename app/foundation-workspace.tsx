"use client";
import {countLabel} from '@/lib/display-count.mjs';
import {useCollectionScope,CollectionBadge} from './collection-choice';
import { Fragment, useState, useRef, useLayoutEffect, useEffect } from "react";
import type {FoundationBrowse} from '@/lib/project-session.mjs';
import { X, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import OpenItemStrip,{OpenWorkspaceEmpty} from './open-item-strip';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  foundationWorkspace,
  chooseFoundationItems,
  closeFoundation,
  foundationQuestionPlans,
  adoptFoundationQuestions,
  preparedFoundationItems,
} from "@/lib/foundation-workspace.mjs";
import type { Draft, ResearchQuestion } from "@/lib/framework-types";
import { MaterialEditor } from "./investigation-workspace";
import SourceControlReference from "./source-control-reference";
import ProvisionStatus from './provision-status';
import FoundationSourceReader from './lazy-foundation-reader';
import CriterionSourceLayout from './criterion-source-layout';
import ApplicabilityRegister from "./applicability-register";
import LegacyCioNotice from "./legacy-cio-notice";
import {activeProcesses} from '@/lib/process-catalogue.mjs';
import {processGroupHints} from '@/lib/workflow-readability.mjs';
import {sourceQuestionPlan} from '@/lib/research-proposals.mjs';
import {researchOf} from '@/lib/research-plan.mjs';
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import CioLawWorkspace from './cio-law-browser';
import {cioSourceId} from '@/lib/cio-law-data.mjs';
import {wwkeSourceId,wwkeMetadata} from '@/lib/wwke-law-data.mjs';
import WwkeLawBrowser from './wwke-law-browser';
import {useLawOverview,type LawOverviewProps} from './law-overview-state';
import {foundations} from '@/lib/investigation.mjs';
import {topicalIds} from '@/lib/topical-content.mjs';
import TopicalLawBrowser from './topical-law-browser';
import AdmittedLawBrowser from './admitted-law-browser';
import {isAdmittedFoundation} from '@/lib/admitted-foundation.mjs';
import {foundationQuestionPresentation} from '@/lib/source-question-presentation.mjs';
import {NO_APPROVED_QUESTION} from '@/lib/investigation.mjs';

export default function FoundationWorkspace(props: Parameters<typeof LegacyFoundationWorkspace>[0] & LawOverviewProps & {prepareSource?:(id:string,action:()=>void)=>void;prepareDetails?:(id:string,action:()=>void)=>void}) {
  const [overview,setOverview]=useLawOverview(props);
  const allows=useCollectionScope();
  const overviewProps={overview,onOverviewChange:setOverview,prepareDetails:(action:()=>void)=>props.prepareDetails?props.prepareDetails(current||'',action):action()};
  const admitted=foundations.filter(isAdmittedFoundation).map(s=>s.id);
  const known=[cioSourceId,wwkeSourceId,...topicalIds,...admitted].filter(id=>allows('foundation',id)),opened=foundations.filter(s=>known.includes(s.id)&&props.draft.investigation?.sourceIds.includes(s.id));
  const [active,setActive]=useState(props.initialSource||props.initialBrowse.sourceId||opened[0]?.id||'');
  const [previousSource,setPreviousSource]=useState(props.initialSource);
  if(previousSource!==props.initialSource){
    setPreviousSource(props.initialSource);
    if(props.initialSource)setActive(props.initialSource);
  }
  const current=known.includes(active)&&(opened.some(s=>s.id===active)||props.initialSource===active)?active:(!active?opened[0]?.id:undefined);
  if(current){const onActivate=(id:string)=>{const apply=()=>{setActive(id);props.onBrowseChange({...props.initialBrowse,sourceId:id});};if(props.prepareSource)props.prepareSource(id,apply);else apply();};return <>
   <OpenItemStrip id="reviewed-law-open" items={opened.map(s=>({id:s.id,title:s.title}))} activeId={current} onActivate={onActivate} onClose={id=>{props.onChange(closeFoundation(props.draft,id) as Draft);const next=opened.find(s=>s.id!==id);if(next)onActivate(next.id);else props.navigate('foundations');}} onExplore={()=>props.navigate('foundations')} exploreLabel="Wet of kader openen" disabled={props.disabled}/>
   {admitted.includes(current)?<AdmittedLawBrowser {...overviewProps} key={current+props.initialCriterionId} sourceId={current} draft={props.draft} onChange={props.onChange} navigate={props.navigate} disabled={props.disabled} initialPointId={props.initialSource===current?props.initialCriterionId:undefined}/>:topicalIds.includes(current)?<TopicalLawBrowser {...overviewProps} key={current+props.initialCriterionId} sourceId={current} draft={props.draft} onChange={props.onChange} navigate={props.navigate} disabled={props.disabled} initialPointId={props.initialSource===current?props.initialCriterionId:undefined}/>:current===wwkeMetadata.id?<WwkeLawBrowser {...overviewProps} key={current+props.initialCriterionId} draft={props.draft} onChange={props.onChange} navigate={props.navigate} disabled={props.disabled} initialPointId={props.initialSource===current?props.initialCriterionId:undefined}/>:<CioLawWorkspace {...overviewProps} hideOpenStrip draft={props.draft} onChange={props.onChange} navigate={props.navigate} disabled={props.disabled} initialPointId={props.initialSource===current?props.initialCriterionId:undefined}/>}
  </>;}
  return <LegacyFoundationWorkspace {...props} />;
}
function LegacyFoundationWorkspace({
  draft,
  onChange,
  navigate,
  disabled,
  initialSource = "",
  initialCriterionId = "",
  processId = "",
  initialBrowse,
  onBrowseChange,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  navigate: (p: string) => void;
  disabled: boolean;
  initialSource?: string;
  initialCriterionId?: string;
  processId?: string;
  initialBrowse:FoundationBrowse;
  onBrowseChange:(value:FoundationBrowse)=>void;
}) {
  const sameSource=initialSource===initialBrowse.sourceId;
  const allows=useCollectionScope();
  const [query, setQuery] = useState(sameSource?initialBrowse.query:''),
    [sourceId, setSourceId] = useState(initialSource),
    [topic, setTopic] = useState(sameSource?initialBrowse.topic:''),
    [groupId, setGroupId] = useState(sameSource?initialBrowse.groupId:''),
    [page, setPage] = useState(sameSource?initialBrowse.page:0);
  const [sourceSearch, setSourceSearch] = useState(""),
    [sourcePicker, setSourcePicker] = useState(false);
  const [comparisonTab,setComparisonTab]=useState<'criterion'|'source'>('criterion');
  const [comparisonFocus,setComparisonFocus]=useState(0);
  const comparisonVisited=useRef(false);
  const comparisonHeading=useRef<HTMLHeadingElement>(null);
  const comparisonTrigger=useRef<HTMLElement|null>(null);
  function openCriterion(id:string, trigger:HTMLElement) {
    comparisonTrigger.current=trigger;
    setComparisonTab('criterion');comparisonVisited.current=false;
    setActive(id);
  }
  function showComparison(tab:'criterion'|'source',locate=false) {
    setComparisonTab(tab);
    if(tab==='source' && (locate||!comparisonVisited.current)) {setComparisonFocus(n=>n+1);comparisonVisited.current=true;}
  }
  const [questionDestination,setQuestionDestination]=useState('');
  const centralQuestions=(researchOf(draft).questions as ResearchQuestion[]).filter(q=>q.parent_id===null);
  const destination=centralQuestions.some(q=>q.id===questionDestination) ? questionDestination : '';
  const destinationQuestion=centralQuestions.find(q=>q.id===destination);
  const [selectedOnly, setSelectedOnly] = useState(initialBrowse.selectedOnly),
    [grouped, setGrouped] = useState(initialBrowse.grouped),
    [reviewedOnly, setReviewedOnly] = useState(initialBrowse.reviewedOnly),
    [active, setActive] = useState<string | null>(initialCriterionId || null),
    [message, setMessage] = useState("");
  useEffect(()=>{onBrowseChange({query,sourceId,topic,groupId,page,selectedOnly,grouped,reviewedOnly});},
    [query,sourceId,topic,groupId,page,selectedOnly,grouped,reviewedOnly,onBrowseChange]);
  const view = foundationWorkspace(draft, {
    query,
    sourceId,
    topic,
    groupId,
    page,
    selectedOnly,
    reviewedOnly,
  },preparedFoundationItems,foundations.filter(source=>allows('foundation',source.id)));
  const current = [...view.filtered,...view.contextItems].find((p) => p.id === active);
  const currentQuestion = current && foundationQuestionPresentation(current);
  const showGroups = grouped && !groupId && view.groupResults.length > 0 && view.filtered.every(p => p.groupId);
  const workspaceRef = useRef<HTMLElement>(null);
  const returnPosition = useRef<{ id: string; offset: number; y: number } | null>(null);
  const pendingScroll = useRef<"criteria" | "groups" | null>(null);
  useLayoutEffect(() => {
    if (pendingScroll.current === "groups" && showGroups) {
      const saved = returnPosition.current;
      const row = Array.from(workspaceRef.current?.querySelectorAll<HTMLElement>("[data-group-id]") ?? [])
        .find(r => r.dataset.groupId === saved?.id);
      if (row && saved) {
        row.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
        window.scrollBy({ top: row.getBoundingClientRect().top - saved.offset, behavior: "instant" });
      } else if (saved) window.scrollTo({ top: saved.y, behavior: "instant" });
      pendingScroll.current = null;
    } else if (pendingScroll.current === "criteria" && !showGroups) {
      workspaceRef.current?.querySelector<HTMLElement>(".foundation-view-switch")?.scrollIntoView({ block: "start", behavior: "instant" });
      pendingScroll.current = null;
    }
  }, [showGroups, groupId]);
  const [authorSource, setAuthorSource] = useState<string | null>(null);
  const sourceForAuthor = view.coverage.find((c) => c.source.id === authorSource)?.source;
  const activeSource =
    view.coverage.find((c) => c.source.id === sourceId)?.source ||
    (view.coverage.length === 1 ? view.coverage[0].source : null);
  const processContext = activeProcesses.find(p=>p.id===processId && p.sourceIds.includes(activeSource?.id ?? ''));
  const groupHints = processContext ? processGroupHints(view.groups,processContext.id) : [];
  function choose(items: typeof view.filtered, include: boolean) {
    try {
      onChange(chooseFoundationItems(draft, items, include) as Draft);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "De selectie kon niet worden gewijzigd.");
      return;
    }
    setMessage(
      include
        ? `${items.length} voorstellen opgenomen in je verzameling. Koppel ze bij Bouw je kader.`
        : `${items.length} voorstellen uit je selectie gehaald. Bewerkingen blijven bewaard.`,
    );
  }
  return (
    <section ref={workspaceRef} className="foundation-workbench" aria-labelledby="workflow-page-title">
      <LegacyCioNotice draft={draft} />
      <OpenItemStrip id="foundations" items={view.coverage.map(c=>({id:c.source.id,title:c.source.title}))} activeId={sourceId||(view.coverage.length===1?view.coverage[0].source.id:null)} allActive={!sourceId&&view.coverage.length>1} disabled={disabled}
        onActivate={id=>{setSourceId(id);setTopic("");setGroupId("");setPage(0);}}
        onAll={()=>{setSourceId("");setTopic("");setGroupId("");setPage(0);}}
        onClose={id=>{onChange(closeFoundation(draft,id) as Draft);if(sourceId===id)setSourceId("");setMessage("Bron gesloten. Je verzamelde bouwstenen en koppelingen blijven bewaard.");}}
        onExplore={()=>navigate("foundations")} exploreLabel="Wet of kader openen"/>
      {!view.coverage.length ? (
        <OpenWorkspaceEmpty prompt="Open een wet of kader om de inhoud te bekijken."/>
      ) : (
        <>
          <div className="collection-header">
            <label className="collection-search-label" htmlFor="criterion-search">Zoek norm</label>
            <Input
              id="criterion-search"
              className="collection-search"
              aria-label="Zoek norm"
              placeholder="Zoek op ID, norm, vraag of artikel…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            <div className="collection-filters">
            {view.coverage.length > 4 && <Popover open={sourcePicker} onOpenChange={setSourcePicker}>
              <PopoverTrigger render={<Button variant="outline" />}>
                Wissel bron ({view.coverage.length})
              </PopoverTrigger>
              <PopoverContent className="navigation-filter" align="start">
                <PopoverTitle>Open bronnen</PopoverTitle>
                <Input
                  aria-label="Zoek open bron"
                  placeholder="Zoek op naam of ID…"
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                />
                <div className="source-picker-options">
                  {view.coverage
                    .filter((c) =>
                      (c.source.id + " " + c.source.title)
                        .toLocaleLowerCase("nl")
                        .includes(sourceSearch.toLocaleLowerCase("nl")),
                    )
                    .map((c) => (
                      <div key={c.source.id}>
                        <Button
                          variant="ghost"
                          aria-pressed={sourceId === c.source.id}
                          onClick={() => {
                            setSourceId(c.source.id);
                            setTopic("");
                            setGroupId("");
                            setPage(0);
                            setSourcePicker(false);
                          }}
                        >
                          {c.source.title}
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={"Sluit bron " + c.source.title}
                          onClick={() => {
                            onChange(closeFoundation(draft, c.source.id) as Draft);
                            if (sourceId === c.source.id) setSourceId("");
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                </div>
              </PopoverContent>
            </Popover>}
            <label className="collection-filter">
              <span>Onderwerp</span>
              <select
                value={view.topics.includes(topic) ? topic : ""}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setGroupId("");
                  setPage(0);
                }}
              >
                <option value="">Alle onderwerpen</option>
                {view.topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            {!!view.groups.length && <label className="collection-filter">
              <span>Groep</span>
              <select aria-label="Groep normen" value={view.groups.some(g => g.id === groupId) ? groupId : ""}
                onChange={e => { setGroupId(e.target.value); setPage(0); }}>
                <option value="">Alle groepen</option>
                {view.groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </label>}
            </div>
          </div>
          {processContext && <div className="process-group-context">
            <div><strong>Verder vanuit {processContext.title}</strong>
            {groupHints.map((group:{id:string;title:string})=><Button key={group.id} variant="outline" aria-pressed={groupId===group.id} onClick={()=>{setGroupId(group.id);setQuery('');setTopic('');setPage(0);}}>{group.title}</Button>)}
            {groupId && <Button variant="link" onClick={()=>{setGroupId('');setPage(0);}}>Alle groepen tonen</Button>}</div>
            {!!groupHints.length && <small>Zoekhulp op groepsnaam; geen volledige selectie.</small>}
          </div>}
          {activeSource && <FoundationSourceReader reference={{sourceId:activeSource.id}}/>}
          {activeSource?.context && !view.contextItems.length && (
            <details className="foundation-coverage">
              <summary>Gebruik en afbakening · {activeSource.title}</summary>
              {activeSource.context.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
            </details>
          )}
          {activeSource && foundationQuestionPlans[activeSource.id] && (
            <details className="foundation-coverage foundation-question-plan">
              <summary>Voorgestelde onderzoeksopzet</summary>
              <div className="suggested-question-tree">
                <div className="suggested-central-question"><span>{destination ? 'Bestaande centrale vraag · blijft ongewijzigd' : 'Centrale vraag'}</span><p>{destinationQuestion?.text || sourceQuestionPlan(draft,activeSource.id)?.text}</p></div>
                <ol aria-label="Voorgestelde deelvragen">{sourceQuestionPlan(draft,activeSource.id,destinationQuestion?.researchDesign?.direction)?.subquestions.filter((q:{ids:string[]})=>q.ids.length).map((q:{key:string;text:string;ids:string[];scopeNote?:string}) => <li key={q.key}><span>Deelvraag · {q.ids.length} gekozen normen</span><p>{q.text}</p>{q.scopeNote && <small>{q.scopeNote}</small>}</li>)}</ol>
              </div>
              {centralQuestions.length > 0 && <label className="source-plan-destination">Vragen toevoegen aan
                <select aria-label="Vragen toevoegen aan" value={destination} onChange={e=>setQuestionDestination(e.target.value)}>
                  <option value="">Een afzonderlijke centrale vraag</option>
                  {centralQuestions.map(q=><option key={q.id} value={q.id}>{q.text || 'Centrale vraag nog te formuleren'}</option>)}
                </select>
              </label>}
              <p>Neemt alleen deelvragen met gekozen normen over. Normen bieden houvast; bepaal welk aanvullend bewijs nodig is om je vragen te beantwoorden.</p>
              <Button disabled={disabled} onClick={() => {
                try {
                  onChange(adoptFoundationQuestions(draft, activeSource.id, {selectedOnly:true,...(destination ? {targetId:destination} : {})}) as Draft);
                  navigate("framework");
                } catch (e) { setMessage(e instanceof Error ? e.message : "Vragen konden niet worden toegevoegd."); }
              }}>Gebruik deze vragen</Button>
            </details>
          )}
          {!!view.contextItems.length && <details className="foundation-scope-notes">
            <summary>Voor wie geldt dit? · Afbakening ({view.contextItems.length})</summary>
            <p>Deze bepalingen helpen de juiste organisatie en rol te kiezen. Ze zijn geen zelfstandige toetsnormen.</p>
            {view.contextItems.map(p=><article key={p.id}>
              <button className="source-title" onClick={event=>openCriterion(p.id,event.currentTarget)}>{p.title}</button>
              <p>{p.auditNorm||p.body}</p>
              <div className="foundation-scope-meta"><span>{p.id} · {p.location}</span><ProvisionStatus item={p}/>
                <Button variant="outline" onClick={event=>openCriterion(p.id,event.currentTarget)}>Bron en toelichting</Button></div>
              {p.selected&&<p>Staat nog in je bestaande kader. <Button variant="outline" disabled={disabled} onClick={()=>choose([p],false)}>Uit selectie halen</Button></p>}
            </article>)}
            {activeSource?.context&&<p className="foundation-scope-boundary">{activeSource.context}</p>}
          </details>}
          <div className="foundation-selection-bar">
            <label htmlFor="foundation-criteria-selected">
              <Checkbox
                id="foundation-criteria-selected"
                checked={selectedOnly}
                onCheckedChange={(v) => {
                  setSelectedOnly(Boolean(v));
                  setPage(0);
                }}
              />{" "}
              Alleen gekozen toetspunten
            </label>
            {(view.released > 0 || reviewedOnly) && <label htmlFor="foundation-criteria-reviewed">
              <Checkbox
                id="foundation-criteria-reviewed"
                checked={reviewedOnly}
                onCheckedChange={(v) => {
                  setReviewedOnly(Boolean(v));
                  setPage(0);
                }}
              />{" "}
              Alleen menselijk vrijgegeven
            </label>}
            <span>
              {countLabel(view.filtered.length,'toetspunten')} · {view.filtered.filter((p) => p.selected).length}{" "}
              gekozen
              {view.selected > view.filtered.filter(p => p.selected).length &&
                ` · ${view.selected - view.filtered.filter(p => p.selected).length} gekozen buiten deze filters`}
            </span>
            {!showGroups&&<Button
              variant="outline"
              disabled={disabled || !view.filtered.some((p) => !p.selected)}
              onClick={() =>
                choose(
                  view.filtered.filter((p) => !p.selected),
                  true,
                )
              }
            >
              {`Selecteer alle ${view.filtered.length} resultaten`}
            </Button>}
            {!showGroups&&<Button variant="outline"
              disabled={disabled || !view.filtered.some(p => p.selected)}
              onClick={() => choose(view.filtered.filter(p => p.selected), false)}>
              Deselecteer resultaten
            </Button>}
          </div>
          {activeSource?.kind === "audit" && <ApplicabilityRegister draft={draft}
            requirements={preparedFoundationItems.filter(p=>p.sourceId===activeSource.id)}
            onChange={onChange} disabled={disabled} />}
          <details className="foundation-coverage">
            <summary>
              Uitwerking van je open bronnen
            </summary>
            <p>
              Welke bronnen zijn uitgewerkt en beoordeeld? Dit overzicht gaat over de bibliotheek, niet over je gekozen normen of uitgevoerde tests.
            </p>
            <div className="foundation-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bron</TableHead>
                    <TableHead>Beschikbaar</TableHead>
                    <TableHead>Menselijk vrijgegeven</TableHead>
                    <TableHead>Volledigheid van de bron</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.coverage.map((c) => (
                    <TableRow key={c.source.id}>
                      <TableCell>
                        {c.source.title}<span className="criterion-reference">{c.source.id} · {c.source.edition}</span>
                      </TableCell>
                      <TableCell>{c.available}</TableCell>
                      <TableCell>{c.reviewed}</TableCell>
                      <TableCell>{c.completeness}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p>
              Bronnen met nul voorstellen zijn nog niet uitgewerkt, niet zonder relevante
              bepalingen.
            </p>
          </details>
          {!!view.groups.length && <div className="foundation-view-switch" aria-label="Weergave normen">
            <Button variant={showGroups ? "default" : "outline"} aria-pressed={showGroups}
              onClick={() => { if (showGroups) return; pendingScroll.current = "groups"; setGrouped(true); setGroupId(""); setPage(0); }}>{groupId ? "Terug naar groepen" : "Groepen"}</Button>
            <Button variant={!showGroups ? "default" : "outline"} aria-pressed={!showGroups}
              onClick={() => setGrouped(false)}>Losse normen</Button>
            <span>Groepsacties volgen je filters, over alle pagina’s.</span>
          </div>}
          {showGroups && <div className="foundation-table-scroll">
            <Table className="foundation-groups-table">
              <TableHeader><TableRow><TableHead><Checkbox aria-label="Selecteer alle groepen binnen de filters"
                checked={view.filtered.length>0&&view.filtered.every(p=>p.selected)}
                indeterminate={view.filtered.some(p=>p.selected)&&view.filtered.some(p=>!p.selected)}
                disabled={disabled||!view.filtered.length}
                onCheckedChange={checked=>choose(view.filtered,Boolean(checked))}/></TableHead><TableHead>Groep</TableHead>
                <TableHead>Toetspunten gekozen in groep</TableHead><TableHead>Bekijken</TableHead></TableRow></TableHeader>
              <TableBody>{view.groupResults.map(g => <TableRow key={g.id} data-group-id={g.id}>
                <TableCell><Checkbox aria-label={"Selecteer groep: "+g.title} disabled={disabled||!g.total}
                  checked={g.selected===g.total&&g.total>0} indeterminate={g.selected>0&&g.selected<g.total}
                  onCheckedChange={checked=>choose(g.items,Boolean(checked))}/></TableCell>
                <TableCell><strong>{view.coverage.length > 1 ? `${g.sourceId} · ` : ""}{g.title}</strong>
                  {g.description && <p className="criterion-group-description">{g.description}</p>}</TableCell>
                <TableCell><span className="group-selection-count">{g.groupSelected} / {g.groupTotal}</span>
                  {g.total < g.groupTotal && <span className="criterion-reference">{g.total} binnen filters</span>}</TableCell>
                <TableCell><div className="foundation-group-actions"><Button variant="outline" aria-label={"Bekijk normen in " + g.title}
                  onClick={e => {
                    const row = e.currentTarget.closest("tr");
                    returnPosition.current = { id: g.id, offset: row?.getBoundingClientRect().top ?? 0, y: window.scrollY };
                    pendingScroll.current = "criteria"; setGroupId(g.id); setPage(0);
                  }}>Bekijken →</Button></div></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>}
          {(!showGroups || view.filtered.some(p => !p.groupId)) && (view.rows.length ? (
            <div className="foundation-table-scroll">
              <Table className="foundation-criteria-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Opnemen</TableHead>
                    <TableHead>{activeSource?.kind === "audit" ? "Auditdekkingspunt" : "Toetspunt"}</TableHead>
                    <TableHead>Onderwerp</TableHead>
                    <TableHead>Bron / artikel</TableHead>
                    <TableHead>Inhoud</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.rows.map((p, index) => (
                    <Fragment key={p.id}>
                    {p.groupId && (index === 0 || view.rows[index - 1].groupId !== p.groupId) &&
                      <TableRow className="criterion-group"><TableHead colSpan={5} scope="rowgroup">
                        <div className="criterion-group-actions"><strong>{p.groupTitle}</strong>
                          {view.groupResults.filter(g => g.id === p.groupId).map(g => <Fragment key={g.id}>
                            <span>{g.groupSelected} / {g.groupTotal} gekozen{g.total < g.groupTotal ? ` · ${g.total} binnen filters` : ""}</span>
                            <Button variant="outline" disabled={disabled || g.selected === g.total}
                              onClick={() => choose(g.items.filter(p => !p.selected), true)}>Selecteer groepsresultaten</Button>
                            <Button variant="outline" disabled={disabled || !g.selected}
                              onClick={() => choose(g.items.filter(p => p.selected), false)}>Deselecteer groepsresultaten</Button>
                          </Fragment>)}
                        </div>
                        {p.groupDescription && <p className="criterion-group-description">{p.groupDescription}</p>}
                      </TableHead></TableRow>}
                    <TableRow key={p.id} data-state={p.selected ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          aria-label={"Neem " + p.id + " op in je onderzoek"}
                          checked={p.selected}
                          disabled={disabled}
                          onCheckedChange={(v) => choose([p], Boolean(v))}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="criterion-reference">
                          {p.id}
                          <CollectionBadge kind="foundation" id={p.sourceId}/>
                        </span>
                        <button className="source-title" onClick={event => openCriterion(p.id,event.currentTarget)}>
                          {p.title}
                        </button>
                        <p className="criterion-summary">{p.auditNorm||p.body}</p>
                        <button className="criterion-source-link" onClick={event=>openCriterion(p.id,event.currentTarget)}>Lees volledig en bekijk bron</button>
                      </TableCell>
                      <TableCell>{p.topic}</TableCell>
                      <TableCell>
                        <span>{p.source?.id}</span>
                        <span className="criterion-reference">{p.location}</span>
                        <ProvisionStatus item={p}/>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          aria-label={"Bekijk " + p.id}
                          onClick={event => openCriterion(p.id,event.currentTarget)}
                        >
                          <Eye size={17} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="empty-framework">
              <p>
                {view.total === 0 ||
                view.coverage.find((c) => c.source.id === sourceId)?.available === 0
                  ? "Voor deze bronselectie zijn nog geen uitgewerkte voorstellen beschikbaar."
                  : "Geen voorstellen bij deze filters."}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setTopic("");
                  setGroupId("");
                  setSourceId("");
                  setSelectedOnly(false);
                  setReviewedOnly(false);
                  setPage(0);
                }}
              >
                Filters wissen
              </Button>
              {activeSource && (
                <Button disabled={disabled} onClick={() => setAuthorSource(activeSource.id)}>
                  Eigen norm maken
                </Button>
              )}
              {activeSource && (
                <a
                  className="external-source"
                  href={activeSource.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open officiële bron <ExternalLink size={16} />
                </a>
              )}
            </div>
          ))}
          {!showGroups && <div className="foundation-pagination">
            <span>
              {view.filtered.length ? view.page * 25 + 1 : 0}–
              {Math.min((view.page + 1) * 25, view.filtered.length)} van {view.filtered.length}
            </span>
            <Button variant="outline" disabled={!view.page} onClick={() => setPage(view.page - 1)}>
              Vorige
            </Button>
            <span>
              {view.page + 1} / {view.pages}
            </span>
            <Button
              variant="outline"
              disabled={view.page + 1 >= view.pages}
              onClick={() => setPage(view.page + 1)}
            >
              Volgende
            </Button>
          </div>}
          <output className="foundation-feedback" aria-live="polite">
            {message}
          </output>
        </>
      )}
      <Sheet
        modal={true}
        open={!!current}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <SheetContent className="foundation-detail foundation-comparison" aria-modal="true"
          initialFocus={comparisonHeading}
          finalFocus={()=>comparisonTrigger.current?.isConnected ? comparisonTrigger.current : document.getElementById('workflow-page-title')}>
          <SheetHeader>
            <SheetTitle ref={comparisonHeading} tabIndex={-1}>{current?.title}</SheetTitle>
            <div className="foundation-detail-meta">
              <SheetDescription>
                {current?.id} · {current?.effectiveStatus==='future'
                  ? current.source?.title.replace(/\s*·\s*voorbereiding$/i,'')
                  : current?.source?.title}
              </SheetDescription>
              {current && <ProvisionStatus item={current}/>}
            </div>
          </SheetHeader>
          {current?.source && <CriterionSourceLayout active={comparisonTab} onActive={showComparison} criterion={
            <>
              <span className="source-status">
                {current.reviewStatus === "reviewed"
                  ? "Inhoudelijk vrijgegeven"
                  : current.reviewStatus === "ai-reviewed" ? "Bronbewerking · AI-review, geen menselijke vrijgave" : "Eigen criteriumvoorstel · niet inhoudelijk vrijgegeven"}
              </span>
              <h3>{current.auditRole==='scope'?'Afbakening · geen toetsnorm':current.auditRole==='clarification'?'Afbakeningsvraag · nog geen toetsnorm':current.auditRole==='objective'?'Beveiligingsdoel · nog uit te werken':current.source.kind === "audit" ? "Auditdekkingspunt" : current.auditNorm?'Norm · in gewone taal':'Norm'}</h3>
              <p className="foundation-readable-norm">{current.auditNorm||current.body}</p>
              <h3>{current.auditNorm?'Toepassing en voorwaarden':'Waarom relevant?'}</h3>
              <p>{current.auditNorm ? current.sourceContext || current.rationale : current.rationale}</p>
              {current.risk && <><h3>Risico · auditvoorstel</h3><p>{current.risk}</p></>}
              <SourceControlReference material={current} showContext={false} showStatus={false} onRead={()=>showComparison('source',true)} />
              <h3>Vraag aan de gesprekspartner</h3>
              <p>{currentQuestion?.text || NO_APPROVED_QUESTION}</p>
              {currentQuestion?.text && !currentQuestion.review.approved && <small>Inhoudelijke beoordeling van deze vraag niet vastgesteld.</small>}
              {!current.testDesign && !current.testExistence && !current.testOperation &&
                <><h3>Toetsing</h3><p>{current.procedure}</p></>}
              {current.testDesign && <><h3>Opzet</h3><p>{current.testDesign}</p></>}
              {current.testExistence && <><h3>Bestaan</h3><p>{current.testExistence}</p></>}
              {current.testOperation && <><h3>Werking</h3><p>{current.testOperation}</p></>}
              {current.documents && <><h3>Bewijsmateriaal · suggesties</h3><p>{current.documents}</p></>}
              <p>
                {current.source.edition} · {current.location}
              </p>
              <a
                className="external-source"
                href={current.sourceUrl || current.source.url}
                target="_blank"
                rel="noreferrer"
              >
                Officiële bron <ExternalLink size={16} />
              </a>
              <div className="foundation-actions">
                {(current.auditRole!=='scope'||current.selected)&&<Button disabled={disabled} onClick={() => choose([current], !current.selected)}>
                  {current.selected ? "Uit selectie halen" : "Opnemen in onderzoek"}
                </Button>}
              </div>
            </>
          } source={<FoundationSourceReader key={current.id} reference={current} inline focusRequest={comparisonFocus} onReturn={()=>showComparison('criterion')}/>} />}
        </SheetContent>
      </Sheet>
      <MaterialEditor
        key={authorSource || "none"}
        open={!!authorSource}
        onClose={() => setAuthorSource(null)}
        draft={draft}
        source={sourceForAuthor}
        onChange={(next) => {
          onChange(next);
          navigate("framework");
        }}
      />
    </section>
  );
}
