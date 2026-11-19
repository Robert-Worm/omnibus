"use client";
import {frameworkTitle} from '@/lib/framework-title.mjs';
import FoundationSourceReader from './lazy-foundation-reader';
import {useCollectionScope} from './collection-choice';
import TermHelp, {TermText} from './term-help';
import CatalogueGroups,{CatalogueFamily} from './catalogue-groups';
import DirectorySearch from './directory-search';
import CatalogueCardActions from './catalogue-card-actions';
import {CatalogueHeader,SourceChoices} from './catalogue-navigation';
import {scopeFoundationSources} from '@/lib/catalogue-directory.mjs';
import {sourceScope as scopeOfSource,sourceAudiences,audienceGroups} from '@/lib/source-scope.mjs';
import {AudienceIcons} from './audience-icons';
import CriterionSearchResults from './criterion-search-results';
import {createCatalogueSearch} from '@/lib/catalogue-search.mjs';
import {foundationSearchItems,foundationSearchScope} from '@/lib/foundation-search.mjs';
import { chooseFoundationSource, chooseFoundationItems, preparedFoundationItems, foundationSelection, sourceNarrowing } from '@/lib/foundation-workspace.mjs';
import {useState, useRef, useEffect} from 'react';
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
  Users,
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
import CatalogueTable,{CatalogueFilterBar,CatalogueViewToggle,useCatalogueView,type CatalogueColumn,type CatalogueFilter} from './catalogue-table';
import {TopicFilter} from './topic-filter';
import {topicFamilies,topicFamilyOfChoice,takeListTopic,requestViewerTopic} from '@/lib/topic-families.mjs';
import {topicalPackage as topicPackage} from '@/lib/topical-content.mjs';
import {openTopic} from '@/lib/open-topics.mjs';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogHeader,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {topicalSelection as topicSelection,chooseTopicalPoints as chooseTopicPoints} from '@/lib/topical-selection.mjs';
import {frameworkRecord,frameworkFamilies,shortDate,shortIssuer} from '@/lib/framework-register.mjs';
import type { Draft } from "@/lib/framework-types";

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
  // De volgende stap staat op elke pagina op dezelfde plek: rechts naast de paginatitel (besluit B-056).
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
        {next && <div className={viewer?'viewer-heading-actions':undefined}><Button className="workflow-next" title={next[0]==='collect'?collectionHint:undefined} onClick={() => navigate(next[0])}>{next[1]}<ArrowRight size={16} aria-hidden="true" /></Button></div>}
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
  // De aangeklikte tab licht direct op; de inhoud volgt als overgang (zie navigate in framework-editor).
  const [target,setTarget]=useState<{from:string;to:string}|null>(null);
  const shown=target&&target.from===page?target.to:page;
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
                  shown === id ||
                  (['catalogue','processes'].includes(id) && ['catalogue','processes'].includes(shown)) ||
                  (id === "reports" && shown === "reader")
                    ? "page"
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  setTarget({from:page,to:id});
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
          // Van wat moet, via wat wordt aangeraden en wat de wetenschap zegt, naar thema’s en processen (besluit beheerder 12 november 2026).
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
            id: "catalogue",
            title: "Thema of proces",
            description: "Verken praktijkinzichten en normen rond je onderwerp.",
            icon: Layers,
            action: "Verken thema’s en processen",
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
  onOpenTopic,
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
  /** Open een onderwerp als één geheel in de viewer, naast de geopende bronnen. */
  onOpenTopic?: (value: string) => void;
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
  const allowedSources=foundations.filter(source=>allows('foundation',source.id));
  const scopedSources=scopeFoundationSources(allowedSources,scope);
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
  const catalogueView=useCatalogueView(),listMode=catalogueView.list;
  // Cross-link between the two halves of one category: laws ↔ implementing frameworks.
  const otherScope=scope==='laws'?'frameworks':scope==='frameworks'?'laws':undefined;
  const crossScope=otherScope&&domain!=='all'&&!query.trim()&&filterSources(scopeFoundationSources(allowedSources,otherScope),{domain}).length>0?otherScope:undefined;
  // Kies per onderwerp (B-068, B-069). Geen eigen scherm: het onderwerp is een filter in de lijst en in de viewer.
  // De tegels staan alleen binnen de categorie van DORA en openen de lijst met dat filter.
  // Alleen families waarvan bronnen in deze verzameling zitten.
  const availableFamilies=topicFamilies.filter(family=>allowedSources.some(source=>family.isSource(source.id)));
  // Het gekozen onderwerp, als het bij een familie in deze verzameling hoort. Familie en Categorie zijn geen filters meer
  // maar groeperingen (B-079); het onderwerp is daarmee de enige keuze die bronnen samenbrengt.
  const chosenFamily=(filters:Record<string,string>)=>{const family=topicFamilyOfChoice(filters.topic||'');return family&&availableFamilies.includes(family)?family:null;};
  // De familie met onderwerpen waar wat in beeld is grotendeels uit komt (minstens de helft van wat na zoeken of filteren
  // overblijft), of waaruit je al een kader koos of opende: wie één DORA-kader kiest, krijgt de onderwerpen erbij.
  const pickedFamily=()=>availableFamilies.find(family=>wb.sourceIds.some((id:string)=>family.isSource(id))||family.sources.some(source=>foundationSelection(draft,source.id).selected>0))??null;
  const contentFamily=(context:{rows:{id:string}[];narrowed:boolean})=>{const picked=pickedFamily();if(picked)return picked;
   // Een gekozen categorie-tegel (zoals Financiële sector & DORA) versmalt ook.
   const inDomain=domain!=='all'?new Set(browseSources.map((source:{id:string})=>source.id)):null;
   const rows=inDomain?context.rows.filter(row=>inDomain.has(row.id)):context.rows;if(!(context.narrowed||inDomain)||!rows.length)return null;
   for(const family of availableFamilies){const own=rows.filter(row=>family.isSource(row.id)).length;if(own>=1&&own*2>=rows.length)return family;}
   return null;};
  const [listPreset,setListPreset]=useState<{token:number;filters:Record<string,string>}|null>(()=>{
   // Kwam je terug uit een bron waarin je een onderwerp koos of wiste? Dan volgt de lijst.
   const fromViewer=takeListTopic(),family=fromViewer&&topicFamilies.find(item=>item.id===fromViewer.family);return !fromViewer?null:{token:Date.now(),filters:(fromViewer.value&&family?{topic:fromViewer.value}:{topic:''}) as Record<string,string>};});
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
  // Dezelfde filters voor de lijst en voor de balk boven de tegels (B-074). Tegels tonen hele bronnen; Onderwerp snijdt
  // dwars door bronnen heen en vraagt daarom de lijst.
  type FilterRow={id:string;record:{issuer:string;familyTitle:string};audiences:(keyof typeof audienceGroups)[];categories:string[]};
  const [listFilters,setListFilters]=useState<Record<string,string>>({});
  const [tileFilters,setTileFilters]=useState<Record<string,string>>({});
  const sourceFilters:CatalogueFilter<FilterRow>[]=[{key:'issuer',label:'Uitgever',all:'Alle uitgevers',value:r=>[shortIssuer(r.record.issuer)]},{key:'audience',label:'Voor wie',all:'Iedereen',value:r=>r.audiences.map(a=>audienceGroups[a].label)},
         // Vervolgfilter: verschijnt zodra wat je na zoeken of filteren (Uitgever, Voor wie) ziet grotendeels uit een familie met
         // onderwerpen komt, zodra je een kader uit zo'n familie koos of opende, en blijft staan als er een onderwerp gekozen is
         // (B-077, B-079, B-080). Anders blijft het weg, zodat DORA niet overheerst.
         {key:'topic',label:'Onderwerp',all:'Alle onderwerpen',needsList:true,
          // Een onderwerp is zelf de selectie. Het wist de zoekterm; Uitgever en Voor wie blijven staan (B-079).
          apply:(value,f):Record<string,string>=>{const family=topicFamilyOfChoice(value);if(!value||!family)return {...f,topic:''};if(query)setQuery('');return {...f,topic:value};},when:(f,context)=>Boolean(chosenFamily(f)||contentFamily(context)),value:()=>[],
          match:(r,value)=>{const family=topicFamilyOfChoice(value);return !family||!availableFamilies.includes(family)||family.normIds(r.id,value).length>0;},
          render:(value,set,context)=>{const family=chosenFamily({topic:value})||contentFamily(context);return family?<TopicFilter family={family} value={family.owns(value)?value:''} onChange={set} showValue={false} jumps={!listMode}
           onOpen={()=>prepareSources(family.sources.map(source=>source.id).filter(id=>allowedSources.some(own=>own.id===id)),()=>{})}/>:null;}}];
  const filterRow=(source:{id:string}):FilterRow=>({id:source.id,record:frameworkRecord(source.id),audiences:sourceAudiences(source.id) as (keyof typeof audienceGroups)[],
   categories:Object.values(sourceDomains).filter(d=>(d as {ids:string[]}).ids.includes(source.id)).map(d=>(d as {title:string}).title)});
  // Filters uit de balk boven de tegels versmallen de tegels, behalve filters die de lijst vragen.
  const tileActive=!listMode&&catalogueView.available?sourceFilters.filter(f=>!f.needsList&&tileFilters[f.key]):[];
  const tilePass=(source:{id:string})=>{if(!tileActive.length)return true;const row=filterRow(source);return tileActive.every(f=>f.match?f.match(row,tileFilters[f.key]):f.value(row).includes(tileFilters[f.key]));};
  // Een filter dat de lijst vraagt: de lijst opent met die keuze en de focus gaat mee naar dezelfde knop.
  const jumpToList=(key:string,value:string)=>{const family=key==='topic'?topicFamilyOfChoice(value):null;if(family&&query)setQuery('');
   // Het lijstfilter neemt alleen wat het meekrijgt over; een lege waarde wist het.
   setListPreset({token:Date.now(),filters:{...tileFilters,[key]:value}});catalogueView.setMode('list');
   window.setTimeout(()=>document.querySelector<HTMLElement>('.foundation-catalogue .topic-filter-tool')?.focus(),80);};
  // Zoeken blijft binnen de filters, ook voor treffers in normen.
  const search=searchCatalogue(query,browseSources.filter(tilePass).map(s=>s.id));
  const filtered: typeof foundations = (query.trim() ? search.sources : browseSources).filter(tilePass);
  const showList=Boolean(directoryGroup||query.trim()||processId||kind!=='all'||selectedOnly||tileActive.length);
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
  // Lijstweergave: alle wetten en kaders in één tabel, met familie, uitgever en datums uit het register.
  const choiceFamily=listMode?topicFamilyOfChoice(listFilters.topic||''):null,listFamily=choiceFamily&&availableFamilies.includes(choiceFamily)?choiceFamily:null;
  const listChoice=listFamily?listFilters.topic:'';
  // Met een onderwerp staan wetten en kaders samen in de lijst: de normen van één onderwerp staan in beide.
  const scopeSources=scopeFoundationSources(allowedSources,scope==='frameworks'?'frameworks':'laws') as typeof foundations;
  const choiceIds=new Set<string>(listChoice?listFamily!.choiceSources(listChoice).map((source:{id:string})=>source.id):[]);
  const listSources=(listChoice?[...scopeSources,...allowedSources.filter(source=>choiceIds.has(source.id)&&!scopeSources.some((own:{id:string})=>own.id===source.id))]:scopeSources) as typeof foundations;
  const listSearch=listMode&&query.trim()?searchCatalogue(query,listSources.map((s:{id:string})=>s.id)):null;
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  // Met het filter Onderwerp gelden de telling en het vinkje van een bron alleen voor dat onderwerp: de lijst toont en kiest
  // dan hetzelfde als de viewer van die bron. De toetspunten per norm staan in de bron zelf, dus die laden we.
  const choicePoints=(sourceId:string):string[]|null=>{const pack=topicPackage(sourceId);if(!pack?.catalogue?.points?.length)return null;
   const norms=new Set((listFamily?listFamily.normIds(sourceId,listChoice):[]));return pack.catalogue.points.filter((point:{id:string;criterion_id:string})=>norms.has(point.criterion_id)).map((point:{id:string})=>point.id);};
  const pointsOf=(sourceId:string,normIds:string[]):string[]=>{const pack=topicPackage(sourceId),norms=new Set(normIds);return norms.size&&pack?.catalogue?.points?pack.catalogue.points.filter((point:{id:string;criterion_id:string})=>norms.has(point.criterion_id)).map((point:{id:string})=>point.id):[];};
  // Volledig en vereenvoudigd kader gaan niet samen: kiezen onder het ene laat de normen van dat onderwerp onder het andere los.
  const chooseInChoice=(value:Draft,sourceId:string,points:string[],include:boolean)=>{const next=chooseTopicPoints(value,sourceId,points,include) as Draft,other=include?pointsOf(sourceId,(listFamily?listFamily.otherRegimeNormIds(sourceId,listChoice):[])):[];return other.length?chooseTopicPoints(next,sourceId,other,false) as Draft:next;};
  const loadTopicSources=useRef(prepareSources);
  useEffect(()=>{loadTopicSources.current=prepareSources;});
  const choiceSourceKey=listChoice?listFamily!.choiceSources(listChoice).map((source:{id:string})=>source.id).filter((id:string)=>allowedSources.some(source=>source.id===id)).join('|'):'';
  useEffect(()=>{if(choiceSourceKey)loadTopicSources.current(choiceSourceKey.split('|'),()=>{});},[choiceSourceKey]);
  // Eén handeling voor het hele onderwerp: de bronnen van de toetsgrondslag (de wet, of NOREA als de keuze dat zegt) die de
  // lijst nu toont. Zoeken en andere filters tellen dus mee. Staat er voor dit onderwerp al iets uit de andere grondslag,
  // dan vraagt de app eerst of dat vervangen moet worden: beide kiezen geeft dubbele toetspunten.
  const [swap,setSwap]=useState<null|{from:string;to:string;count:number;why:string;run:()=>void}>(null);
  const topicBar=(shown:{id:string}[])=>{if(!listChoice)return null;
   const basis=listFamily!.basis(listChoice),layers=listFamily!.choiceSources(listChoice).filter((source:{id:string})=>allowedSources.some(own=>own.id===source.id)) as {id:string;laag:string;normIds:string[]}[];
   const own=layers.filter(source=>source.laag===basis&&shown.some(row=>row.id===source.id)).map(source=>({id:source.id,points:choicePoints(source.id)}));
   const other=layers.filter(source=>source.laag!==basis).map(source=>({id:source.id,points:choicePoints(source.id)}));
   const ready=own.length>0&&own.every(part=>part.points),states=own.map(part=>part.points?topicSelection(draft,part.id,part.points):null);
   const total=states.reduce((sum,state)=>sum+(state?.total||0),0),selected=states.reduce((sum,state)=>sum+(state?.selected||0),0);
   const otherSelected=other.reduce((sum,part)=>sum+(part.points?topicSelection(draft,part.id,part.points).selected:0),0);
   const choose=(include:boolean,replace:boolean)=>prepareSources([...own,...(replace?other:[])].map(part=>part.id),()=>{try{
     let next=own.reduce((value,part)=>{const points=choicePoints(part.id);if(!points)throw new Error('De toetspunten van dit onderwerp zijn nog niet geladen. Probeer het opnieuw.');return chooseInChoice(value,part.id,points,include);},draft);
     if(include&&replace)next=other.reduce((value,part)=>{const points=choicePoints(part.id);return points?chooseTopicPoints(value,part.id,points,false) as Draft:value;},next);
     onChange({...next,investigation:{...next.investigation,sourceIds:wb.sourceIds}} as Draft);setSearchError('');if(include)openTopic(listChoice);
    }catch(error){setSearchError(error instanceof Error?error.message:'Selecteren is niet gelukt.');}});
   const labels=listFamily!.labels,names=(layer:string)=>layer==='wet'?labels.law:labels.practice?.name||'';
   const what=basis==='wet'?`${own.length} ${labels.lawNoun[own.length===1?0:1]}`:labels.practice?.full||'';
   // Staat de andere laag ook in de lijst (bijvoorbeeld NOREA naast de wet), dan zegt de regel dat, zodat het aantal rijen klopt
   // met wat er staat; Kies alle kiest alleen uit de eigen laag.
   const beside=other.some(part=>shown.some(row=>row.id===part.id))?`, ${names(basis==='wet'?'praktijk':'wet')} ernaast`:'';
   return <div className="catalogue-topic-bar"><p><strong title={listFamily!.label(listChoice)}>{listFamily!.label(listChoice)}</strong><span>{what}{beside}{ready&&<> · {total} toetspunten{selected>0&&<> · {selected} gekozen</>}</>}</span></p>
    <div className="catalogue-topic-actions">
     {onOpenTopic&&<Button variant="outline" onClick={()=>onOpenTopic(listChoice)}>Open in viewer<ArrowRight size={14} aria-hidden="true"/></Button>}
     <Button disabled={disabled||!ready||!total} onClick={()=>{const include=selected<total;if(include&&otherSelected>0)setSwap({from:names(basis==='wet'?'praktijk':'wet'),to:names(basis),count:otherSelected,why:(basis==='wet'?labels.practice?.toLaw:labels.practice?.toPractice)||'',run:()=>choose(true,true)});else choose(include,false);}}>{ready&&total>0&&selected>=total?'Deselecteer':ready?`Kies alle ${total} toetspunten`:own.length?'Toetspunten tellen…':'Niets in deze lijst'}</Button>
    </div></div>;};
  const listRows=listMode?listSources.map((s:typeof foundations[number])=>{const selection=foundationSelection(draft,s.id),counts=lawCatalogueCounts(s.id),record=frameworkRecord(s.id),voor=scopeOfSource(s.id);
   const categories=Object.values(sourceDomains).filter(d=>(d as {ids:string[]}).ids.includes(s.id)).map(d=>(d as {title:string}).title);
   const scoped=Boolean(listChoice)&&listFamily!.normIds(s.id,listChoice).length>0,points=scoped?choicePoints(s.id):null,part=points?topicSelection(draft,s.id,points):null;
   const shownSelection=part||selection;
   return {id:s.id,title:frameworkTitle(s.title),opened:wb.sourceIds.includes(s.id),selected:shownSelection.selected,total:shownSelection.total,all:shownSelection.all,partial:shownSelection.partial,
    narrowed:scoped?`Alleen het onderwerp ${listFamily!.label(listChoice)}`:undefined,counting:Boolean(scoped&&!part),
    kind:scopeFoundationSources([s],'laws').length?'Wet':'Kader',kindLabel:foundationKinds[s.kind as keyof typeof foundationKinds]||'',categories,record,viaContent:false,audience:voor?.text||'',audiences:sourceAudiences(s.id) as (keyof typeof audienceGroups)[],usage:String(s.usage||''),groups:counts?.groups??0,norms:counts?.norms??0};})
   .flatMap(row=>{if(!query.trim())return [row];const q=query.trim().toLocaleLowerCase('nl');
    const own=[...row.audiences.map(a=>audienceGroups[a].label),row.title,row.kind,row.kindLabel,...row.categories,row.record.familyTitle,row.record.work,row.record.version,row.record.instrument,row.record.issuer,row.record.reference,row.audience,row.usage,shortDate(row.record.published),shortDate(row.record.effective),shortDate(row.record.applies)].join(' ').toLocaleLowerCase('nl').includes(q);
    return own?[row]:listSearch!.sources.some((s:{id:string})=>s.id===row.id)?[{...row,viaContent:true}]:[];}):[];
  type ListRow=typeof listRows[number];
  // Zachte afbreekpunten alleen in de weergave: de registertekst zelf blijft doorzoekbaar.
  const soft=(text:string)=>text.replace(/(uitvoerings|Beroeps)(?=[a-z])/g,'$1­'),glue=(text:string)=>text.replace(/ & /g,' & ');
  const listColumns:CatalogueColumn<ListRow>[]=[
   {key:'instrument',label:'Soort',width:'11.5rem',sort:r=>r.record.rank+' '+r.record.instrument,title:r=>r.record.instrument,render:r=>{const text=r.record.instrument||r.kindLabel,parts=/^(.+?)\s*\((.+)\)$/.exec(text);return text?parts?<>{soft(parts[1])}<span className="catalogue-sub">{parts[2]}</span></>:soft(text):<small>–</small>;}},
   {key:'family',label:'Familie',width:'11%',groupKey:'family',sort:r=>r.record.familyTitle,render:r=>r.record.familyTitle?<span className="catalogue-pill" data-tone={r.record.family}>{r.record.familyTitle}</span>:<small>–</small>},
   {key:'category',label:'Categorie',groupKey:'category',sort:r=>r.categories[0]||'',title:r=>r.categories.join(' · '),render:r=>r.categories.length?<><span>{glue(r.categories[0])}</span>{r.categories.length>1&&<><span className="catalogue-more" aria-hidden="true">+{r.categories.length-1} meer</span><span className="sr-only">, {r.categories.slice(1).join(', ')}</span></>}</>:<small>–</small>},
   {key:'audience',label:'Voor wie',width:'6.6rem',sort:r=>r.audiences.map(a=>audienceGroups[a].label).join(' ')||'zzz',render:r=>r.audiences.length?<AudienceIcons groups={r.audiences} text={r.audience}/>:<small>–</small>},
   {key:'effective',label:'Geldt vanaf',width:'11.2rem',sort:r=>r.record.applies||r.record.effective||r.record.published,
    title:r=>[r.record.applies&&r.record.effective?'In werking getreden op '+shortDate(r.record.effective)+', van toepassing vanaf '+shortDate(r.record.applies):'',r.record.published?'Gepubliceerd '+shortDate(r.record.published):'',r.record.reference?'Vindplaats: '+r.record.reference:''].filter(Boolean).join('. '),
    // De publicatiedatum staat in de uitleg bij aanwijzen; zo blijft elke rij één regel hoog (besluit B-058).
    render:r=>{const d=r.record.applies||r.record.effective,published=!d&&r.record.published?<span className="catalogue-sub">gepubliceerd {shortDate(r.record.published)}</span>:null;
     if(!d)return <><small title="Geen eigen datum van inwerkingtreding, bijvoorbeeld bij een handreiking">n.v.t.</small>{published}</>;
     return <><span className={d>today?'catalogue-future':undefined}>{shortDate(d)}</span>{d>today&&<span className="catalogue-sub catalogue-future-note">geldt nog niet</span>}{published}</>;}},
  ];
  return (
    <section className="catalogue-explorer foundation-catalogue">
      {!guided&&<CatalogueHeader title="Verken bronnen" description="" action={catalogueView.available&&<CatalogueViewToggle mode={catalogueView.mode} onChange={mode=>{catalogueView.setMode(mode);setPage(0);}}/>}/>}
      {!guided&&<><SourceChoices value={scope} onChange={value=>{setSourceArea(value);setDomain('');setKind('all');setProcessId('');onProcessChange?.('');setSelectedOnly(false);changeSearch('');setPage(0);}}/></>}
      {guided&&!listMode&&(catalogueView.available?<CatalogueFilterBar id="foundations-v6" rows={scopedSources.map(filterRow)} filters={sourceFilters} groups={[{key:'category'}]}
        search={{id:'foundation-search',label:'Zoek wet of kader',placeholder:'Zoek in bronnen en normen…',value:query,onChange:changeSearch}}
        onFiltersChange={filters=>{setTileFilters(filters);setPage(0);}} onNeedsList={jumpToList}/>
       :<DirectorySearch id="foundation-search" label="Zoek wet of kader" value={query} onChange={changeSearch} placeholder="Zoek in bronnen en normen…"/>)}
      {!guided&&<>
        {!listMode&&(catalogueView.available?<CatalogueFilterBar id="foundations-v6" rows={scopedSources.map(filterRow)} filters={sourceFilters} groups={[{key:'category'}]}
        search={{id:'foundation-search',label:'Zoek wet of kader',placeholder:'Zoek in bronnen en normen…',value:query,onChange:changeSearch}}
        onFiltersChange={filters=>{setTileFilters(filters);setPage(0);}} onNeedsList={jumpToList}/>
       :<DirectorySearch id="foundation-search" label="Zoek wet of kader" value={query} onChange={changeSearch} placeholder="Zoek in bronnen en normen…"/>)}
        {query.trim() && <div className="catalogue-search-tools">
          {search.suggestions.length>0 && <fieldset className="catalogue-search-suggestions"  aria-label="Zoeksuggesties">
            <span>Zoeksuggesties:</span>
            {search.suggestions.map(value=><Button key={value} variant="outline" onClick={()=>{
              changeSearch(value);document.getElementById('foundation-search')?.focus();
            }}>{value}</Button>)}
          </fieldset>}
        </div>}
      </>}
      {listMode&&<CatalogueTable id="foundations-v6" defaultSort="title" noun={listChoice?['bron','bronnen']:scope==='frameworks'?['kader','kaders']:['wet','wetten']} unit={['toetspunt','toetspunten']} preset={listPreset||undefined}
        search={{id:'foundation-search',label:'Zoek wet of kader',placeholder:'Zoek in bronnen en normen…',value:query,onChange:changeSearch}} rows={listRows} columns={listColumns} searching={Boolean(query.trim())} disabled={disabled}
        filters={sourceFilters}
        groups={[{key:'category',label:'Categorie',plural:'categorieën',value:r=>r.categories[0]||''},{key:'family',label:'Familie',plural:'families',value:r=>r.record.familyTitle,describe:name=>Object.values(frameworkFamilies).find(f=>f.title===name)?.description||''}]}
        nameLabel={listChoice?'Bron':scope==='frameworks'?'Kader':'Wet'} nameMeta={r=><>{r.record.work&&<span className="catalogue-id" title={'Vaste ID van deze bron'+(r.record.reference?'. Vindplaats: '+r.record.reference:'')}>{r.record.work}{r.record.version&&' · versie '+r.record.version}</span>}{r.record.issuer&&<span title={'Uitgever: '+r.record.issuer}>{shortIssuer(r.record.issuer)}</span>}{r.viaContent&&<span className="catalogue-hit">gevonden in de normtekst</span>}</>}
        describe={r=>r.usage||r.audience||null} countLabel="Gekozen toetspunten" hint={listChoice?'':`Een vinkje kiest alle toetspunten van ${scope==='frameworks'?'dat kader':'die wet'}. Open ${scope==='frameworks'?'het kader':'de wet'} om er een paar te kiezen.`} selectLabel={r=>`Kies alle ${r.total} toetspunten van ${r.title}`}
        onOpen={(id,filters)=>{if(topicFamilyOfChoice(filters.topic||'')?.isSource(id))requestViewerTopic(id,filters.topic);if(!wb.sourceIds.includes(id))toggle(id,true);onCriteria(id);}}
        onFiltersChange={filters=>{setListFilters(filters);if(listPreset&&(filters.topic||'')===(listPreset.filters.topic||''))setListPreset(null);}}
        onSelect={(ids,checked)=>{
          // Met een onderwerp: staat er al iets uit de andere toetsgrondslag (wet of praktijkkader), dan eerst de vraag of
          // dat vervangen moet worden, net als bij "Kies alle". Beide kiezen geeft dubbele toetspunten.
          const layers=listFamily?listFamily.choiceSources(listChoice).filter(source=>allowedSources.some(own=>own.id===source.id)):[];
          const tickedLayers=new Set(layers.filter(source=>ids.includes(source.id)).map(source=>source.laag)),layer=tickedLayers.size===1?[...tickedLayers][0]:'';
          const other=layer?layers.filter(source=>source.laag!==layer).map(source=>({id:source.id,points:choicePoints(source.id)})):[];
          const otherSelected=other.reduce((sum,part)=>sum+(part.points?topicSelection(draft,part.id,part.points).selected:0),0);
          const run=(replace:boolean)=>prepareSources([...ids,...(replace?other.map(part=>part.id):[])],()=>{try{let next=ids.reduce((value,id)=>{
          // Staat het onderwerpfilter aan, dan kiest het vinkje alleen de toetspunten van dat onderwerp.
          const inChoice=Boolean(listChoice)&&listFamily!.normIds(id,listChoice).length>0,points=inChoice?choicePoints(id):null;
          if(inChoice&&!points)throw new Error('De toetspunten van dit onderwerp zijn nog niet geladen. Probeer het opnieuw.');
          return (points?chooseInChoice(value,id,points,checked):chooseFoundationSource(value,id,checked)) as Draft;},draft);
           if(replace)next=other.reduce((value,part)=>{const points=choicePoints(part.id);return points?chooseTopicPoints(value,part.id,points,false) as Draft:value;},next);
           onChange({...next,investigation:{...next.investigation,sourceIds:wb.sourceIds}} as Draft);setSearchError('');}catch(error){setSearchError(error instanceof Error?error.message:'Selecteren is niet gelukt.');}});
          const labels=listFamily?.labels;
          if(checked&&otherSelected>0&&labels?.practice)setSwap({from:layer==='wet'?labels.practice.name:labels.law,to:layer==='wet'?labels.law:labels.practice.name,count:otherSelected,why:layer==='wet'?labels.practice.toLaw:labels.practice.toPractice,run:()=>run(true)});
          else run(false);}}
        banner={topicBar} empty={<p>Geen wet of kader gevonden. Wis je zoekopdracht of pas de filters aan.</p>}/>}
      {listMode&&searchError&&<p role="alert">{searchError}</p>}
      <AlertDialog open={Boolean(swap)} onOpenChange={open=>{if(!open)setSwap(null);}}>
        <AlertDialogContent className="project-utility-dialog">
          <AlertDialogHeader className="project-utility-header"><div><AlertDialogTitle>Vervangen door {swap?.to}?</AlertDialogTitle>
            <AlertDialogDescription>Je hebt voor dit onderwerp al {swap?.count} toetspunten uit {swap?.from} gekozen. {swap?.why}; beide kiezen geeft dubbele toetspunten.</AlertDialogDescription></div></AlertDialogHeader>
          <AlertDialogFooter className="project-utility-footer"><AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={()=>{swap?.run();setSwap(null);}}>Vervang door {swap?.to}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!listMode&&<CatalogueGroups hideTitle compact={guided} query={query} noun="bronnen" value={directoryGroup} searching={Boolean(query.trim())} filtered={tileActive.length>0}
        groups={Object.entries(sourceDomains).map(([id,d])=>({id,title:d.title,count:filterSources(scopedSources,{domain:id}).length}))}
        onChange={id=>{setDomain(id);setKind('all');setProcessId('');onProcessChange?.('');setSelectedOnly(false);changeSearch('');}}/>}
      {!listMode&&showList&&<>
      {searchError && <p role="alert">{searchError}</p>}
      {query.trim() && <h2>Wetten &amp; kaders <small>({filtered.length})</small></h2>}
      {search.sourceCorrections.length>0 && <p className="creator-help">Vergelijkbare bronnen voor: {search.sourceCorrections.join(' / ')}. Je zoekopdracht is niet gewijzigd.</p>}
      <CatalogueFamily noun="bronnen" groupId={domain} title={sourceDomains[domain as keyof typeof sourceDomains]?.title||'Wetten & kaders'}
        action={crossScope&&<button type="button" onClick={()=>{setSourceArea(crossScope);setPage(0);}}>{crossScope==='frameworks'?'Wil je de uitvoeringskaders zien? Klik hier':'Wil je de wetgeving zien? Klik hier'}<ArrowRight size={14} aria-hidden="true"/></button>}>
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
                  {frameworkTitle(s.title)}
                </button>
                </h4>
                {scopeOfSource(s.id)&&<p className="catalogue-card-scope"><Users size={14} aria-hidden="true"/><span>Voor: <strong>{scopeOfSource(s.id)!.text}</strong>{scopeOfSource(s.id)!.role==='toezichthouder'&&<em className="catalogue-card-role"> · onderzoek bij een toezichthouder</em>}</span></p>}
                <p>{s.usage}</p>
                {search.contextSourceIds.includes(s.id) && <span className="source-meta">Gevonden via normen in deze bron</span>}
                <div className="catalogue-card-stats">{lawCounts?<><span><strong>{lawCounts.groups}</strong> {lawCounts.groups===1?'groep':'groepen'}</span><span><strong>{lawCounts.norms}</strong> {lawCounts.norms===1?'norm':'normen'}</span><span><strong>{selection.total}</strong> selecteerbare toetspunten</span></>:<><span><strong>{selection.total}</strong> {s.kind==='audit'?'dekkingspunten':'toetspunten'}</span><span><strong>{sourceNarrowing(s.id).count}</strong> {sourceNarrowing(s.id).label}</span></>}<span className="catalogue-card-selected"><strong>{selection.selected}</strong> {s.kind==='audit'&&!lawCounts?'dekkingspunten':'toetspunten'} gekozen</span></div>
              </div>
              <CatalogueCardActions layout="buttons" title={frameworkTitle(s.title)} opened={wb.sourceIds.includes(s.id)} disabled={disabled} onPrepare={()=>onPrepareSource?.(s.id)}
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
      <p className="directory-note"><TermText text="Controleer altijd de oorspronkelijke bron en of die voor jouw organisatie geldt. Een gekozen norm is nog geen oordeel over naleving."/></p>
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
