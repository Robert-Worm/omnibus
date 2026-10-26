"use client";
import FoundationSourceReader from './lazy-foundation-reader';
import {useCollectionScope} from './collection-choice';
import TermHelp, {TermText} from './term-help';
import CatalogueGroups,{CatalogueFamily} from './catalogue-groups';
import DirectorySearch from './directory-search';
import CatalogueCardActions from './catalogue-card-actions';
import {CatalogueHeader,SourceChoices} from './catalogue-navigation';
import {scopeFoundationSources} from '@/lib/catalogue-directory.mjs';
import CriterionSearchResults from './criterion-search-results';
import {createCatalogueSearch} from '@/lib/catalogue-search.mjs';
import {foundationSearchItems,foundationSearchScope} from '@/lib/foundation-search.mjs';
import { chooseFoundationSource, chooseFoundationItems, preparedFoundationItems, foundationSelection, sourceNarrowing } from '@/lib/foundation-workspace.mjs';
import { useState } from "react";
import {
  ArrowRight,
  FolderOpen,
  ChevronRight,
  Layers,
  Library,
  MessageSquare,
  Scale,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { foundations, foundationKinds, validateInvestigation, workflowStage, addMaterial } from "@/lib/investigation.mjs";
import { addQuestion } from "@/lib/research-plan.mjs";
import { directionApproach, directionBoundary, researchDirections } from '@/lib/research-directions.mjs';
import { goalTemplates, researchGoalText } from '@/lib/research-goal.mjs';
import {collectionDestination} from '@/lib/collection-start.mjs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { filterSources, sourceDomains } from "@/lib/active-foundation-navigation.mjs";
import {cioSourceId} from '@/lib/cio-law-data.mjs';
import {wwkeSourceId} from '@/lib/wwke-law-data.mjs';
import {lawCatalogueCounts} from '@/lib/law-catalogue-counts.mjs';
import type { Draft } from "@/lib/framework-types";
import './viewer-readability.css';

// Creating this closure is cheap; the corpus search index is built on first search.
const searchCatalogue=createCatalogueSearch(foundationSearchItems,foundations);

export function InvestigationNavigation({
  page,
  navigate,
  count,
  researchRoute='question',
  researchDirection='',
  lastCollectionPage='',
}: {
  page: string;
  navigate: (s: string) => void;
  count: number;
  researchRoute?: string;
  researchDirection?: string;
  lastCollectionPage?: string;
}) {
  const stage = workflowStage(page);
  const landing=collectionDestination(lastCollectionPage,researchDirection,researchRoute);
  const collectionHint=(lastCollectionPage?'Terug naar ':'Begin bij ')+landing.label;
  const stages = [
    [researchRoute==='risk'?'risk-start':'start', researchRoute==='risk'?'Verken je onderwerp':'Onderzoeksrichting', researchRoute==='risk'?'#risicoverkenning':'#start'],
    ["collect", "Verzamel", landing.hash],
    ["framework", "Bouw je kader", "#mijn-kader"],
    ["export", "Exporteer", "#kaderexport"],
  ];
  const headings: Record<string, [string, string]> = {
    entry:['Hoe begint jouw onderzoek?','Twee vertrekpunten naar een referentiekader met normen en onderzoeksvragen.'],
    'risk-start':['Van signalen naar je referentiekader','Gebruik je intake of gesprekken als vertrekpunt. Een onderzoeksvraag hoef je nog niet te hebben.'],
    'report-themes':['Rapportuitwerkingen','De oorspronkelijke uitwerkingen en hun vraagvoorstellen blijven hier beschikbaar.'],
    start: ['Wat wil de opdrachtgever met het onderzoek bereiken?', 'Formuleer welke inzichten de opdrachtgever nodig heeft en waarvoor. Kies daarna passende bronnen en bouwstenen.'],
    catalogue: ['Thema’s', 'Bekijk een breed onderwerp over meerdere processen en bronnen heen.'],
    processes: ['Processen', 'Verken de risico’s en normen die specifiek bij een proces horen.'],
    topics: ['Open thema’s & processen', 'Bekijk de samenhang tussen norm, doel, risico en beheersing. Kies vervolgens wat relevant is voor je eigen onderzoek.'],
    foundations: ['Wetten & kaders', 'Open bronnen in de viewer. Kies daar losse toetspunten, een norm of een hele groep.'],
    'foundation-workspace': ['Open wetten & kaders', 'Kies toetspunten uit je geopende bronnen en combineer ze in je onderzoek.'],
    models: ['Modellen', 'Kies een onderzoeksmodel en de vragen die bij je onderzoek passen.'],
    'model-workspace':['Open modellen','Kies interviewvragen uit je geopende modellen. Je selectie staat direct klaar bij Bouw je kader.'],
    reports: ['Rapportbibliotheek', 'Verken praktijkinzichten en bekijk de oorspronkelijke bronnen.'],
    reader: ['Bronrapport lezen', 'Bekijk het rapport en de onderbouwing van je bouwstenen.'],
    framework: ['Bouw je kader', 'Formuleer je vragen en koppel de bouwstenen die je wilt onderzoeken.'],
    export: ['Kaderexport', 'Kies een werkvorm, controleer de inhoud en download je Excel-werkdocument.'],
  };
  const heading = headings[page] || headings.framework;
  const viewer=['foundation-workspace','model-workspace','topics'].includes(page);
  const hasViewerNext=['foundation-workspace','topics','model-workspace'].includes(page);
  const route=<div className="entry-route-link"><span>Onderzoeksroute <strong><TermText text={researchRoute==='risk'?'Risk-based':'Vraaggestuurd'}/></strong></span><Button variant="ghost" onClick={()=>navigate('entry')}>Route wijzigen</Button></div>;
  const next = stage === 0 ? ['collect','Naar stap 2: Verzamel'] : stage === 1 ? ['framework','Naar stap 3: Bouw je kader'] : stage === 2 ? ['export','Naar stap 4: Exporteer'] : null;
  return (
    <>
      {page!=='entry'&&<div className="research-navigation-shell">{route}</div>}
      {page!=='entry'&&<nav className="investigation-steps" aria-label="Onderzoeksstappen">
        {stages.map(([id, label, hash], i) => (
          <a
            key={id}
            href={hash}
            title={id==='collect'?collectionHint:undefined}
            aria-current={stage === i ? "step" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(id);
            }}
          >
            <span className="step-number">{i + 1}</span>
            <span>{label}</span>
            {id === "framework" && count > 0 && <span className="step-count" title="Gekozen bouwstenen uit alle bronnen; elke bouwsteen telt één keer.">{count} {count===1?'bouwsteen':'bouwstenen'}</span>}
            {i < stages.length - 1 && <ChevronRight className="step-connector" size={18} aria-hidden="true" />}
          </a>
        ))}
      </nav>}
      <header className="workflow-page-heading">
        <div><h1 id="workflow-page-title" tabIndex={-1}>{heading[0]}</h1><p><TermText text={heading[1]} /></p></div>
        {next && !hasViewerNext && <div className={viewer?'viewer-heading-actions':undefined}><Button className="workflow-next" title={next[0]==='collect'?collectionHint:undefined} onClick={() => navigate(next[0])}>{next[1]}<ArrowRight size={16} aria-hidden="true" /></Button></div>}
      </header>
    </>
  );
}

/** Local navigation lives inside the collection surface it controls. */
export function CollectionNavigation({page,navigate,discoveryAxis='themes',openCounts}: {
  page:string;
  navigate:(page:string)=>void;
  discoveryAxis?:'themes'|'processes';
  openCounts:{foundations:number;models:number;topics:number};
}) {
  if(workflowStage(page)!==1)return null;
  const categories:{label:string;items:{id:string;label:string;hash:string;count?:number;hint?:string}[]}[] = [
    {label:'Verkennen',items:[
      {id:'foundations',label:'Wetten & kaders',hash:'#grondslagen'},
      {id:'models',label:'Modellen',hash:'#modellen'},
      {id:discoveryAxis==='processes'?'processes':'catalogue',label:'Thema’s & processen',hash:discoveryAxis==='processes'?'#processen':'#themas'},
    ]},
    {label:'Geopend',items:[
      {id:'foundation-workspace',label:'Wetten & kaders',hash:'#open-grondslagen',count:openCounts.foundations},
      {id:'model-workspace',label:'Modellen',hash:'#open-modellen',count:openCounts.models},
      {id:'topics',label:'Thema’s & processen',hash:'#open-themas',count:openCounts.topics,
        hint:'Geopende thema’s, processen en rapportuitwerkingen in deze viewer. Dit is niet het aantal geselecteerde toetspunten.'},
    ]},
    {label:'Bronnen',items:[{id:'reports',label:'Rapporten',hash:'#rapporten'}]},
  ];
  return (
        <div className="collection-navigation">
          <nav className="collection-grouped-nav" aria-label="Bouwstenen verzamelen">
            {categories.map(group=><fieldset className="collection-nav-group"  aria-label={group.label} key={group.label}>
              <div className="collection-nav-links">
            {group.items.map(({id, label, hash, count:opened, hint}) => (
              <a
                key={id}
                href={hash}
                aria-label={opened===undefined?undefined:`Open ${label.toLocaleLowerCase('nl')}, ${opened} geopend`}
                title={opened===undefined?undefined:(hint||`${opened} geopend in deze viewer. Dit is niet het aantal geselecteerde bouwstenen.`)}
                aria-current={
                  page === id ||
                  (['catalogue','processes'].includes(id) && ['catalogue','processes'].includes(page)) ||
                  (id === "reports" && page === "reader")
                    ? "page"
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  navigate(id);
                }}
              >
                <span>{opened===undefined?label:`Open ${label.toLocaleLowerCase('nl')}`}</span>
                {opened!==undefined&&<span className="collection-open-count" aria-hidden="true"><FolderOpen size={13}/>{opened}</span>}
              </a>
            ))}
              </div>
            </fieldset>)}
          </nav>
        </div>
  );
}

export function InvestigationStart({
  draft,
  onChange,
  navigate,
  disabled,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  navigate: (p: string) => void;
  disabled: boolean;
}) {
  const wb = validateInvestigation(draft.investigation);
  const goal = draft.investigation?.goal || {direction: '', subject: '', intendedUse: ''};
  const template = goalTemplates[goal.direction as keyof typeof goalTemplates];
  const [goalFieldsCollapsed,setGoalFieldsCollapsed]=useState(false);
  const question = wb.purpose;
  const roots = draft.research?.questions.filter((q) => !q.parent_id) || [];
  const normalized = (s: string) => s.trim().toLocaleLowerCase("nl");
  function begin() {
    let next = { ...draft, investigation: { ...wb, purpose: question.trim() } };
    if (question.trim() && !roots.some((q) => normalized(q.text) === normalized(question)))
      next = addQuestion(next, null, question.trim(), "user").draft;
    onChange(next as Draft);
    navigate("framework");
  }
  const setQuestion = (value: string) =>
    onChange({ ...draft, investigation: { ...wb, purpose: value } } as Draft);
  const setGoal = (patch: Partial<typeof goal>) =>
    onChange({ ...draft, investigation: { ...wb, goal: {...goal, ...patch} } } as Draft);
  return (
    <section className="investigation-start" aria-labelledby="workflow-page-title">
      <section className="goal-builder" aria-label="Onderzoeksdoelstelling formuleren">
        <div className="goal-inputs">
        <fieldset className="research-direction-picker" disabled={disabled}>
          <legend>1. Kies je <TermHelp id="direction">onderzoeksrichting</TermHelp></legend>
          <RadioGroup aria-label="Onderzoeksrichting voor de doelstelling" value={goal.direction}
            disabled={disabled} onValueChange={value => {setGoalFieldsCollapsed(false);setGoal({direction: String(value)});}}>
            {researchDirections.map(d => <label key={d.id} htmlFor={`goal-${d.id}`} className={goal.direction === d.id ? 'is-selected' : ''}
              onClickCapture={event=>{
                // Repeating the current choice deselects it. Preserve entered
                // subject/use text; disclosure has its own explicit control.
                if(!disabled && goal.direction===d.id && (event.target as HTMLElement).tagName!=='INPUT') {
                  event.preventDefault();event.stopPropagation();
                  event.currentTarget.querySelector<HTMLElement>('[role="radio"]')?.focus({preventScroll:true});
                  setGoalFieldsCollapsed(false);setGoal({direction:''});
                }
              }}
              onKeyDownCapture={event=>{
                if(!disabled && event.key===' ') {
                  event.preventDefault();event.stopPropagation();
                  if(!event.repeat){setGoalFieldsCollapsed(false);setGoal({direction:goal.direction===d.id?'':d.id});}
                }
              }}
              onKeyUpCapture={event=>{
                // Base UI also activates radios on keyup. The keydown above
                // already applied the toggle, so do not select it a second time.
                if(event.key===' '){event.preventDefault();event.stopPropagation();}
              }}>
              <RadioGroupItem id={`goal-${d.id}`} value={d.id} aria-label={d.label} />
              <span><strong>{d.label}</strong><small>{d.aim}</small></span>
            </label>)}
          </RadioGroup>
        </fieldset>
        {/* An assignment usually asks more than one direction can answer. Naming
            what falls outside lets the auditor settle that with the assignment
            giver beforehand. */}
        {directionBoundary(goal.direction) && <p className="direction-boundary">{directionBoundary(goal.direction)}</p>}
        {directionApproach(goal.direction) && <details className="direction-approach">
          <summary>Wat deze richting van het bewijs vraagt</summary>
          <p>{directionApproach(goal.direction)}</p>
        </details>}
        {template ?
          <div id="goal-fields" className="goal-fields" hidden={goalFieldsCollapsed}>
            <label htmlFor="goal-subject"><strong>2. Wat is het onderwerp?</strong>
              <Input id="goal-subject" value={goal.subject} maxLength={500} disabled={disabled}
                placeholder="Bijvoorbeeld: de samenwerking tussen teams"
                onChange={e => setGoal({subject: e.target.value})} />
            </label>
            <div><label htmlFor="goal-use"><strong>3. Wat moet de opdrachtgever met de uitkomst kunnen?</strong>
              <Textarea id="goal-use" value={goal.intendedUse} maxLength={700} rows={2} disabled={disabled}
                aria-describedby="goal-use-hint" placeholder={template.uses[0]} onChange={e => setGoal({intendedUse: e.target.value})} />
              <small id="goal-use-hint">Maak af: ‘… in staat te stellen …’, bijvoorbeeld ‘te bepalen wat moet verbeteren’.</small>
              </label>
              <details className="goal-suggestions">
                <summary>Bekijk voorbeelden</summary>
                <ul aria-label="Voorbeelden van beoogd gebruik">
                  {template.uses.map((text, i) => <li key={text}>
                    <p id={`goal-example-${i}`}>{text}</p>
                    <Button variant="ghost" disabled={disabled || goal.intendedUse === text}
                      aria-describedby={`goal-example-${i}`}
                      onClick={() => setGoal({intendedUse: text})}>
                      {goal.intendedUse === text ? 'Ingevuld' : goal.intendedUse.trim() ? 'Vervang mijn tekst' : 'Gebruik dit voorbeeld'}
                    </Button>
                  </li>)}
                </ul>
              </details>
            </div>
          </div>
          : <p className="goal-empty">Kies een onderzoeksrichting die past bij de behoefte van de opdrachtgever, of verken eerst de bronnen hieronder.</p>}
        </div>
        {template && <>
          <div className="goal-preview"><strong>Doelstelling van de onderzoeksopdracht</strong>
            <p>{researchGoalText(goal, true)}</p>
          </div>
          <div className="goal-actions"><Button variant="link" disabled={disabled}
            aria-expanded={!goalFieldsCollapsed} aria-controls="goal-fields"
            onClick={()=>setGoalFieldsCollapsed(v=>!v)}>{goalFieldsCollapsed?'Invulvelden uitklappen':'Invulvelden inklappen'}</Button>
          </div>
        </>}
      </section>
      {question.trim() && <details className="question-start legacy-start-question">
        <summary>Eerder genoteerde vraag of probleem</summary>
        <label htmlFor="starting-question">Onderzoeksvraag of probleem</label>
        <Textarea
          id="starting-question"
          placeholder="Bijvoorbeeld: waardoor verloopt de samenwerking tussen teams moeizaam?"
          value={question}
          disabled={disabled}
          maxLength={2000}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div>
          <span>Een eerste formulering is genoeg.</span>
          <Button disabled={disabled || !question.trim()} onClick={begin}>
            Werk deze vraag uit <ArrowRight size={16} />
          </Button>
        </div>
      </details>}
      <div className="entry-grid">
        {[
          {
            id: "catalogue",
            title: "Thema of proces",
            description: "Verken praktijkinzichten en normen rond je onderwerp.",
            icon: Layers,
            action: "Verken thema’s en processen",
          },
          {
            id: "foundations",
            title: "Wet of kader",
            description: "Zoek grondslagen en normen die passen bij je doelstelling.",
            icon: Scale,
            action: "Verken wetten & kaders",
          },
          {
            id: "models",
            title: "Onderzoeksmodel",
            description: "Onderzoek een probleem met indicatoren en interviewvragen.",
            icon: MessageSquare,
            action: "Verken modellen",
          },
          {
            id: "reports",
            title: "Historisch rapport",
            description: "Zoek praktijkbevindingen en bekijk de oorspronkelijke bron.",
            icon: Library,
            action: "Bekijk rapporten",
          },
        ].map((e) => (
          <article key={e.id}>
            <e.icon size={24} aria-hidden="true" />
            <h2>{e.title}</h2>
            <p>{e.description}</p>
            <Button variant="outline" onClick={() => navigate(e.id)}>
              {e.action}
              <ArrowRight size={16} />
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FoundationCatalogue({
  draft,
  onChange,
  disabled,
  initialProcess = "",
  onProcessChange,
  onCriteria,
  onPrepareSource,
  searchQuery = "",
  onSearchQuery,
  directoryGroup = 'all',
  onDirectoryGroup,
  guided = false,
  sourceScope = 'laws',
  onSourceScopeChange,
  prepareSources = (_ids,action)=>action(),
  prepareSearch = (ids)=>prepareSources(ids,()=>{}),
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  disabled: boolean;
  navigate: (p: string) => void;
  initialProcess?: string;
  onProcessChange?: (id: string) => void;
  onCriteria: (id: string, criterionId?:string) => void;
  onPrepareSource?: (id:string)=>void;
  searchQuery?:string;
  onSearchQuery?:(query:string)=>void;
  directoryGroup?:string;
  onDirectoryGroup?:(id:string)=>void;
  guided?:boolean;
  sourceScope?:'all'|'laws'|'frameworks';
  onSourceScopeChange?:(value:'laws'|'frameworks')=>void;
  prepareSources?:(ids:string[],action:()=>void)=>void;
  prepareSearch?:(ids:string[])=>void;
}) {
  const wb = validateInvestigation(draft.investigation);
  const [sourceArea,setLocalSourceArea]=useState<'laws'|'frameworks'>('laws');
  const setSourceArea=(value:'laws'|'frameworks')=>{setLocalSourceArea(value);onSourceScopeChange?.(value);};
  const scope=guided||onSourceScopeChange?sourceScope:sourceArea;
  const allows=useCollectionScope();
  const scopedSources=scopeFoundationSources(foundations.filter(source=>allows('foundation',source.id)),scope);
  const [query, setQuery] = useState(searchQuery),
    [kind, setKind] = useState("all"),
    [selectedOnly, setSelectedOnly] = useState(false),
    [active, setActive] = useState<string | null>(null),
    [page, setPage] = useState(0),
    [create, setCreate] = useState(false);
  const current = foundations.find((s) => s.id === active);
  const [searchError,setSearchError] = useState('');
  const [localDomain, setLocalDomain] = useState("all"),
    [processId, setProcessId] = useState(initialProcess);
  const domain=onDirectoryGroup?(directoryGroup||'all'):localDomain;
  const setDomain=(id:string)=>{setLocalDomain(id||'all');onDirectoryGroup?.(id);};
  const showList=Boolean(directoryGroup||query.trim()||processId||kind!=='all'||selectedOnly);
  const criteriaFilter = JSON.stringify([kind,domain,processId,selectedOnly]);
  const [criteriaPagination,setCriteriaPagination] = useState({filter:criteriaFilter,page:0});
  if(criteriaPagination.filter!==criteriaFilter)setCriteriaPagination({filter:criteriaFilter,page:0});
  const criteriaPage = criteriaPagination.filter===criteriaFilter ? criteriaPagination.page : 0;
  const setCriteriaPage = (page:number) => setCriteriaPagination({filter:criteriaFilter,page});
  const browseSources = filterSources(scopedSources, {
    kind,
    domain,
    processId,
    selectedOnly,
    openIds: wb.sourceIds,
  });
  const search=searchCatalogue(query,browseSources.map(s=>s.id));
  const filtered: typeof foundations = query.trim() ? search.sources : browseSources;
  function changeSearch(value:string) {
    setQuery(value);onSearchQuery?.(value);setCriteriaPage(0);setPage(0);
    // Search needs display text, not every source's tests and evidence snapshots.
    if(value.trim())prepareSearch(scopedSources.map((s:{id:string})=>s.id));
  }
  const available = (id: string) => foundationSelection(draft,id).total;
  const sourcePageSize=query.trim()?5:10;
  const index = Math.min(page, Math.max(0, Math.ceil(filtered.length / sourcePageSize) - 1));
  function toggle(id: string, on: boolean) {
    onChange({
      ...draft,
      investigation: {
        ...wb,
        sourceIds: on
          ? [...new Set([...wb.sourceIds, id])]
          : wb.sourceIds.filter((s: string) => s !== id),
      },
    } as Draft);
  }
  return (
    <section className="catalogue-explorer foundation-catalogue">
      {!guided&&<><CatalogueHeader title="Verken bronnen" description="Open een wet of kader om de bijbehorende normen en oorspronkelijke bron te bekijken."/><SourceChoices value={scope} onChange={value=>{setSourceArea(value);setDomain('');setKind('all');setProcessId('');onProcessChange?.('');setSelectedOnly(false);changeSearch('');setPage(0);}}/></>}
      {guided&&<DirectorySearch id="foundation-search" label={scope==='laws'?'Zoek wet of wetscategorie':scope==='frameworks'?'Zoek kader of kadercategorie':'Zoek wet, kader of categorie'} value={query} onChange={changeSearch} placeholder="Bijvoorbeeld: privacy of inkoop"/>}
      {!guided&&<>
        <DirectorySearch id="foundation-search" label="Zoek wet of kader" value={query} onChange={changeSearch} placeholder="Zoek in bronnen en normen, bijvoorbeeld toegangsrechten…"/>
        {query.trim() && <div className="catalogue-search-tools">
          {search.suggestions.length>0 && <fieldset className="catalogue-search-suggestions"  aria-label="Zoeksuggesties">
            <span>Zoeksuggesties:</span>
            {search.suggestions.map(value=><Button key={value} variant="outline" onClick={()=>{
              changeSearch(value);document.getElementById('foundation-search')?.focus();
            }}>{value}</Button>)}
          </fieldset>}
        </div>}
      </>}
      <CatalogueGroups hideTitle compact={guided} query={query} noun="bronnen" value={directoryGroup} searching={Boolean(query.trim())}
        groups={Object.entries(sourceDomains).map(([id,d])=>({id,title:d.title,count:filterSources(scopedSources,{domain:id}).length}))}
        onChange={id=>{setDomain(id);setKind('all');setProcessId('');onProcessChange?.('');setSelectedOnly(false);changeSearch('');}}/>
      {showList&&<>
      {searchError && <p role="alert">{searchError}</p>}
      {query.trim() && <h2>Wetten &amp; kaders <small>({filtered.length})</small></h2>}
      {search.sourceCorrections.length>0 && <p className="creator-help">Vergelijkbare bronnen voor: {search.sourceCorrections.join(' / ')}. Je zoekopdracht is niet gewijzigd.</p>}
      <CatalogueFamily noun="bronnen" groupId={domain} title={sourceDomains[domain as keyof typeof sourceDomains]?.title||'Wetten & kaders'}>
      <div className="foundation-list">
        {filtered.slice(index * sourcePageSize, index * sourcePageSize + sourcePageSize).map((s) => {
          const selection=foundationSelection(draft,s.id);
          const lawCounts=lawCatalogueCounts(s.id);
          return (
          <div key={s.id}>
            <article key={s.id} data-open={wb.sourceIds.includes(s.id)} className={selection.selected ? "chosen" : ""}>
              <div className="directory-child-body">
                <span className="catalogue-card-id">{foundationKinds[s.kind as keyof typeof foundationKinds]}</span>
                <h4>
                <button className="source-title" onClick={() => prepareSources([s.id],()=>setActive(s.id))}>
                  {s.title}
                </button>
                </h4>
                <p>{s.usage}</p>
                {search.contextSourceIds.includes(s.id) && <span className="source-meta">Gevonden via normen in deze bron</span>}
                <div className="catalogue-card-stats">{lawCounts?<><span><strong>{lawCounts.groups}</strong> groepen</span><span><strong>{lawCounts.norms}</strong> normen</span><span><strong>{selection.total}</strong> selecteerbare toetspunten</span></>:<><span><strong>{selection.total}</strong> {s.kind==='audit'?'dekkingspunten':'toetspunten'}</span><span><strong>{sourceNarrowing(s.id).count}</strong> {sourceNarrowing(s.id).label}</span></>}<span className="catalogue-card-selected"><strong>{selection.selected}</strong> {s.kind==='audit'&&!lawCounts?'dekkingspunten':'toetspunten'} gekozen</span></div>
              </div>
              <CatalogueCardActions layout="buttons" title={s.title} opened={wb.sourceIds.includes(s.id)} disabled={disabled} onPrepare={()=>onPrepareSource?.(s.id)}
                onOpen={()=>{if(!wb.sourceIds.includes(s.id))toggle(s.id,true);onCriteria(s.id);}} onToggle={value=>toggle(s.id,value)}
                selection={{label:s.kind==='audit'&&!lawCounts?'Alle dekkingspunten':'Alle normen',ariaLabel:'Alle normen selecteren: '+s.title,checked:selection.all,partial:selection.partial,disabled:!selection.total,
                  onChange:checked=>prepareSources([s.id],()=>{try{const next=chooseFoundationSource(draft,s.id,checked);onChange({...next,investigation:{...next.investigation,sourceIds:wb.sourceIds}} as Draft);setSearchError('');}catch(error){setSearchError(error instanceof Error?error.message:'Selecteren is niet gelukt.');}})}}/>
            </article>
          </div>
        );})}
      </div>
      </CatalogueFamily>
      {!filtered.length && (
        <p className="empty-framework">
          Geen bronnen gevonden binnen deze zoekterm en filters. Wis je zoekopdracht of pas de filters aan.
        </p>
      )}
      {filtered.length>sourcePageSize && <div className="foundation-pagination">
        <span>{filtered.length} {filtered.length===1?'grondslag':'grondslagen'}</span>
        <Button variant="outline" disabled={index === 0} onClick={() => setPage(index - 1)}>
          Vorige
        </Button>
        <span>
          {index + 1} / {Math.max(1, Math.ceil(filtered.length / sourcePageSize))}
        </span>
        <Button
          variant="outline"
          disabled={(index + 1) * sourcePageSize >= filtered.length}
          onClick={() => setPage(index + 1)}
        >
          Volgende
        </Button>
      </div>}
      {query.trim() && <CriterionSearchResults query={query} matches={search.criteria} corrections={search.criterionCorrections}
        scopeProvisions={foundationSearchScope}
        selectedKeys={wb.materials.filter((m:{id:string})=>draft.included.includes(m.id)).map((m:{originKey:string})=>m.originKey)}
        onChoose={(key,include)=>{
          const hit=search.criteria.find((row:{item:{originKey:string;sourceId:string}})=>row.item.originKey===key);if(!hit)return;
          prepareSources([hit.item.sourceId],()=>{try {
          const item=preparedFoundationItems.find(p=>p.originKey===key);if(!item)return;
          const opened={...draft,investigation:{...wb,sourceIds:[...new Set([...wb.sourceIds,item.sourceId])]}};
          onChange(chooseFoundationItems(opened,[item],include) as Draft);setSearchError('');
        }catch(error){setSearchError(error instanceof Error?error.message:'Selecteren is niet gelukt.');}});}}
        sourceIds={browseSources.map(s=>s.id)}
        page={criteriaPage} onPage={setCriteriaPage} disabled={disabled}
        onOpen={(id,criterionId)=>{if(!wb.sourceIds.includes(id)) toggle(id,true);onCriteria(id,criterionId);}}/>}
      </>}
      <p className="directory-note"><TermText text="Wetten en kaders bieden aanknopingspunten voor je onderzoek. Controleer de oorspronkelijke bron, actualiteit en toepasselijkheid voor jouw organisatie. Een geselecteerde norm is nog geen oordeel over naleving."/></p>
      <Sheet
        open={!!current}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <SheetContent className="foundation-detail">
          <SheetHeader>
            <SheetTitle>{current?.title}</SheetTitle>
            <SheetDescription>{current?.edition}</SheetDescription>
          </SheetHeader>
          {current && (
            <>
              <p>{current.usage}</p>
              <p className="source-status">
                {current.coverage || (available(current.id)
                  ? `${available(current.id)} criteriumvoorstellen · brondekking niet vastgesteld`
                  : current.readiness)}
              </p>
              <p>
                {current.kind === "audit"
                  ? "Deze bron richt zich op de audit. Een dekkingspunt is niet automatisch een eis aan de organisatie."
                  : "Gebruik als grondslag bevestigt nog niet dat alle bepalingen op jouw onderzoek van toepassing zijn."}
              </p>
              {![cioSourceId,wwkeSourceId].includes(current.id) && <FoundationSourceReader reference={{sourceId:current.id}}/>}
              <a className="external-source" href={current.url} target="_blank" rel="noreferrer">
                Open officiële bron <ExternalLink size={16} />
              </a>
              <div className="foundation-actions">
                <Button
                  onClick={() => {
                    if (!wb.sourceIds.includes(current.id)) toggle(current.id, true);
                    onCriteria(current.id);
                  }}
                >
                  {current.kind === "audit" ? "Auditdekkingspunten" : "Normen"} bekijken ({available(current.id)})
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => toggle(current.id, !wb.sourceIds.includes(current.id))}
                >
                  {wb.sourceIds.includes(current.id) ? "Bron sluiten" : "Bron openen"}
                </Button>
                <Button disabled={disabled} onClick={() => setCreate(true)}>
                  Eigen bouwsteen maken <Plus size={16} />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <MaterialEditor
        key={current?.id || "own"}
        open={create}
        onClose={() => setCreate(false)}
        draft={draft}
        onChange={onChange}
        source={current}
      />
    </section>
  );
}

export function MaterialEditor({
  open,
  onClose,
  draft,
  onChange,
  source,
}: {
  open: boolean;
  onClose: () => void;
  draft: Draft;
  onChange: (d: Draft) => void;
  source?: (typeof foundations)[number];
}) {
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [location, setLocation] = useState(""),
    [question, setQuestion] = useState(""),
    [rationale, setRationale] = useState("");
  const [planning, setPlanning] = useState({ procedure: "", documents: "", risk: "", control: "" });
  function save() {
    let next = addMaterial(draft, {
      title: title.trim(),
      body: body.trim(),
      question: question.trim(),
      rationale: rationale.trim(),
      ...planning,
      sourceTitle: source?.title || "Eigen uitwerking",
      foundationId: source?.id || "",
      sourceUrl: source?.url || "",
      edition: source?.edition || "",
      location,
      kind: source?.kind === "audit" ? "audit-coverage" : "criterion",
    });
    if (source)
      next = {
        ...next,
        investigation: {
          ...next.investigation,
          sourceIds: [...new Set([...next.investigation.sourceIds, source.id])],
        },
      };
    onChange(next as Draft);
    setTitle("");
    setBody("");
    setQuestion("");
    setLocation("");
    setRationale("");
    setPlanning({ procedure: "", documents: "", risk: "", control: "" });
    onClose();
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent className="foundation-detail">
        <SheetHeader>
          <SheetTitle>Eigen bouwsteen</SheetTitle>
          <SheetDescription>
            {source ? source.title : "Werk een toetsbare norm uit voor jouw onderzoek."}
          </SheetDescription>
        </SheetHeader>
        <div className="material-form">
          <label htmlFor="material-name">
            Naam
            <Input
              id="material-name"
              value={title}
              maxLength={500}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label htmlFor="material-body">
            {source?.kind === "audit" ? "Te onderzoeken auditdekking" : "Norm"}
            <Textarea
              id="material-body"
              value={body}
              maxLength={10000}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label htmlFor="material-relevance">
            Waarom relevant?
            <Textarea
              id="material-relevance"
              value={rationale}
              maxLength={10000}
              onChange={(e) => setRationale(e.target.value)}
            />
          </label>
          <label htmlFor="material-question">
            Toets- of interviewvraag
            <Textarea
              id="material-question"
              value={question}
              maxLength={10000}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <label htmlFor="material-reference">
            Artikel, paragraaf of pagina
            <Input
              id="material-reference"
              value={location}
              maxLength={1000}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <details className="material-planning">
            <summary>Toetsaanpak uitwerken</summary>
            {Object.entries({
              risk: "Risico",
              control: "Beheersmaatregel",
              procedure: "Hoe ga je dit toetsen?",
              documents: "Verwacht bewijs / documenten",
            }).map(([id, label]) => (
              <label key={id} htmlFor={"material-" + id}>
                {label}
                <Textarea
                  id={"material-" + id}
                  value={planning[id as keyof typeof planning]}
                  maxLength={10000}
                  onChange={(e) => setPlanning((v) => ({ ...v, [id]: e.target.value }))}
                />
              </label>
            ))}
          </details>
          <p>Wordt bewaard als eigen uitwerking, niet als letterlijke broninhoud.</p>
          <Button disabled={!title.trim() || !body.trim()} onClick={save}>
            Toevoegen aan onderzoek
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
