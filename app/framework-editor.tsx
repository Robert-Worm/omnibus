"use client";
import {countLabel} from '@/lib/display-count.mjs';
import { linkNewSelections } from "@/lib/research-proposals.mjs";
import {focusWorkflowHeading} from '@/lib/workflow-focus.mjs';
import {collectionDestination,rememberCollectionPage} from '@/lib/collection-start.mjs';
import "./investigation.css";
import FoundationWorkspace from "./foundation-workspace";
import CollectionChoice,{CollectionContext} from './collection-choice';
import {availableCollections} from '@/lib/application-catalogue.mjs';
import {collectionAllows,collectionViews,bindCollectionPreference,assertProjectCollections,type CollectionPreference} from '@/lib/source-collections.mjs';
import DiscoveryCatalogue,{emptyDirectoryView} from './discovery-catalogue';
import {chooseCatalogueItems} from '@/lib/catalogue-selection.mjs';
import {relatedQuestionThemes} from '@/lib/discovery-navigation.mjs';
import {addOpenModel,removeOpenModel,normalizeOpenModelIds} from '@/lib/open-models.mjs';
import {ResearchEntry} from './research-entry';
import './research-entry.css';
import ProjectNotice from './project-notice';
import WorkflowHelp, {type ExportGuideStatus, type GuideAction} from './workflow-help';
import {AppearanceToggle, ShareProject, ProjectUtilityContent} from './project-utilities';
import {AiConnection} from './ai-connection';
import {modelAdoptionPlan,applyModelAdoption,syncModelLibrarySelection} from '@/lib/model-adoption.mjs';
import {download} from '@/lib/browser-download.mjs';
import {newProject,clearProjectBrowsePreferences} from '@/lib/new-project.mjs';
import ProductFooter from './product-footer';
import { useCallback, useEffect, useEffectEvent, useRef, useState, useMemo, useSyncExternalStore } from "react";
import {createProjectStatus} from '@/lib/project-status.mjs';
import {createBackgroundProjectSave} from '@/lib/background-project-save.mjs';
import {createProjectEncoder} from './project-encoder';
import {
  InvestigationNavigation,
  CollectionNavigation,
  InvestigationStart,
  FoundationCatalogue,
  MaterialEditor,
} from "./investigation-workspace";
import { investigationFramework, prepareInvestigationFramework, foundations, foundationProposals, validateInvestigation } from "@/lib/investigation.mjs";
import {admittedMaterialTarget} from '@/lib/admitted-foundation.mjs';
import AdmittedLawBrowser from './admitted-law-browser';
import { flushSync } from "react-dom";
import { BookOpen, Download, FolderOpen, FilePlus2, ArrowRight, Link2, PencilLine, X, Save, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {Dialog,DialogClose} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogHeader,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import { Checkbox } from "@/components/ui/checkbox";

import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import CompactMatrix from "./compact-matrix";
import ReportNormBrowser from './report-norm-browser';
import ReportFrameworkAbout from './report-framework-about';
import { cleanScopeDraft, admittedLines } from "@/lib/product-scope.mjs";
import {makeProject,readProject,acceptProjectFile,projectView,guardedProjectStore,projectContentEqual,PROJECT_KEY,MAX_PROJECT_BYTES,type Project} from '@/lib/project-session.mjs';
import {expandProject} from '@/lib/project-codec.mjs';
import {readProjectInBackground} from './project-reader';
import {downloadFile,useFileDownload} from './file-download';
import {catalogueRevision,onCatalogueChange,catalogueReady,ensureCatalogue,prefetchCatalogue} from '@/lib/catalogue-runtime.mjs';
import {baseFramework,getPreviousFrameworks,corpus,legacyThemes,discoveryViews,themes,reportViews,workspaces,catalogueRouting,projectCatalogueKeys} from '@/lib/application-catalogue.mjs';
import {reportContentKeys} from '@/lib/report-loading.mjs';
import {reportOverviewKey,reportOverviewCatalogue} from '@/lib/report-overviews.mjs';
import {foundationSearchKeys} from '@/lib/foundation-search.mjs';
import {foundationOverviewKey} from '@/lib/foundation-overviews.mjs';
import {modelDirectory,modelDirectoryKey,publishedModelDirectory} from '@/lib/model-directory.mjs';
import {modelContentKeys,projectModelIds} from '@/lib/model-loading.mjs';
import {
  chooseReport,
  reportEnabled,
  browseThemeLines,
  reportNormImpact,
} from "@/lib/report-choices.mjs";
import { normId, classification, subjects } from "@/lib/norm-navigation.mjs";
import ResearchBuilder from "./research-builder";
import { recordRecovery } from "@/lib/recovery-history.mjs";
import { personalDraft } from "@/lib/research-flow.mjs";
import { ThemeCatalogue, OpenThemes, ReportCatalogue, type Theme } from "./workspace-catalogues";
import SourceControlReference from "./source-control-reference";
import ExcelExport from "./lazy-export";
import ModelLibrary, { type ModelLibraryState } from "./model-library";
import { initialModelLibrary, restoreModelLibrary } from "@/lib/model-library.mjs";
import { workspaceRoute } from "@/lib/workspace-view.mjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {assertNoRemovedReportContent} from '@/lib/removed-report-content.mjs';
import {
  upgradeDraft,
  reportForEvidence,
  reportForLine,
  selectedReportIds,
} from "@/lib/corpus-model.mjs";
import type { Framework, Draft, Evidence, Line } from "@/lib/framework-types";
import { labels, basisLabels, statusLabels, baselineId, emptyDraft, initialDraft, prepareInitialDraft, isEdited, updateValue, draftValue } from "@/lib/framework-model.mjs";
import { createFrameworkTools, registerFrameworkTools } from "@/lib/framework-tools.mjs";
import FrameworkStructure from "./framework-structure";
import FrameworkFields from "./framework-fields";
import ControlObjectivePilot from './control-objective-pilot';
import {CioPointViewer} from './cio-law-browser';
import TopicalLawBrowser from './topical-law-browser';
import {WwkePointViewer} from './wwke-law-browser';
import {buildingBlockViewer} from '@/lib/building-block-viewer.mjs';
import reportPointCatalogue from '@/lib/report-point-catalogue.mjs';
import {selectReportRows} from '@/lib/report-point-adapter.mjs';
import {reportPointCounts} from '@/lib/report-point-counts.mjs';
import DeferredDetails from './deferred-details';
import LazyReportLibrary from "./lazy-report-library";
import EvidenceLinks, { EvidenceDisplayContext } from "./evidence-links";
import { referenceLabel, roleLabels } from "@/lib/report-reader.mjs";
import {lineEvidenceView} from '@/lib/evidence-presentation.mjs';
import {
  sourceRelations,
  validateSourceItems,
} from "@/lib/framework-source-items.mjs";

import {
  restoreWorkspace,
  openTheme,
  closeTheme,
  workspaceReportIds,
} from "@/lib/theme-workspaces.mjs";
import {activeReportFrameworks} from '@/lib/catalogue-retirement.mjs';
const workspaceKey = "rijksmap-open-themes-v425";
validateSourceItems(baseFramework);
const names: Record<string, string> = labels;
const provenance: Record<string, string> = basisLabels;
const statuses: Record<string, string> = statusLabels;
const storageKey = "rijksmap-framework-v425-structure-" + baselineId(baseFramework);
function previousStoredDraft() {
  for(const framework of getPreviousFrameworks()){
    const raw=localStorage.getItem("rijksmap-framework-v425-structure-"+baselineId(framework));
    if(raw!==null)return raw;
  }
  return null;
}
const restoreOptions = {
  collections:availableCollections,
  restoreDraft:(value:unknown) => {
    assertNoRemovedReportContent(value);
    const restored=personalDraft(upgradeDraft(value,baseFramework,baseFramework,getPreviousFrameworks),baseFramework) as Draft;
    return cleanScopeDraft(investigationFramework(baseFramework,restored),restored).draft as Draft;
  },
  restoreModels:restoreModelLibrary,
  themes:workspaces,
};

export default function FrameworkEditor() {
  const [collections,setCollections]=useState<CollectionPreference>(()=>bindCollectionPreference({mode:'both',origins:[]},availableCollections));
  const allows=(kind:'report'|'foundation'|'model',id:string)=>collectionAllows(availableCollections,collections.mode,kind,id);
  // Each catalogue publication supplies a current framework snapshot. Derived
  // framework data follows that snapshot instead of an implicit global read.
  const [catalogueSnapshot,setCatalogueSnapshot]=useState(()=>({revision:catalogueRevision(),framework:baseFramework,workspaces,pointCatalogue:reportPointCatalogue,discoveryViews,legacyThemes}));
  const [contentNotice,setContentNotice]=useState('');
  const [contentFailure,setContentFailure]=useState(false);
  const contentAction=useRef<null|(()=>void)>(null);
  const contentRequest=useRef(0);
  useEffect(()=>onCatalogueChange(()=>setCatalogueSnapshot({revision:catalogueRevision(),framework:baseFramework,workspaces,pointCatalogue:reportPointCatalogue,discoveryViews,legacyThemes})),[]);
  function withContent(keys:string[], action:()=>void) {
    const request=++contentRequest.current;
    if(catalogueReady(keys)){setContentNotice('');setContentFailure(false);action();return;}
    setContentNotice('Onderdeel laden… Je onderzoek en selecties blijven behouden.');setContentFailure(false);
    contentAction.current=()=>withContent(keys,action);
    void ensureCatalogue(keys).then(()=>{
      if(request!==contentRequest.current)return;
      setContentNotice('');setContentFailure(false);contentAction.current=null;action();
    }).catch(error=>{
      if(request!==contentRequest.current)return;
      setContentNotice((error instanceof Error?error.message:'Laden is niet gelukt.')+' Je onderzoek en selecties zijn behouden.');setContentFailure(true);
    });
  }
  const [modelLibrary, setModelLibrary] = useState<ModelLibraryState>(() => initialModelLibrary());
  const publishedModels=publishedModelDirectory();
  const modelDirectoryEntries=useMemo(()=>modelDirectory(modelLibrary,publishedModels),[modelLibrary,publishedModels]);
  const [modelsReady, setModelsReady] = useState(false);
  const [exportOpened,setExportOpened]=useState(false);
  const [modelError, setModelError] = useState("");
  function prepareModelLibrary(ids:string[]=[]) {
    const current=projectRef.current.modelLibrary,known=new Set([...current.models.map(m=>m.id),...ids]);
    const catalogue=initialModelLibrary([...known]);
    if(catalogue.models.every(seed=>current.models.some(model=>model.id===seed.id)))return;
    const next=restoreModelLibrary(current,catalogue);
    projectRef.current={...projectRef.current,modelLibrary:next};setModelLibrary(next);
  }
  function changeModels(value: ModelLibraryState) {
    if (!modelsReady) return;
    const clean = restoreModelLibrary(value);
    const next = syncModelLibrarySelection(draftRef.current,projectRef.current.modelLibrary,clean) as Draft;
    rememberProject('Model wijzigen');
    setModelLibrary(clean);
    projectRef.current={...projectRef.current,modelLibrary:clean};
    commit(next,'Modelkeuze wijzigen',false);
  }
  const [scopeNotice, setScopeNotice] = useState("");
  const [draftState, setDraftState] = useState<{
    draft: Draft;
    prepared?: {base: Framework; revision: number; framework: Framework};
  }>(
    () => ({draft: personalDraft(
        {
          ...initialDraft(baseFramework),
          included: [],
          investigation: validateInvestigation(undefined),
        },
        baseFramework,
      ) as Draft}),
  );
  const {draft,prepared:preparedView} = draftState;
  const investigation = draft.investigation;
  // The commit already prepared and checked these rows. Keep that view with
  // its immutable draft, never in a saved project or across a publication.
  const framework = useMemo(
    () => preparedView?.base===catalogueSnapshot.framework && preparedView.revision===catalogueSnapshot.revision
      ? preparedView.framework
      : investigationFramework(catalogueSnapshot.framework, { investigation }) as Framework,
    [investigation,catalogueSnapshot,preparedView],
  );
  const [ownMaterialOpen, setOwnMaterialOpen] = useState(false);
  const [sourceProcess, setSourceProcess] = useState("");
  const draftRef = useRef(draft);
  // Chronological recovery: later edits are undone before the reset, never overwritten.
  const recoveryRef = useRef<{draft: Project; label: string}[]>([]);
  const typingRecoveryRef = useRef<Element | null>(null);
  const [recovery, setRecovery] = useState<{draft: Project; label: string}[]>([]);
  const [builderGeneration, setBuilderGeneration] = useState(0);
  const [resetNotice, setResetNotice] = useState("");
  const [newProjectOpen,setNewProjectOpen] = useState(false);
  const [pendingGuideQuestion, setPendingGuideQuestion] = useState(false);
  const [exportGuideStatus, setExportGuideStatus] = useState<ExportGuideStatus | null>(null);
  const cancelNewProjectRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(
    () => admittedLines(framework)[0]?.id ?? framework.lines[0]?.id ?? '',
  );
  const [reveal, setReveal] = useState<{ id: string; nonce: number }>();
  const revealCounter = useRef(0);
  const [tab, setTab] = useState("framework");
  const [aboutViews,setAboutViews]=useState(()=>projectView().aboutViews);
  const [detail, setDetail] = useState("chain");
  const [page, setPage] = useState("entry");
  const [lastCollectionPage,setLastCollectionPage]=useState('');
  const [researchRoute,setResearchRoute]=useState('');
  const [discoveryView,setDiscoveryView]=useState<{axis:'themes'|'processes';category:string}>({axis:'themes',category:''});
  const [directoryViews,setDirectoryViews]=useState({themes:emptyDirectoryView(),processes:emptyDirectoryView()});
  const [catalogueGroups,setCatalogueGroups]=useState({models:'',foundations:''});
  const [riskArea,setRiskArea]=useState<'themes'|'processes'|'laws'|'frameworks'|'models'>('themes');
  const [riskBrowseGeneration,setRiskBrowseGeneration]=useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [workspace, setWorkspace] = useState<{ openIds: string[]; activeId: string | null }>(() =>
    restoreWorkspace(null, workspaces),
  );
  const [reportScope, setReportScope] = useState<"open" | "audit" | "all">("all");
  const [reportEntry, setReportEntry] = useState(0);
  const activeTheme = workspaces.find((t) => t.id === workspace.activeId);
  const activeReportView=reportViews.find(t=>t.id===workspace.activeId);
  const [reportViewReset,setReportViewReset]=useState(0);
  const [browseMode, setBrowseMode] = useState({ combined: false });
  const combinedView = browseMode.combined && workspace.openIds.length > 1;
  const browseThemes = useMemo(()=>collectionViews(catalogueSnapshot.workspaces,availableCollections,collections.mode,catalogueRouting.reports).filter((t) =>
    combinedView ? workspace.openIds.includes(t.id) : t.id === workspace.activeId,
  ),[combinedView,workspace,catalogueSnapshot,collections.mode]);
  const questionThemes = useMemo(()=>relatedQuestionThemes(workspace.openIds,catalogueSnapshot.discoveryViews,catalogueSnapshot.legacyThemes),
    [workspace.openIds,catalogueSnapshot]);
  const browseKey = combinedView ? "all-open-themes" : (activeTheme?.id ?? page);
  const [reportChoices, setReportChoices] = useState({ excluded: [] as string[] });
  const choicesReady = modelsReady;
  const [modelView,setModelView] = useState({activeModel:'',modelDimension:'',modelQuery:''});
  const [openModelIds,setOpenModelIds]=useState<string[]>([]);
  const [choiceThemeId, setChoiceThemeId] = useState<string | null>(null);
  const [foundationFocus, setFoundationFocus] = useState("");
  const [foundationCriterion,setFoundationCriterion] = useState("");
  const [catalogueSearch,setCatalogueSearch] = useState("");
  const [foundationBrowse,setFoundationBrowse] = useState(()=>projectView().foundationBrowse);
  const changeFoundationBrowse = useCallback((value: typeof foundationBrowse) => {
    setFoundationBrowse(value);setFoundationFocus(value.sourceId);setFoundationCriterion('');
  }, []);
  const [foundationCatalogueScope,setFoundationCatalogueScope] = useState<'laws'|'frameworks'>('laws');
  const choiceTheme = workspaces.find(
    (t) => workspace.openIds.includes(t.id) && t.id === (choiceThemeId ?? workspace.activeId),
  );
  const hiddenReportCount =
    activeTheme?.reportIds.filter(
      (id) => !reportEnabled(reportChoices.excluded, activeTheme.id, id),
    ).length ?? 0;
  const [reportNotice, setReportNotice] = useState("");
  const reportIds = workspaceReportIds(workspace, workspaces);
  const auditReportIds = useMemo(()=>selectedReportIds(framework, draft),[framework,draft]);
  const [readerId, setReaderId] = useState(corpus[0]?.framework.report.id ?? "");
  const reader = corpus.find((c) => c.framework.report.id === readerId)!;
  const [projectStatus] = useState(createProjectStatus);
  const {problem,message,savedLocally} = useSyncExternalStore(projectStatus.subscribe,projectStatus.getSnapshot,projectStatus.getSnapshot);
  const {setProblem,setMessage,setSavedLocally} = projectStatus;
  const [importFeedback, setImportFeedback] = useState("");
  const [adoptingModel,setAdoptingModel]=useState('');
  const [adoptionError,setAdoptionError]=useState('');
  const [adoptionChoices,setAdoptionChoices]=useState<Record<string,{mode:string;targetId:string}>>({});
  const pendingModel=modelLibrary.models.find(m=>m.id===adoptingModel);
  const adoptionPlan: {incoming:Record<string,string>;candidates:Record<string,string>[];identicalId:string}[]=pendingModel ? modelAdoptionPlan(draft,pendingModel) : [];
  const [reportPage, setReportPage] = useState(1);
  const [reportEvidence, setReportEvidence] = useState<string | null>(null);
  const [returnPage, setReturnPage] = useState("topics");
  const [loaded, setLoaded] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importRequest=useRef(0);
  const evidenceRef = useRef<HTMLElement>(null);
  const editable = page === "framework";
  const overview = useMemo(()=>reportOverviewCatalogue(browseThemes.flatMap(theme=>theme.reportIds)),[browseThemes]);
  // Overview rows are display-only and use original text, not an all-source
  // selection. Keep full admission for the editable workspace and legacy rows;
  // overview selection still hydrates and validates its real source in commit.
  const sourceViews = useMemo(()=>{
    const display={admitted:[], draft:emptyDraft(framework)};
    let checked:ReturnType<typeof prepareInitialDraft>;
    // A later visit to the builder prepares once. Returning to it reuses the
    // result until this immutable framework (including publication) changes.
    return {display, checked:()=>checked??=prepareInitialDraft(framework)};
  },[framework]);
  const {admitted, draft:sourceDraft} = overview && !editable ? sourceViews.display : sourceViews.checked();
  const browseSourceLines = overview?.lines ?? admitted;
  const allBrowseLines = useMemo(()=>browseThemeLines(framework,browseThemes,[],browseSourceLines) as Line[],[framework,browseThemes,browseSourceLines]);
  const browseLines = useMemo(()=>browseThemeLines(framework,browseThemes,reportChoices.excluded,browseSourceLines) as Line[],[framework,browseThemes,reportChoices.excluded,browseSourceLines]);
  const hiddenBrowseNorms = allBrowseLines.length-browseLines.length;
  const visibleLines = useMemo(()=>editable?admitted.filter(l=>draft.included.includes(l.id)):browseLines,[editable,admitted,draft.included,browseLines]);
  // Closed detail panels need no fallback report or embedded pilot norm.
  const line = visibleLines.find((l) => l.id === selected) ?? visibleLines[0] ?? framework.lines[0];
  const lineReport = line ? reportForLine(framework, line) : framework.report;
  const viewDraft = editable ? draft : sourceDraft;
  const evidenceView = useMemo(()=>line ? lineEvidenceView(framework,line,activeEvidence) : {direct:[],context:[],remaining:[],focused:null},[framework,line,activeEvidence]);
  const sourceEntries = evidenceView.direct;
  const projectRef = useRef<Project>(makeProject(draft,modelLibrary,workspace));
  const fileDownload=useFileDownload();
  function downloadProject(name:string) {
    void downloadFile({kind:'project',project:projectRef.current},name,'application/json');
  }
  const storeRef = useRef<ReturnType<typeof guardedProjectStore> | null>(null);
  const storageBlocked = useRef(false);
  const backgroundSave=useRef<ReturnType<typeof createBackgroundProjectSave<Project>>|null>(null);
  const [recoveryOriginal,setRecoveryOriginal] = useState('');
  const [reloadOpen,setReloadOpen] = useState(false);
  const [storageHelpOpen,setStorageHelpOpen] = useState(false);
  const [backupConfirmed,setBackupConfirmed] = useState(false);
  const [resumeOriginal,setResumeOriginal] = useState<string|null>(null);
  const resumeStoreRef = useRef<ReturnType<typeof guardedProjectStore>|null>(null);
  const saveProject = useCallback((project:Project) => {
    backgroundSave.current?.cancel();
    if(storageBlocked.current || !storeRef.current)return false;
    try {
      storeRef.current.save(project);
      projectStatus.update({savedLocally:true,problem:false,message:'Project lokaal opgeslagen. Bewaar project voor een overdraagbare reservekopie.'});
      return true;
    } catch(e) {
      storageBlocked.current=true;
      projectStatus.update({problem:true,message:(e instanceof Error ? e.message : 'Automatisch bewaren is niet gelukt.')+' Uw werk blijft in deze sessie beschikbaar: kies Bewaar project.'});
      return false;
    }
  }, [projectStatus]);
  useEffect(()=>{
    const encoder=createProjectEncoder();
    const saver=createBackgroundProjectSave<Project>({
      encode:project=>encoder.encode(project),
      write:text=>{
        if(storageBlocked.current||!storeRef.current)throw Error('Automatisch bewaren is onderbroken.');
        storeRef.current.saveSerialized(text);
      },
      onPending:()=>projectStatus.update({savedLocally:false}),
      onSaved:()=>projectStatus.update({savedLocally:true,problem:false,message:'Project lokaal opgeslagen. Bewaar project voor een overdraagbare reservekopie.'}),
      onError:error=>{
        storageBlocked.current=true;
        projectStatus.update({savedLocally:false,problem:true,message:(error instanceof Error?error.message:'Automatisch bewaren is niet gelukt.')+' Uw werk blijft in deze sessie beschikbaar: kies Bewaar project.'});
      },
    });
    backgroundSave.current=saver;
    return ()=>{saver.dispose();encoder.dispose();backgroundSave.current=null;};
  },[projectStatus]);
  function rememberProject(label:string) {
    const active=document.activeElement;
    const typing=active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
    const merge=typing && active===typingRecoveryRef.current && recoveryRef.current.at(-1)?.label===label;
    recoveryRef.current=recordRecovery(recoveryRef.current,projectRef.current,label,merge);
    typingRecoveryRef.current=typing ? active : null;
    setRecovery(recoveryRef.current);
  }
  function openStorageHelp() {
    setBackupConfirmed(false);
    try {
      // Capture the stored revision now; a later change by another tab still blocks saving.
      resumeStoreRef.current=guardedProjectStore(localStorage);
      setResumeOriginal(resumeStoreRef.current.raw());
    } catch { resumeStoreRef.current=null; setResumeOriginal(null); }
    setStorageHelpOpen(true);
  }
  function resumeSaving() {
    if(!backupConfirmed || !resumeStoreRef.current)return;
    backgroundSave.current?.cancel();
    try {
      // Explicit replacement, only after the auditor confirms an external backup.
      // Do not require another local copy: a full browser store may be the cause.
      resumeStoreRef.current.save(projectRef.current);
      setSavedLocally(true);
      storeRef.current=resumeStoreRef.current;
      storageBlocked.current=false;setProblem(false);setRecoveryOriginal('');
      setStorageHelpOpen(false);setScopeNotice('');
      setResetNotice('Uw huidige werk is opgeslagen. Automatisch bewaren is weer ingeschakeld.');
    } catch(e) {
      storageBlocked.current=true;setProblem(true);
      setMessage((e instanceof Error ? e.message : 'Opslaan is niet gelukt.')+' Bewaar uw huidige werk als projectbestand voordat u herlaadt.');
    }
  }
  function applyProject(project:Project, resume=true) {
    setDirectoryViews({themes:emptyDirectoryView(),processes:emptyDirectoryView()});
    setCatalogueGroups({models:'',foundations:''});
    setRiskArea(project.view.discoveryAxis);
    projectRef.current=project;
    draftRef.current=project.draft;
    setDraftState({draft:project.draft});setModelLibrary(project.modelLibrary);setWorkspace(project.workspace);
    setAboutViews(project.view.aboutViews);
    setCollections(bindCollectionPreference(project.collections,availableCollections));
    setLastCollectionPage(project.view.lastCollectionPage);
    setOpenModelIds(normalizeOpenModelIds(project.view.openModelIds,project.modelLibrary.models));
    setResearchRoute(project.view.researchRoute);
    setDiscoveryView({axis:project.view.discoveryAxis,category:project.view.discoveryCategory});
    setModelsReady(true);setModelError('');
    setBrowseMode({combined:project.view.combined});setReportChoices({excluded:project.view.excluded});
    setModelView({activeModel:project.view.activeModel,modelDimension:project.view.modelDimension,modelQuery:project.view.modelQuery});
    setFoundationFocus(project.view.foundationFocus);setSourceProcess(project.view.sourceProcess);
    setFoundationCriterion('');setCatalogueSearch('');
    setFoundationBrowse(project.view.foundationBrowse);setFoundationCatalogueScope(project.view.foundationCatalogueScope==='frameworks'?'frameworks':'laws');setReportScope(project.view.reportScope);setChoiceThemeId(project.view.choiceThemeId || null);
    setSelected(project.view.selected);setReportPage(project.view.reportPage);
    const report=corpus.find(c=>c.framework.report.id===project.view.readerId)?.framework.report.id ?? corpus[0].framework.report.id;
    setReaderId(report);setReportEvidence(null);setActiveEvidence(null);setDetailsOpen(false);
    setBuilderGeneration(n=>n+1);
    if(resume)navigate(project.view.page,report);
  }
  const onProjectRestored = useEffectEvent((project:Project) => applyProject(project));
  useEffect(() => {
    let cancelled = false;
    const reading=new AbortController();
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setPage(workspaceRoute(window.location.hash || "#begin"));
      const reportRoute = window.location.hash.replace("#rapport-", "");
      if (corpus.some((c) => c.framework.report.id === reportRoute)) setReaderId(reportRoute);
      try {
        const store=guardedProjectStore(localStorage);
        storeRef.current=store;
        if(store.raw()!==null) {
          const original=await readProjectInBackground(store.raw()!,{signal:reading.signal});
          if(cancelled)return;
          assertProjectCollections(original,availableCollections);
          await ensureCatalogue(projectCatalogueKeys(original));
          // Source publication and project validation are separate atomic steps.
          // Let pending input/paint run between them, not one long microtask chain.
          await new Promise(resolve=>setTimeout(resolve,0));
          if(cancelled)return;
          const restored=readProject(original,projectRef.current,restoreOptions);
          await new Promise(resolve=>setTimeout(resolve,0));
          if(cancelled)return;
          const accepted=store.acceptProject(restored,store.raw()!);
          onProjectRestored(restored.project);
          if(accepted.notice)setScopeNotice(accepted.notice);
          setLoaded(true);
          return;
        }
        // Migrate old independent stores only after every substantive part validates.
        // Original keys are left untouched, including malformed values.
        const saved =
          localStorage.getItem(storageKey) ??
          previousStoredDraft();
        const models=localStorage.getItem('rijksmap-model-library-v1');
        const oldWorkspace=localStorage.getItem(workspaceKey) ?? localStorage.getItem('rijksmap-open-themes-v1');
        const choices=localStorage.getItem('rijksmap-view-report-choices-v1');
        const failures:string[]=[];
        if(saved)await ensureCatalogue(projectCatalogueKeys(JSON.parse(saved)));
        if(models)await ensureCatalogue(modelContentKeys(projectModelIds({modelLibrary:JSON.parse(models)})));
        if(oldWorkspace)await ensureCatalogue(projectCatalogueKeys({workspace:JSON.parse(oldWorkspace)}));
        if(cancelled)return;
        const salvage=<T,>(raw:string|null,restore:(v:unknown)=>T,fallback:T,label:string):T=>{
          if(!raw)return fallback;
          try{return restore(JSON.parse(raw));}catch{failures.push(label);return fallback;}
        };
        const restoredDraft=salvage(saved,restoreOptions.restoreDraft,projectRef.current.draft,'onderzoek');
        const restoredModels=salvage(models,restoreModelLibrary,projectRef.current.modelLibrary,'modellen');
        const restoredWorkspace=salvage(oldWorkspace,v=>restoreWorkspace(v,workspaces),projectRef.current.workspace,'themaweergave');
        const restoredChoices=salvage(choices,v=>{
          const excluded=(v as {excluded:unknown}).excluded;
          if(!Array.isArray(excluded)||!excluded.every(x=>typeof x==='string'))throw Error();
          return excluded as string[];
        },[] as string[],'rapportfilters');
        const next=makeProject(restoredDraft,restoredModels,restoredWorkspace,
          {page:workspaceRoute(window.location.hash || '#begin'),researchRoute:saved?'question':'',readerId:reportRoute,
            excluded:restoredChoices});
        onProjectRestored(next);
        if(failures.length) {
          setRecoveryOriginal(JSON.stringify({draft:saved,models,workspace:oldWorkspace,reportChoices:choices}));
          setScopeNotice('Niet hersteld: '+failures.join(', ')+'. De leesbare onderdelen zijn geopend; de oude opslag blijft behouden.');
          if(failures.includes('onderzoek')||failures.includes('modellen')) {
            storageBlocked.current=true;setProblem(true);
            setMessage('Het project is gedeeltelijk hersteld. Download het herstelbestand. Automatisch bewaren staat uit om de eerdere gegevens te beschermen.');
          }
        }
      } catch(e) {
        if(cancelled)return;
        storageBlocked.current=true;
        setProblem(true);
        setMessage(!storeRef.current
          ? 'De browseropslag is niet toegankelijk. Automatisch bewaren staat uit. Bewaar je huidige werk als projectbestand en controleer de opslaginstellingen van je browser.'
          : e instanceof Error && e.message.includes('verwijderde proefrapporten')
          ? e.message+' Download het herstelbestand of open een ander project.'
          : (e instanceof Error?e.message+' ':'')+'Het opgeslagen project kon niet volledig worden geopend. Het origineel blijft beschermd. Download het herstelbestand of open een bewaard project.');
        try {setRecoveryOriginal(localStorage.getItem(PROJECT_KEY) ?? JSON.stringify({
          draft:localStorage.getItem(storageKey) ?? previousStoredDraft(),
          models:localStorage.getItem('rijksmap-model-library-v1'),workspace:localStorage.getItem(workspaceKey)}));}catch{/* Browser storage unavailable. */}
        setModelsReady(true);
      }
      if (window.location.hash === "#subsidiebeheer")
        window.history.replaceState(null, "", "#open-themas");
      setLoaded(true);
    });
    return () => {
      cancelled = true;
      reading.abort();
    };
  }, [setMessage,setProblem]);
  useEffect(() => {
    const sync = () => {
      const route=workspaceRoute(window.location.hash || "#begin");
      const current=projectRef.current;
      const reportId=window.location.hash.replace('#rapport-','');
      const keys=['entry','start','framework','export'].includes(route)?[]:['catalogue'];
      if(route==='models')keys.push(modelDirectoryKey());
      if(route==='model-workspace')keys.push(...modelContentKeys(projectModelIds(current)));
      if(route==='reader')keys.push('report:'+reportId);
      if(route==='foundation-workspace')keys.push(foundationOverviewKey(current.view.foundationFocus||current.draft.investigation?.sourceIds[0],Boolean(current.view.aboutViews?.laws)));
      if(route==='topics')for(const id of current.view.combined?current.workspace.openIds:[current.workspace.activeId])keys.push(...(catalogueRouting.workspaces[id||'']??[]).map(reportOverviewKey));
      if(!catalogueReady(keys)){withContent(keys,sync);return;}
      if(route==='model-workspace')prepareModelLibrary(projectModelIds(current));
      if(route==='export')setExportOpened(true);
      contentRequest.current++;contentAction.current=null;setContentNotice('');setContentFailure(false);
      setPage(route);
      setLastCollectionPage(previous=>rememberCollectionPage(route,previous));
      if(route==='start')setResearchRoute('question');
      if(route==='risk-start')setResearchRoute('risk');
      const reportRoute = window.location.hash.replace("#rapport-", "");
      if (corpus.some((c) => c.framework.report.id === reportRoute)) {
        setReaderId(reportRoute);
        setReportPage(1);
        setReportEvidence(null);
      }
      if (window.location.hash === "#subsidiebeheer") {
        setWorkspace((w) => openTheme(w, "subsidiebeheer", workspaces));
        window.history.replaceState(null, "", "#open-themas");
      }
      setTab("framework");
      setDetail("chain");
      setActiveEvidence(null);
      setDetailsOpen(false);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  // Saving synchronizes browser storage; the status subscription reports its result.
  useEffect(() => {
    if(!loaded || !modelsReady)return;
    const next=makeProject(draft,modelLibrary,workspace,{page,lastCollectionPage,selected,readerId,reportPage,foundationFocus,sourceProcess,
      researchRoute,discoveryAxis:discoveryView.axis,discoveryCategory:discoveryView.category,
      ...modelView,aboutViews,openModelIds,combined:browseMode.combined,excluded:reportChoices.excluded,foundationBrowse,foundationCatalogueScope,reportScope,choiceThemeId:choiceThemeId??''},collections);
    projectRef.current=next;
    if(!storageBlocked.current&&storeRef.current)backgroundSave.current?.save(next);
  },[loaded,modelsReady,draft,modelLibrary,workspace,page,lastCollectionPage,selected,readerId,reportPage,foundationFocus,sourceProcess,modelView,aboutViews,browseMode,reportChoices,foundationBrowse,foundationCatalogueScope,reportScope,choiceThemeId,researchRoute,discoveryView,openModelIds,saveProject,collections]);
  useEffect(()=>{
    const changed=(event:StorageEvent)=>{
      // localStorage.clear() reports key=null; it invalidates a saved project too.
      // Ignore sessionStorage events, which do not replace the shared project.
      if(event.storageArea===localStorage && (event.key===PROJECT_KEY || event.key===null) && event.newValue!==storeRef.current?.raw()) {
        storageBlocked.current=true;setProblem(true);
        setMessage(event.newValue===null
          ? 'De lokale projectopslag is in een ander tabblad gewist. Je huidige werk blijft in deze sessie beschikbaar. Bewaar je versie als bestand voordat je herlaadt.'
          : 'Het project is in een ander tabblad gewijzigd. Bewaar uw versie als bestand of herlaad voor de opgeslagen versie.');
      }
    };
    window.addEventListener('storage',changed);
    return ()=>window.removeEventListener('storage',changed);
  },[setMessage,setProblem]);
  useEffect(()=>{
    // Finish the latest snapshot before leaving, including mobile backgrounding.
    // Normal navigation uses the worker; this synchronous fallback is exceptional.
    const flush=()=>{if(backgroundSave.current?.pending)saveProject(projectRef.current);};
    const hidden=()=>{if(document.visibilityState==='hidden')flush();};
    const warn=(event:BeforeUnloadEvent)=>{
      flush();
      if(storageBlocked.current) {
        // Current browsers use cancellation; no deprecated legacy returnValue.
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload',warn);
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',flush);
    return ()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',flush);};
  },[saveProject]);
  function openReportChoice() {
    setChoiceThemeId(combinedView ? "" : (activeTheme?.id ?? null));
    setReportScope("open"); navigate("reports");
  }
  function openWorkspace(id: string) {
    const keys=['catalogue',...(catalogueRouting.workspaces[id]??[]).map(reportOverviewKey)];
    if(!catalogueReady(keys)){withContent(keys,()=>openWorkspace(id));return;}
    setBrowseMode({ combined: false });
    setWorkspace((w) => openTheme(w, id, workspaces));
    if(page!=="topics")navigate("topics",readerId,id);
  }
  function openReportRisks(reportId:string){
    setAboutViews(v=>({...v,reports:false}));
    const target=reportViews.find(t=>t.reportIds[0]===reportId);
    if(!target)return;
    setDetailsOpen(false);
    setReveal(undefined);
    setTab('framework');
    setReportChoices(v=>({...v,excluded:chooseReport(v.excluded,target.id,reportId,true)}));
    setReportViewReset(v=>v+1);
    openWorkspace(target.id);
  }
  function showInTheme(id: string) {
    setAboutViews(v=>({...v,reports:false}));
    const theme =
      workspaces.find((t) => t.id === workspace.activeId && t.lineIds.includes(id)) ??
      themes.find((t) => t.lineIds.includes(id));
    if (!theme) return;
    const target = framework.lines.find((l) => l.id === id)!;
    const reportId = reportForLine(framework, target).id;
    if (!reportEnabled(reportChoices.excluded, theme.id, reportId)) {
      setReportChoices((v) => ({
        ...v,
        excluded: chooseReport(v.excluded, theme.id, reportId, true),
      }));
      setReportNotice("Rapportfilter opgeheven om " + normId(id) + " te tonen.");
    }
    openWorkspace(theme.id);
    setSelected(id);
    revealCounter.current += 1;
    setReveal({ id, nonce: revealCounter.current });
  }
  function navigate(next: string, reportId = readerId, topicWorkspaceId?:string) {
    if(next==='collect'){
      const landing=collectionDestination(lastCollectionPage,draftRef.current.investigation?.goal?.direction,researchRoute);
      if(landing.foundationScope)setFoundationCatalogueScope(landing.foundationScope);
      next=landing.page;
    }
    const keys=['entry','start','framework','export'].includes(next)?[]:['catalogue'];
    if(next==='models')keys.push(modelDirectoryKey());
    if(next==='model-workspace')keys.push(...modelContentKeys(projectModelIds(projectRef.current)));
    if(next==='reader')keys.push('report:'+reportId);
    if(next==='foundation-workspace'){
      const source=foundationFocus||draftRef.current.investigation?.sourceIds[0];
      if(source)keys.push(foundationOverviewKey(source,Boolean(aboutViews.laws||foundationCriterion)));
    }
    if(next==='topics')for(const id of topicWorkspaceId?[topicWorkspaceId]:combinedView?workspace.openIds:[workspace.activeId])keys.push(...(catalogueRouting.workspaces[id??'']??[]).map(reportOverviewKey));
    if(!catalogueReady(keys)){withContent(keys,()=>navigate(next,reportId,topicWorkspaceId));return;}
    if(next==='model-workspace')prepareModelLibrary(projectModelIds(projectRef.current));
    if(next==='export')setExportOpened(true);
    contentRequest.current++;contentAction.current=null;setContentNotice('');setContentFailure(false);
    if(next==='start')setResearchRoute('question');
    if(next==='risk-start')setResearchRoute('risk');
    setPage(next);
    setLastCollectionPage(previous=>rememberCollectionPage(next,previous));
    setDetailsOpen(false);
    setTab("framework");
    setDetail("chain");
    setActiveEvidence(null);
    const hash =
      next === 'model-workspace' ? '#open-modellen' : next === 'entry' ? '#begin' : next === 'risk-start' ? '#risicoverkenning' : next === 'report-themes' ? '#rapportthemas' : next === "processes"
        ? "#processen"
        : next === "start"
          ? "#start"
          : next === "foundation-workspace"
            ? "#open-grondslagen"
            : next === "foundations"
              ? "#grondslagen"
              : next === "models"
                ? "#modellen"
                : next === "export"
                  ? "#kaderexport"
                  : next === "framework"
                    ? "#mijn-kader"
                    : next === "reports"
                      ? "#rapporten"
                      : next === "reader"
                        ? "#rapport-" + reportId
                        : next === "topics"
                          ? "#open-themas"
                          : "#themas";
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    requestAnimationFrame(() => focusWorkflowHeading(document));
  }
  const commit = useCallback((next: Draft, action = "Laatste wijziging", track = true, autoLink = true) => {
    // A delayed selection must never replace edits made while it was loading.
    contentRequest.current++;contentAction.current=null;setContentNotice('');setContentFailure(false);
    if (action === "Laatste wijziging") setResetNotice("");
    const prepared=prepareInvestigationFramework(baseFramework,next);
    const validated=prepared.investigation;
    // Always validate first. Preserve unchanged content identity so a presentation
    // setting does not rebuild the framework or resend every source to a worker.
    next = {...next,investigation:projectContentEqual(validated,draftRef.current.investigation)
      ? draftRef.current.investigation : validated};
    const cleaned = cleanScopeDraft(prepared.framework, next);
    next = cleaned.draft;
    if(track && autoLink)next=linkNewSelections(draftRef.current,next) as Draft;
    if (cleaned.removed.length)
      setScopeNotice(
        cleaned.removed.map(normId).join(", ") +
          " valt buiten de productscope en is niet opgenomen.",
      );
    if (track && !projectContentEqual(next,draftRef.current)) rememberProject(action);
    draftRef.current = next;
    const view={base:baseFramework,revision:catalogueRevision(),framework:prepared.framework as Framework};
    setDraftState(previous=>({draft:next,
      // Unchanged investigation data retains the existing view identity too.
      prepared:previous.draft.investigation===next.investigation &&
        previous.prepared?.base===view.base && previous.prepared.revision===view.revision
        ? previous.prepared : view,
    }));
    projectRef.current={...projectRef.current,draft:next};
    // UI onChange accepts an in-memory edit; the save indicator alone reports
    // durability. Mark pending now so an immediate page exit flushes this edit.
    if(!storageBlocked.current&&storeRef.current)backgroundSave.current?.save(projectRef.current);
  }, []);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    if (!loaded) return;
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => unknown;
        };
      }
    ).modelContext;
    const tools = () => createFrameworkTools(investigationFramework(baseFramework,draftRef.current), {
        getDraft: () => draftRef.current,
        apply: (next: Draft) => {
          flushSync(() => {
            commit(next);
          });
          // This API explicitly promises a durable local_storage_saved result,
          // unlike UI onChange. Keep that contract, including storage failures.
          return saveProject(projectRef.current);
        },
      });
    return registerFrameworkTools(
      context,
      tools().map(tool=>({...tool,execute:async(input:unknown)=>{
        // Browser AI requests need real records too. Do not expose display-only
        // projections or eagerly hydrate the viewer just to register these tools.
        const current=projectRef.current;
        const ids=current.view.combined?current.workspace.openIds:[current.workspace.activeId];
        await ensureCatalogue(ids.flatMap(id=>(catalogueRouting.workspaces[id??'']??[]).map(report=>'report:'+report)));
        return tools().find(fresh=>fresh.name===tool.name)!.execute(input);
      }})),
      () => {
        /* Optional agent surface unavailable; ordinary editor remains functional. */
      },
    );
  }, [loaded, commit, saveProject]);
  function edit(key: string, text: string) {
    commit(updateValue(draft, line, key, text) as Draft);
  }
  function startNewProject() {
    if(!loaded || !modelsReady)return;
    const empty=newProject(baseFramework) as Project;
    rememberProject('Nieuw project starten');
    try { clearProjectBrowsePreferences(sessionStorage); } catch { /* Optional browse preferences. */ }
    setNewProjectOpen(false);setOwnMaterialOpen(false);setAdoptingModel('');setAdoptionError('');
    setAdoptionChoices({});setImportFeedback('');setScopeNotice('');setReportNotice('');setReveal(undefined);
    applyProject(empty);
    const saved=saveProject(empty);
    setResetNotice(saved
      ? ''
      : 'Nieuw leeg project gestart, maar niet automatisch bewaard. Bewaar project voordat je herlaadt; anders kan je eerdere project terugkomen.');
    if(!saved)setProblem(true);
  }
  async function importDraft(file: File | undefined) {
    if (!file) return;
    const request=++importRequest.current,previousDraft=draftRef.current;
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new Error("Projectbestand is te groot.");
      const originalText=await file.text();
      const original=expandProject(JSON.parse(originalText));
      assertProjectCollections(original,availableCollections);
      await ensureCatalogue(projectCatalogueKeys(original));
      if(request!==importRequest.current)return;
      if(draftRef.current!==previousDraft)throw Error('Je onderzoek is tijdens het laden gewijzigd. Open het projectbestand opnieuw als je die wijzigingen wilt vervangen.');
      const opened=readProject(original,projectRef.current,restoreOptions);
      setImportFeedback("");
      // Changed projects require durable originals before adoption. An unchanged
      // valid file may still open in memory on a quota/access error, with saving off.
      const accepted=acceptProjectFile(opened,()=>{
        const store=storeRef.current ?? guardedProjectStore(localStorage);
        const stored=store.acceptProject(opened,originalText,{replace:true,preservePrevious:Boolean(recoveryOriginal)});
        storeRef.current=store;
        return stored;
      });
      backgroundSave.current?.cancel();
      storageBlocked.current=!accepted.savedLocally;
      rememberProject(opened.legacy ? 'Oud concept openen' : 'Project openen');
      applyProject(opened.project);
      projectStatus.update({savedLocally:accepted.savedLocally,problem:!accepted.savedLocally,message:accepted.savedLocally
        ? 'Project lokaal opgeslagen. Bewaar project voor een overdraagbare reservekopie.'
        : 'Project geopend. Automatisch bewaren is niet gelukt; gebruik Bewaar project. De eerdere opslag is niet overschreven.'});
      setScopeNotice(accepted.notice);
      setResetNotice(opened.legacy ? 'Oud concept geopend. Dit bestand bevat geen modelwerkruimte; uw huidige modellen blijven behouden.' : 'Project geopend, inclusief modellen en werkplek.');
    } catch (e) {
      if(request!==importRequest.current)return;
      setImportFeedback(e instanceof SyntaxError ? "Dit bestand is geen leesbaar projectbestand. Kies een JSON-bestand dat met Bewaar project is gemaakt. Je huidige onderzoek is behouden."
        : (e instanceof Error ? e.message : "Project kon niet worden geopend.") + " Je huidige onderzoek is behouden.");
    }
    if (inputRef.current) inputRef.current.value = "";
  }
  function openStructure(id: string) {
    setFocusedField('');
    setDetailsOpen(true);
    setSelected(id);
    setActiveEvidence(null);
    setDetail("chain");
  }
  const [focusedField,setFocusedField]=useState('');
  useEffect(()=>{
    if(!detailsOpen||!focusedField)return;
    const timer=setTimeout(()=>document.getElementById(`field-${selected}-${focusedField}`)?.scrollIntoView({block:'center'}),150);
    return ()=>clearTimeout(timer);
  },[detailsOpen,focusedField,selected]);
  function openField(id:string,field:string){openStructure(id);setFocusedField(field);}
  const [pointRequest,setPointRequest]=useState<{id:string;field?:string;pointId?:string;nonce:number}>({id:'',nonce:0});
  const [cioPointRequest,setCioPointRequest]=useState<{pointId:string;nonce:number}>({pointId:'',nonce:0});
  const [topicalPointRequest,setTopicalPointRequest]=useState<{sourceId:string;pointId:string;nonce:number}>({sourceId:'',pointId:'',nonce:0});
  const [admittedPointRequest,setAdmittedPointRequest]=useState<{sourceId:string;pointId:string;nonce:number}>({sourceId:'',pointId:'',nonce:0});
  const [wwkePointRequest,setWwkePointRequest]=useState<{pointId:string;nonce:number}>({pointId:'',nonce:0});
  const [detailContext,setDetailContext]=useState({page,builderGeneration});
  if(detailContext.page!==page || detailContext.builderGeneration!==builderGeneration) {
    setDetailContext({page,builderGeneration});
    setCioPointRequest(p=>p.pointId?{...p,pointId:''}:p);
    setTopicalPointRequest(p=>p.pointId?{...p,pointId:''}:p);
    setAdmittedPointRequest(p=>p.pointId?{...p,pointId:''}:p);
    setWwkePointRequest(p=>p.pointId?{...p,pointId:''}:p);
    setPointRequest(p=>p.id?{...p,id:''}:p);
  }
  function openBuildingBlock(id:string,field?:string){
    const admitted=!field&&admittedMaterialTarget(draft,id,foundations,foundationProposals);
    if(admitted){
      setDetailsOpen(false);setPointRequest(p=>({...p,id:''}));setCioPointRequest(p=>({...p,pointId:''}));
      setTopicalPointRequest(p=>({...p,pointId:''}));setWwkePointRequest(p=>({...p,pointId:''}));
      setAdmittedPointRequest(p=>({...admitted,nonce:p.nonce+1}));return;
    }
    setAdmittedPointRequest(p=>({...p,pointId:''}));
    const target=buildingBlockViewer(draft,id,reportPointCatalogue);
    setDetailsOpen(false);
    setWwkePointRequest(p=>({...p,pointId:''}));
    setTopicalPointRequest(p=>({...p,pointId:''}));
    if(target.kind==='topical'){
      setPointRequest(p=>({...p,id:''}));setCioPointRequest(p=>({...p,pointId:''}));
      setTopicalPointRequest(p=>({sourceId:target.sourceId,pointId:target.pointId,nonce:p.nonce+1}));
    }else if(target.kind==='wwke'){
      setPointRequest(p=>({...p,id:''}));setCioPointRequest(p=>({...p,pointId:''}));
      setWwkePointRequest(p=>({pointId:target.pointId,nonce:p.nonce+1}));
    }else if(target.kind==='cio'){
      setPointRequest(p=>({...p,id:''}));
      setCioPointRequest(p=>({pointId:target.pointId,nonce:p.nonce+1}));
    }else if(target.kind==='report'){
      setCioPointRequest(p=>({...p,pointId:''}));
      setPointRequest(p=>({id:target.id,pointId:target.pointId,field,nonce:p.nonce+1}));
    }else if(field){openField(id,field);}else{openStructure(id);}
  }
  function openPointViewer(id:string,field?:string){
    const keys=reportContentKeys([id],catalogueRouting.reports);
    if(!catalogueReady(keys)){withContent(keys,()=>openPointViewer(id,field));return;}
    if(reportPointCatalogue.blocks.some(b=>b.id===id) && (!field || ['objective','risk','controlObjective','control','criterion','finding','procedure'].includes(field))){
      setDetailsOpen(false);
      setSelected(id);
      setPointRequest(previous=>({id,field,nonce:previous.nonce+1}));
    }else if(field){openField(id,field);}else{openStructure(id);}
  }
  const pointCounts=useMemo(()=>({...reportPointCounts(catalogueSnapshot.pointCatalogue,draft),
    ...(overview?reportPointCounts(overview,draft):{})}),[draft,catalogueSnapshot,overview]);
  function selectReportOverviewRows(ids:string[],selected:boolean){
    const keys=reportContentKeys(ids,catalogueRouting.reports);
    withContent(keys,()=>commit(selectReportRows(draftRef.current,reportPointCatalogue,ids,selected) as Draft));
  }
  function showEvidence(id: string) {
    setDetailsOpen(true);
    setActiveEvidence(id);
    setDetail("sources");
    setTimeout(
      () => evidenceRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" }),
      0,
    );
  }
  function refs(ids: string[]) {
    return <EvidenceLinks framework={framework} ids={ids} onEvidence={showEvidence} />;
  }
  function openReport(e?: Evidence) {
    const id = e ? reportForEvidence(framework, e).id : lineReport.id;
    setReaderId(id);
    setReturnPage(page);
    setReportEvidence(e?.id ?? null);
    setReportPage(e?.page ?? 1);
    navigate("reader", id);
  }
  function openLineReport(target: Line) {
    if (target.source_id) {
      openStructure(target.id);
      return;
    }
    const id = reportForLine(framework, target).id;
    setReaderId(id);
    setReturnPage(page);
    setReportEvidence(null);
    setReportPage(1);
    navigate("reader", id);
  }
  function returnToEvidence() {
    const id = reportEvidence;
    navigate(returnPage);
    setTab("framework");
    if (id) showEvidence(id);
  }
  function quote(e: Evidence) {

  return (
      <div className="evidence-card" key={e.id}>
        <div className="evidence-header">
          <strong>{referenceLabel(framework, e.id)}</strong>
          <span>{roleLabels[e.role] ?? "Passage uit het rapport"}</span>
        </div>
        <blockquote>{e.quote}</blockquote>
        <div className="evidence-footer">
          <small>Letterlijke passage · {reportForEvidence(framework, e).title}</small>
          <Button variant="link" className="readable-reference" onClick={() => openReport(e)}>
            Bekijk gemarkeerde passage in rapport →
          </Button>
        </div>
        <details className="technical-details">
          <summary>Technische brongegevens</summary>
          <p>
            Rapport {reportForEvidence(framework, e).id} · passage {e.id} · bronrol {e.role} ·
            tekstpositie {e.start}–{e.end}
          </p>
        </details>
      </div>
    );
  }
  function chooseRiskArea(area:typeof riskArea) {
    if(area==='models'){
      if(!catalogueReady([modelDirectoryKey()])){withContent([modelDirectoryKey()],()=>chooseRiskArea(area));return;}
    }
    if(area===riskArea||area==='laws'||area==='frameworks'){
      if(area==='themes'||area==='processes')setDirectoryViews(v=>({...v,[area]:emptyDirectoryView()}));
      else {
        setCatalogueGroups(v=>({...v,[area==='models'?'models':'foundations']:''}));
        if(area!=='models')setCatalogueSearch('');
        else setModelView(v=>({...v,modelQuery:''}));
        setRiskBrowseGeneration(v=>v+1);
      }
    }
    setRiskArea(area);
  }
  const renderFoundations = () => (
            <FoundationCatalogue
              onPrepareSource={id=>{void prefetchCatalogue([foundationOverviewKey(id,aboutViews.laws)]);}}
              prepareSources={(ids,action)=>withContent(ids.map(id=>'foundation:'+id),action)}
              prepareSearch={ids=>withContent(foundationSearchKeys(ids),()=>{})}
              sourceScope={page==='risk-start'?(riskArea==='laws'?'laws':'frameworks'):foundationCatalogueScope}
              onSourceScopeChange={page==='risk-start'?undefined:setFoundationCatalogueScope}
              guided={page==='risk-start'}
              directoryGroup={catalogueGroups.foundations} onDirectoryGroup={id=>setCatalogueGroups(v=>({...v,foundations:id}))}
              key={page==='risk-start'?`risk-${builderGeneration}-${riskBrowseGeneration}`:builderGeneration}
              searchQuery={catalogueSearch} onSearchQuery={setCatalogueSearch}
              onCriteria={(id,criterionId) => withContent(['catalogue',foundationOverviewKey(id,Boolean(criterionId||aboutViews.laws))],()=>{ setFoundationFocus(id);setFoundationCriterion(criterionId||'');
                if(criterionId) setFoundationBrowse({sourceId:id,query:criterionId,topic:'',groupId:'',page:0,selectedOnly:false,reviewedOnly:false,grouped:false});
                navigate("foundation-workspace"); })}
              initialProcess={page==='risk-start'?'':sourceProcess}
              onProcessChange={page==='risk-start'?undefined:setSourceProcess}
              draft={draft}
              onChange={commit}
              disabled={!loaded}
              navigate={navigate}
            />
  );
  function openModel(id:string,viewer=false) {
    withContent(modelContentKeys([id]),()=>{
      prepareModelLibrary([id]);
      const models=projectRef.current.modelLibrary.models;
      if(!models.some(model=>model.id===id))return;
      setOpenModelIds(ids=>addOpenModel(ids,id,models));
      if(viewer){setModelView(v=>({...v,activeModel:id,modelDimension:''}));navigate('model-workspace');}
    });
  }
  const renderModels = () => !catalogueReady(page==='model-workspace'?modelContentKeys(projectModelIds(projectRef.current)):[modelDirectoryKey()]) ? <output data-status-block="">Modellen laden…</output> : (
            <>
              <ModelLibrary
                guided={page==='risk-start'}
                directoryGroup={catalogueGroups.models} onDirectoryGroup={id=>setCatalogueGroups(v=>({...v,models:id}))}
                key={page==='risk-start'?`risk-${builderGeneration}-${riskBrowseGeneration}`:builderGeneration}
                mode={page==='model-workspace'?'workspace':'catalogue'} openModelIds={openModelIds}
                onOpenModel={id=>openModel(id)} onOpenViewer={id=>openModel(id,true)}
                onCloseModel={id=>setOpenModelIds(ids=>removeOpenModel(ids,id,modelLibrary.models))}
                onCatalogue={()=>navigate('models')}
                onBuilder={()=>navigate('framework')}
                overview={aboutViews.models?'about':'questions'}
                onOverviewChange={value=>setAboutViews(v=>({...v,models:value==='about'}))}
                suggestedSubject={draft.investigation?.goal?.subject || draft.investigation?.scope || ''}
                value={modelLibrary} directory={modelDirectoryEntries}
                view={modelView}
                onViewChange={patch=>setModelView(v=>({...v,...patch}))}
                onChange={changeModels}
                ready={modelsReady && loaded}
                error={modelError}
                onAdoptModel={(id) => {
                  try {
                  const model = modelLibrary.models.find(m => m.id === id);
                  if (!model) return;
                  const plan:typeof adoptionPlan=modelAdoptionPlan(draft,model);
                  if(plan.some(row=>!row.identicalId && row.candidates.length)) {
                    setAdoptionChoices({});setAdoptionError('');setAdoptingModel(id);return;
                  }
                  commit(applyModelAdoption(draft,plan) as Draft,'Modelvragen toevoegen');
                  navigate("framework");
                  }catch(e){setScopeNotice(e instanceof Error ? e.message : 'Modelvragen konden niet worden toegevoegd.');}
                }}
              />
            </>
  );
  return (
    <CollectionContext.Provider value={{collections:availableCollections,mode:collections.mode,reports:catalogueRouting.reports}}>
    <EvidenceDisplayContext.Provider value={showSources}>
      <div className="framework-app compact-app" onBlurCapture={() => {typingRecoveryRef.current = null;}}>
        <a className="skip-link" href="#main-workspace" onClick={event=>{event.preventDefault();document.getElementById('main-workspace')?.focus();}}>
          Naar referentiekader
        </a>
        <header className="brand-bar">
          <div>
            <a className="brand-home" href="#begin" aria-label="Omnibus — kies onderzoeksroute"
              onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate("entry"); } }}>
              <BookOpen aria-hidden="true" size={23} />
              <strong>Omnibus</strong>
            </a>
          </div>
          <div className="file-actions project-actions">
            <fieldset className="project-action-group" aria-label="Project starten en openen">
            <AlertDialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <AlertDialogTrigger render={<Button variant="outline" disabled={!loaded || !modelsReady} />}><FilePlus2 size={16}/>Nieuw project</AlertDialogTrigger>
              <AlertDialogContent className="new-project-dialog" initialFocus={cancelNewProjectRef}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Opnieuw beginnen met een leeg project?</AlertDialogTitle>
                  <AlertDialogDescription>Je huidige doelstelling, selecties, bouwstenen, onderzoeksvragen, modelaanpassingen en exportinstellingen worden uit het actieve project verwijderd. Herstelkopieën en oude projectgegevens in de browser blijven bestaan. De bronbibliotheek en eerder gedownloade bestanden blijven behouden.</AlertDialogDescription>
                </AlertDialogHeader>
                <Button variant="outline" disabled={fileDownload.busy} onClick={()=>downloadProject('rijksmap-project-voor-nieuw-project.json')}><Download size={16}/>Eerst huidig project bewaren</Button>
                {fileDownload.error && <p role="alert">{fileDownload.error}</p>}
                <p>Je kunt dit tot het herladen van de pagina ongedaan maken.</p>
                <AlertDialogFooter>
                  <AlertDialogCancel ref={cancelNewProjectRef}>Annuleren</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" disabled={fileDownload.busy} onClick={startNewProject}>Wis project en begin opnieuw</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" disabled={!loaded} onClick={()=>inputRef.current?.click()}><FolderOpen size={16}/>Open project</Button>
            </fieldset>
            <fieldset className="project-action-group" aria-label="Project bewaren en delen">
            <Button variant="outline" disabled={!loaded || !modelsReady || fileDownload.busy} title="Bewaar onderzoek, modelkeuzes en werkplek in één bestand"
              onClick={()=>downloadProject('rijksmap-project.json')}><Download size={16}/>Bewaar project</Button>
            <ShareProject disabled={!loaded || !modelsReady || fileDownload.busy} error={fileDownload.error} onDownload={()=>downloadProject('omnibus-project-delen.json')} />
              <Button variant="outline" className="project-save-indicator"
                data-state={storageBlocked.current?'unsaved':savedLocally?'saved':'loading'}
                disabled={!loaded || !modelsReady}
                aria-label={storageBlocked.current?'Niet automatisch opgeslagen — bekijk opslagstatus':savedLocally?'Lokaal opgeslagen — bekijk opslagstatus':loaded&&modelsReady?'Wijzigingen worden lokaal opgeslagen':'Projectopslag wordt geladen'}
                title={storageBlocked.current?'Niet automatisch opgeslagen. Klik voor uitleg en bewaar je project.':savedLocally?'Automatisch opgeslagen in deze browser. Klik voor uitleg.':loaded&&modelsReady?'Wijzigingen worden lokaal opgeslagen':'Projectopslag wordt geladen'}
                onClick={openStorageHelp}>
                {storageBlocked.current?<CircleAlert size={16} aria-hidden="true"/>:loaded&&modelsReady?<Save size={16} aria-hidden="true"/>:<LoaderCircle size={16} aria-hidden="true"/>}
              </Button>
              <output className="sr-only">{storageBlocked.current?'Let op: je huidige werk wordt niet automatisch opgeslagen. Kies Bewaar project.':savedLocally?'Project automatisch opgeslagen in deze browser.':''}</output>
            </fieldset>
            {recovery.length>0 && <fieldset className="project-action-group" aria-label="Project herstellen"><Button variant="ghost" title={recovery.at(-1)?.label} onClick={()=>{
              const previous=recoveryRef.current.at(-1);if(!previous)return;
              recoveryRef.current=recoveryRef.current.slice(0,-1);setRecovery(recoveryRef.current);typingRecoveryRef.current=null;
              applyProject(previous.draft);saveProject(previous.draft);
              setResetNotice(previous.label+' ongedaan gemaakt.');
            }}>Ongedaan maken</Button></fieldset>}
            <fieldset className="project-action-group project-utility-group" aria-label="AI, hulp en weergave">
              <AiConnection />
              <WorkflowHelp page={page} draft={draft} ready={loaded && modelsReady}
                blocked={newProjectOpen || storageHelpOpen || reloadOpen || detailsOpen || Boolean(adoptingModel)}
                pendingQuestion={pendingGuideQuestion} storageBlocked={Boolean(problem && storageBlocked.current)}
                hasModel={modelLibrary.models.some(model => model.selected)} exportStatus={exportGuideStatus}
                hasOpenModel={openModelIds.some(id=>modelLibrary.models.some(model=>model.id===id))}
                onAction={(action: GuideAction) => {
                  // The helper must never navigate away from an unaccepted question.
                  const destination = page === 'framework' && pendingGuideQuestion
                    ? {page: 'framework', target: 'central-question-input'} : action;
                  if (destination.page === 'storage') { openStorageHelp(); return; }
                  if (destination.page !== page) navigate(destination.page);
                  requestAnimationFrame(() => {
                    let target = document.getElementById(destination.target || 'workflow-page-title');
                    if (target?.getAttribute('aria-hidden') === 'true') target = target.parentElement?.querySelector<HTMLElement>('[role="checkbox"]') || target;
                    if (!target || !target.getClientRects().length) target = document.getElementById('workflow-page-title');
                    target?.scrollIntoView({block: 'center'});
                    target?.focus({preventScroll: true});
                  });
                }} />
              <AppearanceToggle />
            </fieldset>
            <input ref={inputRef} hidden type="file" accept=".json,application/json" aria-label="Open lokaal project of oud concept"
              onChange={e=>void importDraft(e.target.files?.[0])}/>
          </div>
        </header>
        {fileDownload.error && <p className="project-import-feedback" role="alert">{fileDownload.error}</p>}
        {importFeedback && <div className="project-import-feedback" role="alert"><span>{importFeedback}</span><Button variant="ghost" aria-label="Importmelding sluiten" onClick={()=>setImportFeedback('')}><X size={18}/></Button></div>}
        <main id="main-workspace" tabIndex={-1} data-viewer={['foundation-workspace','model-workspace','topics'].includes(page)}>
          {contentNotice&&<div className="project-notice" role={contentFailure?'alert':'status'}>
            <p>{contentNotice}</p>{contentFailure&&<Button variant="outline" onClick={()=>contentAction.current?.()}>Opnieuw proberen</Button>}
          </div>}
          {scopeNotice && (
            <output className="navigation-notice">
              {scopeNotice}
              <Button variant="ghost" onClick={() => setScopeNotice("")}>
                Sluiten
              </Button>
            </output>
          )}
          <InvestigationNavigation
            page={page}
            lastCollectionPage={lastCollectionPage}
            researchRoute={researchRoute}
            researchDirection={draft.investigation?.goal?.direction}
            navigate={(next) => {
              if (next === "reports") setReportScope("all");
              navigate(next);
            }}
            count={draft.included.length}
          />
          <div className="workflow-surface" data-page={page}>
          {(availableCollections.origins.some(o=>o.kind==='own')||collections.mode==='own')&&['risk-start','catalogue','processes','topics','foundations','foundation-workspace','reports','report-themes'].includes(page)&&<CollectionChoice mode={collections.mode} disabled={!loaded||!modelsReady} hasOwn={availableCollections.origins.some(o=>o.kind==='own')} onChange={mode=>{rememberProject('Collectiekeuze wijzigen');setCollections(bindCollectionPreference({...collections,mode},availableCollections));}}/>}
          <CollectionNavigation
            discoveryAxis={discoveryView.axis}
            page={page}
            navigate={(next)=>{if(next==='reports')setReportScope('all');navigate(next);}}
            openCounts={{
              foundations:foundations.filter(source=>(draft.investigation?.sourceIds||[]).includes(source.id)).length,
              models:normalizeOpenModelIds(openModelIds,modelLibrary.models).length,
              // Count the same opened tabs as this viewer, including report analyses.
              topics:workspaces.filter(item=>workspace.openIds.includes(item.id)).length,
            }}
          />
          <div hidden={page !== "export"}>
            {(page==='export'||exportOpened)&&<ExcelExport
              active={page==='export'}
              onGuidanceChange={setExportGuideStatus}
              key={builderGeneration}
              framework={framework}
              draft={draft}
              disabled={!loaded || !choicesReady}
              models={modelLibrary.models}
              onSettingsChange={(settings) => {
                if (loaded) commit({ ...draft, exportSettings: settings });
              }}
            />}
          </div>
            {problem && (
              <ProjectNotice key={message} message={message}
                onRecover={recoveryOriginal ? ()=>download(recoveryOriginal,'rijksmap-herstel-origineel.json','application/json') : undefined}
                onReload={()=>setReloadOpen(true)} />
            )}
          {resetNotice && <output className="navigation-notice">{resetNotice}<Button variant="ghost" onClick={()=>setResetNotice('')}>Sluiten</Button></output>}
          <Sheet open={Boolean(adoptingModel)} onOpenChange={open=>{if(!open)setAdoptingModel('');}}>
            <SheetContent className="project-recovery-sheet model-update-sheet">
              <SheetHeader><SheetTitle>Modelvragen opnieuw gebruiken</SheetTitle><SheetDescription>Er staan al versies van deze vragen in je kader. Kies wat je wilt behouden of bijwerken. Notities en koppelingen blijven bij dezelfde bouwsteen.</SheetDescription></SheetHeader>
              <p>{adoptionPlan.filter(row=>!row.identicalId && row.candidates.length).length} gewijzigd · {adoptionPlan.filter(row=>!row.candidates.length).length} nieuw · {adoptionPlan.filter(row=>row.identicalId).length} ongewijzigd</p>
              <p className="creator-help">Bijwerken vervangt de vraagtekst en bijbehorende modelvelden, ook eigen formuleringen. Notities en koppelingen blijven staan. Terugzetten kan met Ongedaan maken.</p>
              <Button variant="outline" onClick={()=>setAdoptionChoices(Object.fromEntries(adoptionPlan.filter(row=>!row.identicalId && row.candidates.length===1).map(row=>[row.incoming.originKey,{mode:'update',targetId:row.candidates[0].id}])))}>Wijzigingen bijwerken waar één bestaande versie is</Button>
              {adoptionPlan.filter(row=>!row.identicalId && row.candidates.length).map(row=>{
                const choice=adoptionChoices[row.incoming.originKey] || {mode:'keep',targetId:row.candidates.length===1 ? row.candidates[0].id : ''};
                const old=row.candidates.find(m=>m.id===choice.targetId);
                return <section className="model-update-card" key={row.incoming.originKey}>
                  <h3>{row.incoming.title}</h3>
                  <label>Wat wil je met deze vraag?<select value={choice.mode} onChange={e=>setAdoptionChoices(v=>({...v,[row.incoming.originKey]:{...choice,mode:e.target.value}}))}>
                    <option value="keep">Bestaande versie behouden</option><option value="update">Bestaande versie bijwerken</option><option value="copy">Bewust als extra vraag toevoegen</option>
                  </select></label>
                  {row.candidates.length>1 && <label>Bestaande bouwsteen<select value={choice.targetId} onChange={e=>setAdoptionChoices(v=>({...v,[row.incoming.originKey]:{...choice,targetId:e.target.value}}))}><option value="">Kies een versie</option>{row.candidates.map(m=><option key={m.id} value={m.id}>{m.id} · {m.topic || 'Zonder onderwerp'}</option>)}</select></label>}
                  {old && <div><strong>Nu · {old.id}</strong><p>{draft.overrides[old.id]?.auditQuestion ?? old.question}</p><small>Onderwerp: {old.topic || 'Niet ingevuld'}</small></div>}
                  <div><strong>Nieuwe formulering</strong><p>{row.incoming.question}</p><small>Onderwerp: {row.incoming.topic || 'Niet ingevuld'}</small></div>
                </section>;
              })}
              {adoptionError && <p role="alert">{adoptionError}</p>}
              <div className="model-update-actions"><Button disabled={adoptionPlan.some(row=>adoptionChoices[row.incoming.originKey]?.mode==='update' && !adoptionChoices[row.incoming.originKey]?.targetId)} onClick={()=>{
                try {
                  const changedTopic=adoptionPlan.some(row=>adoptionChoices[row.incoming.originKey]?.mode==='update' && row.candidates.some(m=>m.id===adoptionChoices[row.incoming.originKey]?.targetId && m.topic!==row.incoming.topic));
                  commit(applyModelAdoption(draft,adoptionPlan,adoptionChoices) as Draft,'Modelvragen bijwerken');setAdoptingModel('');navigate('framework');
                  if(changedTopic)setResetNotice('Modelvragen bijgewerkt. Controleer ook of je doelstelling en onderzoeksvragen nog bij het nieuwe onderwerp passen.');
                }catch(e){setAdoptionError(e instanceof Error ? e.message : 'Modelvragen konden niet worden bijgewerkt.');}
              }}>Keuzes toepassen</Button><SheetClose render={<Button variant="outline"/>}>Annuleren</SheetClose></div>
            </SheetContent>
          </Sheet>
          <Sheet open={reloadOpen} onOpenChange={setReloadOpen}>
            <SheetContent className="project-recovery-sheet"><SheetHeader><SheetTitle>Opgeslagen project herladen?</SheetTitle>
              <SheetDescription>Niet-opgeslagen werk uit dit tabblad gaat bij herladen verloren. Bewaar eerst uw versie als u die wilt behouden.</SheetDescription></SheetHeader>
              <Button variant="outline" disabled={fileDownload.busy} onClick={()=>downloadProject('rijksmap-project-mijn-versie.json')}>Bewaar mijn versie</Button>
              {fileDownload.error && <p role="alert">{fileDownload.error}</p>}
              <Button disabled={fileDownload.busy} onClick={()=>window.location.reload()}>Herlaad opgeslagen project</Button>
              <SheetClose render={<Button variant="ghost"/>}>Annuleren</SheetClose>
            </SheetContent>
          </Sheet>
          <Dialog open={storageHelpOpen} onOpenChange={setStorageHelpOpen}>
            <ProjectUtilityContent title={storageBlocked.current?'Automatisch bewaren herstellen':'Projectopslag'}
              description={storageBlocked.current?'Bescherm eerst je werk voordat je het automatisch bewaren hervat.':'Je project wordt automatisch bewaard in deze browser, ook bij online gebruik. Het wordt niet automatisch in de online database opgeslagen.'}
              icon={<Save size={20}/>} className="project-storage-dialog" closeLabel="Projectopslag sluiten"
              footer={<><DialogClose render={<Button variant="ghost"/>}>Sluiten</DialogClose>
                {storageBlocked.current
                  ? <Button disabled={fileDownload.busy || !backupConfirmed || !resumeStoreRef.current} onClick={resumeSaving}>Huidige werk opslaan en doorgaan</Button>
                  : <Button disabled={fileDownload.busy} onClick={()=>downloadProject('rijksmap-project-huidig.json')}><Download size={16} aria-hidden="true"/>Bewaar huidige werk</Button>}
              </>}>
              {fileDownload.error && <p role="alert">{fileDownload.error}</p>}
              <div className="project-storage-status" data-state={storageBlocked.current?'blocked':'saved'}>
                {storageBlocked.current?<CircleAlert size={20} aria-hidden="true"/>:<Save size={20} aria-hidden="true"/>}
                <div><strong>{storageBlocked.current?'Automatisch bewaren staat uit':'Lokaal opgeslagen'}</strong><output>{storageBlocked.current?message:'Automatisch bewaren is ingeschakeld.'}</output></div>
              </div>
              <section className="project-utility-note"><h3>{storageBlocked.current?'Bewaar eerst je bestanden':'Een reservekopie voor later'}</h3>
                <p>{storageBlocked.current
                  ? !resumeStoreRef.current
                    ? 'De browseropslag kan nu niet worden gelezen. Bewaar je huidige werk voordat je herlaadt. Controleer de opslaginstellingen en open dit venster opnieuw om nogmaals te proberen.'
                    : resumeOriginal===null
                      ? 'Er is geen opgeslagen projectversie gevonden. Bewaar je huidige werk voordat je herlaadt; niet-opgeslagen werk kan dan verloren gaan.'
                      : 'Bij herladen wordt geprobeerd de eerder opgeslagen versie te openen. Bewaar de benodigde kopieën en kies daarna of je huidige werk die versie mag vervangen.'
                  : 'Browseropslag kan verdwijnen of vol raken. Download een projectbestand als reservekopie, of om verder te werken op een andere computer of website.'}</p>
              </section>
              {storageBlocked.current && <div className="storage-recovery-actions">
                <Button variant="outline" disabled={fileDownload.busy} onClick={()=>downloadProject('rijksmap-project-huidig.json')}><Download size={16} aria-hidden="true"/>Bewaar huidige werk</Button>
                {resumeOriginal!==null && <Button variant="outline" onClick={()=>download(resumeOriginal,'rijksmap-project-oorspronkelijk.json','application/json')}>Bewaar oorspronkelijke versie</Button>}
                <label className="creator-check" htmlFor="storage-backup-confirmed">
                  <Checkbox id="storage-backup-confirmed" checked={backupConfirmed} onCheckedChange={v=>setBackupConfirmed(Boolean(v))}/>
                  Ik heb de benodigde projectbestanden veilig bewaard.
                </label>
              </div>}
              <section className="project-utility-note"><h3>Lokale gegevens verwijderen</h3>
                <p>Nieuw project maakt het actieve project leeg, maar bewaart herstelkopieën en oude projectgegevens. Wil je alle lokale gegevens verwijderen? Bewaar eerst de benodigde bestanden, sluit alle tabbladen van Omnibus en verwijder daarna de sitegegevens voor dit website-adres via de browserinstellingen. Eerder gedownloade bestanden blijven op je computer staan.</p>
              </section>
            </ProjectUtilityContent>
          </Dialog>
          {page === "topics" && (
            <OpenThemes
              themes={workspaces}
              openIds={workspace.openIds}
              activeId={workspace.activeId}
              combined={combinedView}
              onCombine={() => setBrowseMode({ combined: true })}
              onOpen={openWorkspace}
              onClose={(id) => setWorkspace((w) => closeTheme(w, id, workspaces))}
              onExplore={() => navigate(activeTheme?.id.startsWith('process:')?'processes':'catalogue')}
            />
          )}
          {page === 'entry' ? <ResearchEntry route={researchRoute} disabled={!loaded} onChoose={route=>{setResearchRoute(route);navigate(route==='risk'?'risk-start':'start');}}/> : page === "start" ? (
            <InvestigationStart
              draft={draft}
              onChange={commit}
              navigate={(next) => {
                if (next === "reports") setReportScope("all");
                navigate(next);
              }}
              disabled={!loaded}
            />
          ) : ['risk-start','catalogue','processes'].includes(page) ? (
            <>
            <DiscoveryCatalogue views={collectionViews(discoveryViews,availableCollections,collections.mode,catalogueRouting.reports)}
              onPrepare={id=>{void prefetchCatalogue((catalogueRouting.workspaces[id]??[]).map(reportOverviewKey));}}
              included={draft.included} disabled={!loaded} onSelect={(ids,include)=>withContent(reportContentKeys(ids,catalogueRouting.reports),()=>commit(chooseCatalogueItems(draftRef.current,ids,include,baseFramework) as Draft))}
              guided={page==='risk-start'}
              area={page==='risk-start'?riskArea:undefined}
              onSources={()=>chooseRiskArea('laws')} onFrameworks={()=>chooseRiskArea('frameworks')} onModels={()=>chooseRiskArea('models')}
              view={directoryViews[page==='processes'?'processes':page==='catalogue'?'themes':discoveryView.axis]}
              onViewChange={patch=>{const axis=page==='processes'?'processes':page==='catalogue'?'themes':discoveryView.axis;setDirectoryViews(v=>({...v,[axis]:{...v[axis],...patch}}));}}
              axis={page==='processes'?'processes':page==='catalogue'?'themes':discoveryView.axis}
              onAxis={axis=>{if(page==='risk-start')chooseRiskArea(axis);setDiscoveryView({axis,category:''});if(page!=='risk-start')navigate(axis==='themes'?'catalogue':'processes');}}
              openIds={page==='risk-start'&&(riskArea==='laws'||riskArea==='frameworks')?(draft.investigation?.sourceIds||[]):page==='risk-start'&&riskArea==='models'?openModelIds:workspace.openIds} onOpen={openWorkspace}
              onWorkspace={()=>navigate(page==='risk-start'&&(riskArea==='laws'||riskArea==='frameworks')?'foundation-workspace':page==='risk-start'&&riskArea==='models'?'model-workspace':'topics')}
              onToggle={(id,open)=>setWorkspace(w=>open?openTheme(w,id,workspaces):closeTheme(w,id,workspaces))}>
              {(riskArea==='laws'||riskArea==='frameworks')?renderFoundations():riskArea==='models'?renderModels():null}
            </DiscoveryCatalogue>
            </>
          ) : page === "foundations" ? (
            renderFoundations()
          ) : page === "foundation-workspace" ? (
            <FoundationWorkspace
              prepareSource={(id,action)=>withContent([foundationOverviewKey(id,aboutViews.laws)],action)}
              prepareDetails={(id,action)=>withContent(['foundation:'+id],action)}
              overview={aboutViews.laws?'source':'norms'}
              onOverviewChange={value=>setAboutViews(v=>({...v,laws:value==='source'}))}
              key={builderGeneration}
              initialSource={foundationFocus}
              initialCriterionId={foundationCriterion}
              processId={sourceProcess}
              initialBrowse={foundationBrowse}
              onBrowseChange={changeFoundationBrowse}
              draft={draft}
              onChange={commit}
              disabled={!loaded}
              navigate={navigate}
            />
          ) : page === "report-themes" ? (
            <ThemeCatalogue
              framework={baseFramework}
              onProcesses={() => navigate("processes")}
              themes={collectionViews(legacyThemes,availableCollections,collections.mode,catalogueRouting.reports)}
              openIds={workspace.openIds}
              onOpen={openWorkspace}
              onDeselectAll={() => setWorkspace(restoreWorkspace(null, workspaces))}
              onToggle={(id, open) =>
                setWorkspace((w) => (open ? openTheme(w, id, workspaces) : closeTheme(w, id, workspaces)))
              }
              onReports={(id) => {
                setWorkspace((w) => openTheme(w, id, workspaces));
                setChoiceThemeId(id);
                setReportScope("open");
                setReportEntry((v) => v + 1);
                navigate("reports");
              }}
            />
          ) : page === "reports" ? (
            <ReportCatalogue
              entryRequest={reportEntry}
              onEntryComplete={() => setReportEntry(0)}
              reportChoice={{
                themes: workspaces.filter((t) => workspace.openIds.includes(t.id)),
                themeId: choiceTheme?.id ?? "",
                onTheme: setChoiceThemeId,
                enabled: (id) =>
                  !choiceTheme || reportEnabled(reportChoices.excluded, choiceTheme.id, id),
                onToggle: (id, enabled) => {
                  if (choiceTheme)
                    setReportChoices((v) => ({
                      ...v,
                      excluded: chooseReport(v.excluded, choiceTheme.id, id, enabled),
                    }));
                },
                ready: choicesReady,
                impact: (id) => reportNormImpact(framework, choiceTheme, id, draft),
              }}
              frameworks={reportScope==='audit' ? corpus.map(c=>c.framework) : activeReportFrameworks(corpus.map(c=>c.framework)).filter((f:Framework)=>allows('report',f.report.id))}
              themes={themes}
              reportIds={reportIds}
              auditReportIds={auditReportIds}
              scope={reportScope}
              onScope={setReportScope}
              onExplore={() => navigate("catalogue")}
              onOpen={(id) => {
                setReaderId(id);
                setReportEvidence(null);
                setReportPage(1);
                navigate("reader", id);
              }}
              onTheme={openWorkspace}
              onRisks={openReportRisks}
              riskReportIds={reportViews.map(t=>t.reportIds[0])}
            />
          ) : page === "reader" ? (
            <>
              <Button variant="link" onClick={() => navigate("reports")}>
                ← Rapportbibliotheek
              </Button>
              <LazyReportLibrary
                key={readerId}
                framework={reader.framework}
                source={reader.source}
                reportThemes={discoveryViews.filter((t:Theme) => !t.directoryHidden && t.reportIds.includes(readerId))}
                onRisks={reportViews.some(t=>t.reportIds[0]===readerId)?()=>openReportRisks(readerId):undefined}
                page={reportPage}
                onPage={setReportPage}
                onTopic={openWorkspace}
                evidence={framework.evidence.find((e) => e.id === reportEvidence)}
                onClearEvidence={() => setReportEvidence(null)}
                onReturn={returnToEvidence}
              />
            </>
          ) : page === "models" || page === 'model-workspace' ? (
            renderModels()
          ) : page === "export" || (page === "topics" && !activeTheme) ? null : (
            <>
              {editable && <MaterialEditor open={ownMaterialOpen} onClose={()=>setOwnMaterialOpen(false)} draft={draft} onChange={commit}/>}
              {!editable && <h1 className="sr-only">Normen · {combinedView ? "Alle open thema’s" : activeTheme?.title}</h1>}
              <Tabs
                value={editable?tab:aboutViews.reports?'about':'framework'}
                onValueChange={(value) => editable?setTab(String(value)):setAboutViews(v=>({...v,reports:value==='about'}))}
                className={"main-tabs " + (editable ? "personal-workspace" : "")}
              >
                {!editable&&<div className="law-view-actions">
                  <nav className="law-overview-tabs" aria-label="Kaderweergave"><button aria-pressed={!aboutViews.reports} onClick={()=>setAboutViews(v=>({...v,reports:false}))}>Normen</button><button aria-pressed={aboutViews.reports} onClick={()=>setAboutViews(v=>({...v,reports:true}))}>Over dit kader</button></nav>
                  <div className="report-view-actions"><Button onClick={()=>navigate('framework')}>Naar stap 3: Bouw je kader <ArrowRight size={16}/></Button></div>
                </div>}
                {!editable&&<TabsContent value="about"><ReportFrameworkAbout title={combinedView?'Alle open thema’s en processen':activeTheme?.title||'Referentiekader'} workspaces={browseThemes} reports={overview?.reports??corpus.filter(c=>browseThemes.some(t=>t.reportIds.includes(c.framework.report.id))).map(c=>c.framework)} lines={visibleLines} allLines={allBrowseLines} onChoice={openReportChoice} onRead={id=>{setReturnPage('topics');setReaderId(id);setReportEvidence(null);setReportPage(1);navigate('reader',id);}}/></TabsContent>}
                <TabsContent value="framework" id="working-area">
                  {!editable && (combinedView ? hiddenBrowseNorms > 0 : hiddenReportCount > 0) && (
                    <div className="report-choice-summary">
                      {combinedView
                        ? `${countLabel(hiddenBrowseNorms,'normen')} verborgen door rapportfilters in deze weergave.`
                        : `${hiddenReportCount} rapport${hiddenReportCount === 1 ? "" : "en"} uitgesloten in dit thema.`}{" "}
                      <Button
                        variant="link"
                        onClick={() => {
                          setChoiceThemeId(combinedView ? "" : (activeTheme?.id ?? null));
                          setReportScope("open");
                          navigate("reports");
                        }}
                      >
                        Rapportkeuze wijzigen
                      </Button>
                    </div>
                  )}
                  {!editable && reportNotice && (
                    <output className="navigation-notice">
                      {reportNotice}{" "}
                      <Button variant="ghost" onClick={() => setReportNotice("")}>
                        Sluiten
                      </Button>
                    </output>
                  )}
                  {editable && (
                    <ResearchBuilder
                      onAddMaterial={()=>setOwnMaterialOpen(true)}
                      onPendingQuestionChange={setPendingGuideQuestion}
                      models={modelLibrary.models}
                      key={`research-builder-${builderGeneration}`}
                      freshQuestions={builderGeneration > 0 && !draft.research?.questions.length}
                      framework={framework}
                      draft={draft}
                      disabled={!loaded}
                      onChange={commit}
                      onOpen={openBuildingBlock}
                      onExplore={() => {setCatalogueGroups(v=>({...v,foundations:''}));setCatalogueSearch('');setSourceProcess('');navigate("foundations");}}
                      themeIds={questionThemes}
                    />
                  )}
                  {!editable && visibleLines.length === 0 && (
                    <section className="empty-framework">
                      <h2>Geen normen binnen je collectie- en rapportkeuze</h2>
                      <p>
                        Kies hierboven een andere collectie of zet een rapport aan om de bijbehorende normen te bekijken. Je referentiekader blijft behouden.
                      </p>
                      <Button
                        onClick={() => {
                          setChoiceThemeId(combinedView ? "" : (activeTheme?.id ?? null));
                          setReportScope("open");
                          navigate("reports");
                        }}
                      >
                        Rapportkeuze wijzigen
                      </Button>
                    </section>
                  )}
                  {editable&&cioPointRequest.pointId&&<CioPointViewer key={`cio-viewer-${cioPointRequest.nonce}`} pointId={cioPointRequest.pointId} draft={draft} disabled={!loaded} onChange={commit} onClose={()=>setCioPointRequest(p=>({...p,pointId:''}))}/>}
                  {editable&&topicalPointRequest.pointId&&<TopicalLawBrowser key={`topical-viewer-${topicalPointRequest.nonce}`} sourceId={topicalPointRequest.sourceId} initialPointId={topicalPointRequest.pointId} viewerOnly draft={draft} disabled={!loaded} onChange={commit} navigate={()=>{}} onClose={()=>setTopicalPointRequest(p=>({...p,pointId:''}))}/>}
                  {editable&&admittedPointRequest.pointId&&<AdmittedLawBrowser key={`admitted-viewer-${admittedPointRequest.nonce}`} sourceId={admittedPointRequest.sourceId} initialPointId={admittedPointRequest.pointId} viewerOnly draft={draft} disabled={!loaded} onChange={commit} navigate={()=>{}} onClose={()=>setAdmittedPointRequest(p=>({...p,pointId:''}))}/>}
                  {editable&&wwkePointRequest.pointId&&<WwkePointViewer key={`wwke-viewer-${wwkePointRequest.nonce}`} pointId={wwkePointRequest.pointId} draft={draft} disabled={!loaded} onChange={commit} onClose={()=>setWwkePointRequest(p=>({...p,pointId:''}))}/>}
                  {pointRequest.id&&<ControlObjectivePilot reportCorpus={corpus} key={`report-viewer-${pointRequest.nonce}`} request={pointRequest} onClose={()=>setPointRequest(p=>({...p,id:'',field:undefined,pointId:undefined}))} lines={baseFramework.lines} draft={draft} disabled={!loaded} onChange={commit} onBuilder={()=>{setPointRequest(p=>({...p,id:''}));navigate('framework');}}/>}
                  <div hidden={visibleLines.length === 0}>
                    {editable ? (
                      <DeferredDetails className="research-matrix-details" summary="Bekijk alle gekozen bouwstenen">
                        <CompactMatrix
                          key={page}
                          viewKey="audit-selection"
                          onOpenReport={openLineReport}
                          lines={visibleLines}
                          draft={draft}
                          viewDraft={viewDraft}
                          disabled={!loaded}
                          onChange={commit}
                          onOpen={openBuildingBlock}
                          onOpenField={openBuildingBlock}
                          selected={detailsOpen && line ? line.id : ""}
                        />
                      </DeferredDetails>
                    ) : (
                      <ReportNormBrowser key={browseKey} title={combinedView?'Alle open thema’s en processen':activeTheme?.title||'Normen'} lines={visibleLines} draft={draft} viewDraft={viewDraft} counts={pointCounts} searchPoints={overview?.points} viewKey={browseKey} disabled={!loaded} onChange={commit} onOpen={openPointViewer} onPrepare={id=>{void prefetchCatalogue(reportContentKeys([id],catalogueRouting.reports));}} onSelect={selectReportOverviewRows} reveal={reveal} onRevealComplete={()=>setReveal(undefined)} resetRequest={activeReportView&&!combinedView?reportViewReset:0} onResetComplete={()=>setReportViewReset(0)}/>
                    )}
                    <Sheet open={detailsOpen && !!line} onOpenChange={setDetailsOpen}>
                      {line && <>
                      <SheetContent
                        className={"audit-detail" + (line.source_id ? " material-detail" : "")}
                        showCloseButton={false}
                      >
                        <SheetHeader>
                          <SheetTitle>
                            {normId(line.id)} · {line.title}
                            {line.provisionStatus && <span className="provision-status" title={line.provisionStatusDetails}>{line.provisionStatus}</span>}
                          </SheetTitle>
                          <SheetDescription>
                            {line.entity}
                            {!line.source_id && <> · {lineReport.title}</>}
                          </SheetDescription>
                          <div className="detail-actions">
                            <Button
                              hidden={!!line.source_id}
                              variant="outline"
                              onClick={() => showInTheme(line.id)}
                            >
                              Toon in thema
                            </Button>
                            <Button
                              variant="outline"
                              disabled={!loaded}
                              onClick={() =>
                                commit(
                                  selectReportRows(
                                    draft,
                                    reportPointCatalogue,
                                    [line.id],
                                    pointCounts[line.id] ? pointCounts[line.id].selected !== pointCounts[line.id].total : !draft.included.includes(line.id),
                                  ) as Draft,
                                )
                              }
                            >
                              {pointCounts[line.id] ? (pointCounts[line.id].selected === pointCounts[line.id].total ? "Toetspunten deselecteren" : "Alle toetspunten selecteren") : draft.included.includes(line.id)
                                ? "Uit selectie halen"
                                : "Opnemen in mijn referentiekader"}
                            </Button>
                            <SheetClose render={<Button variant="outline" />}>Sluiten</SheetClose>
                          </div>
                        </SheetHeader>
                        {line.source_id ? (
                          <div className="material-detail-body">
                            {line.sourcePointId && <section className="bd-criterion"><h3>{line.sourcePointId} · bovenliggende norm</h3><p>{line.parentCriterion}</p><p className="edit-note">Alleen dit toetspunt is als bouwsteen opgenomen. Doel, risico en beheersmaatregel blijven broncontext.</p></section>}
                            <SourceControlReference material={draft.investigation?.materials.find((m) => m.id === line.id)} criterion={<>
                              <h2>Norm in je onderzoek</h2>
                              <p className="edit-note">{line.id} · inclusief je eigen aanpassingen</p>
                              {([['criterion','Norm'],['objective','Waarom relevant?'],['auditQuestion','Vraag'],['procedure','Toetsing']] as const).map(([kind,label])=><section key={kind}><h3>{label}</h3><p>{draftValue(line,kind,draft)}</p></section>)}
                              <h3>Toepassing en voorwaarden uit de bron</h3><p>{draft.investigation?.materials.find(m=>m.id===line.id)?.sourceContext || 'Controleer de toepassing in de bron.'}</p>
                            </>} />
                            {line.sourcePointId ? <FrameworkFields framework={framework} line={line} draft={draft} readOnly={false} disabled={!loaded} onChange={commit} onEdit={edit} onEvidence={showEvidence}/> : <div className="material-form">
                              {(
                                ["criterion", "objective", "auditQuestion", "procedure"] as const
                              ).map((kind) => (
                                <label key={kind} htmlFor={`material-detail-${line.id}-${kind}`}>
                                  <span>
                                    {
                                      {
                                        criterion:
                                          line.materialKind === "model-question"
                                            ? "Indicator / onderzoeksfocus"
                                            : line.materialKind === "audit-coverage" ? "Auditdekkingspunt" : "Norm",
                                        objective: "Waarom relevant?",
                                        auditQuestion:
                                          line.materialKind === "model-question"
                                            ? "Interviewvraag"
                                            : "Toetsvraag",
                                        procedure:
                                          line.materialKind === "model-question"
                                            ? "Doorvragen"
                                            : "Toetsing",
                                      }[kind]
                                    }
                                  </span>
                                  <Textarea
                                    id={`material-detail-${line.id}-${kind}`}
                                    rows={4}
                                    maxLength={10000}
                                    value={draftValue(line,kind,draft)}
                                    onChange={(e) => edit(kind, e.target.value)}
                                    disabled={!loaded}
                                  />
                                </label>
                              ))}
                            </div>}
                            {line.materialKind !== "model-question" && (
                              <details className="material-planning">
                                <summary>Risico, beheersdoelstelling, maatregel en bewijs uitwerken</summary>
                                {(!line.sourcePointId ? ["risk", "controlObjective", "control"] as const : []).map((kind) => (
                                  <label
                                    key={kind}
                                    htmlFor={`material-planning-${line.id}-${kind}`}
                                  >
                                    {names[kind]}
                                    <Textarea
                                      id={`material-planning-${line.id}-${kind}`}
                                      value={draftValue(line,kind,draft)}
                                      maxLength={10000}
                                      onChange={(e) => edit(kind, e.target.value)}
                                      disabled={!loaded}
                                    />
                                  </label>
                                ))}
                                <label htmlFor={`material-planning-${line.id}-documents`}>
                                  Verwacht bewijs / documenten
                                  <Textarea
                                    id={`material-planning-${line.id}-documents`}
                                    value={
                                      draft.investigation?.materials.find((m) => m.id === line.id)
                                        ?.documents || ""
                                    }
                                    maxLength={10000}
                                    disabled={!loaded}
                                    onChange={(e) => {
                                      const wb = validateInvestigation(draft.investigation);
                                      commit({
                                        ...draft,
                                        investigation: {
                                          ...wb,
                                          materials: wb.materials.map(
                                            (m: Record<string, string>) =>
                                              m.id === line.id
                                                ? { ...m, documents: e.target.value }
                                                : m,
                                          ),
                                        },
                                      } as Draft);
                                    }}
                                  />
                                </label>
                              </details>
                            )}
                            <section
                              className="material-detail-source"
                              aria-label="Herkomst van deze bouwsteen"
                            >
                              <h3>Bron</h3>
                              <p>{lineReport.title}</p>
                              {(lineReport.edition || lineReport.location) && (
                                <p className="material-source-reference">
                                  {[lineReport.edition, lineReport.location]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                              {lineReport.url && (
                                <a
                                  className="external-source"
                                  href={lineReport.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open grondslag ↗
                                </a>
                              )}
                            </section>
                          </div>
                        ) : (
                          <>
                            <details className="classification-note">
                              <summary>Onderwerpindeling</summary>
                              <p>
                                {classification(line)
                                  .subjectIds.map(
                                    (id: string) => subjects.find((s) => s.id === id)?.title ?? id,
                                  )
                                  .join(" · ")}
                              </p>
                              <p>AI-voorstel voor navigatie; geen normbeoordeling.</p>
                              <p>{classification(line).rationale}</p>
                            </details>
                            <section className="selected-line">
                              {evidenceView.context.length>0 && <details key={lineReport.id} className="report-method-context"
                                open={evidenceView.context.some(e=>e.id===activeEvidence) ? true : undefined}>
                                <summary>Over dit onderzoek</summary>
                                <p className="edit-note">{lineReport.title} · Onderzoeksaanpak en beperkingen, geen onderbouwing van de norm zelf.</p>
                                {evidenceView.context.map(quote)}
                              </details>}
                              <Tabs
                                value={detail}
                                onValueChange={(value) => setDetail(String(value))}
                              >
                                <TabsList variant="line">
                                  <TabsTrigger value="chain">
                                    <PencilLine size={16} />
                                    {editable ? "Basisvelden bewerken" : "Basisvelden"}
                                  </TabsTrigger>
                                  {editable && (
                                    <TabsTrigger value="structure">
                                      <Link2 size={16} />
                                      Structuur & aanvullingen
                                    </TabsTrigger>
                                  )}
                                  <TabsTrigger value="relations">
                                    <Link2 size={16} />
                                    Samenhang & beoordeling maatregelen
                                  </TabsTrigger>
                                  <TabsTrigger value="sources">
                                    <BookOpen size={16} />
                                    Onderbouwing ({sourceEntries.length})
                                  </TabsTrigger>
                                </TabsList>
                                {(detail === "chain" || detail === "relations") && (
                                  <label
                                    className="detail-source-toggle"
                                    htmlFor="detail-show-sources"
                                  >
                                    <Checkbox
                                      id="detail-show-sources"
                                      checked={showSources}
                                      onCheckedChange={(v) => setShowSources(Boolean(v))}
                                    />
                                    Inhoudelijke bronverwijzingen uitklappen
                                  </label>
                                )}
                                {editable && (
                                  <TabsContent value="structure">
                                    <FrameworkStructure
                                      framework={framework}
                                      key={line.id}
                                      line={line}
                                      draft={draft}
                                      disabled={!loaded}
                                      onChange={commit}
                                      onEvidence={showEvidence}
                                    />
                                  </TabsContent>
                                )}
                                <TabsContent value="chain">
                                  <p className="edit-note">
                                    {editable
                                      ? "Pas de basisvelden aan voor uw audit. Uw wijzigingen blijven voorstellen; de bronanalyse verandert niet mee."
                                      : "Lees de oorspronkelijke thema-analyse en volg de bronverwijzingen. Selecteer dit onderdeel om het in Mijn referentiekader te configureren."}
                                  </p>
                                  <FrameworkFields
                                    framework={framework}
                                    line={line}
                                    draft={viewDraft}
                                    readOnly={!editable}
                                    disabled={!loaded}
                                    onChange={commit}
                                    onEdit={edit}
                                    onEvidence={showEvidence}
                                  />
                                  {editable && (
                                    <>
                                      <label htmlFor="audit-notes" className="notes-label">
                                        Uw auditnotities / aanvullende benodigde bronnen
                                      </label>
                                      <Textarea
                                        id="audit-notes"
                                        value={draft.notes[line.id] ?? ""}
                                        disabled={!loaded}
                                        maxLength={20000}
                                        placeholder="Welke aanvullende informatie of actuele norm heeft u nodig?"
                                        onChange={(e) =>
                                          commit({
                                            ...draft,
                                            notes: { ...draft.notes, [line.id]: e.target.value },
                                          })
                                        }
                                      />
                                    </>
                                  )}
                                </TabsContent>
                                <TabsContent value="relations">
                                  <p className="edit-note">
                                    Een bronverwijzing bij twee begrippen bewijst hun onderlinge
                                    relatie niet. Elke verbinding heeft daarom een eigen herkomst en
                                    onderbouwing.
                                  </p>
                                  <div className="relations">
                                    {sourceRelations(line).map((r, i) => {
                                      const changed =
                                        isEdited(line, r.from, viewDraft) ||
                                        isEdited(line, r.to, viewDraft);
                                      return (
                                        <section key={i}>
                                          <div className="relation-path">
                                            <strong>{names[r.from] ?? r.from}</strong>
                                            <ArrowRight size={18} aria-hidden="true" />
                                            <strong>{names[r.to] ?? r.to}</strong>
                                            <span
                                              className={
                                                "basis-tag " + (changed ? "USER_PROPOSAL" : r.basis)
                                              }
                                            >
                                              {changed
                                                ? "Herbeoordelen na uw wijziging"
                                                : provenance[r.basis]}
                                            </span>
                                          </div>
                                          <h3>{r.relation}</h3>
                                          <p>{r.reason}</p>
                                          {refs(r.evidence_ids)}
                                        </section>
                                      );
                                    })}
                                  </div>
                                  <h2>Wat is in het rapport over de maatregel vastgesteld?</h2>
                                  <p className="edit-note">
                                    Deze beoordeling betreft de oorspronkelijke broncontext, niet uw
                                    aangepaste maatregel. Aanwezigheid bewijst geen werking; werking
                                    bewijst niet automatisch doelbereik.
                                  </p>
                                  <div className="control-status">
                                    {Object.entries(line.controlStatus).map(([key, status]) => (
                                      <section key={key}>
                                        <h3>
                                          {
                                            {
                                              design: "Opzet",
                                              implementation: "Bestaan / invoering",
                                              operation: "Werking",
                                            }[key]
                                          }
                                        </h3>
                                        <strong>{statuses[status.value] ?? status.value}</strong>
                                        <p>{status.explanation}</p>
                                        {refs(status.evidence_ids)}
                                      </section>
                                    ))}
                                  </div>
                                </TabsContent>
                                <TabsContent value="sources">
                                  <section ref={evidenceRef} className="evidence-section">
                                    <p className="edit-note">
                                      {lineReport.title} · Passages die deze bouwsteen inhoudelijk onderbouwen.
                                    </p>
                                    {evidenceView.focused && (
                                      <div className="focused-evidence">
                                        <p>Geselecteerde bronverwijzing</p>
                                        {quote(evidenceView.focused)}
                                        <Button
                                          variant="link"
                                          onClick={() => setActiveEvidence(null)}
                                        >
                                          Selectie opheffen
                                        </Button>
                                      </div>
                                    )}
                                    {evidenceView.remaining.map(quote)}
                                  </section>
                                </TabsContent>
                              </Tabs>
                            </section>
                          </>
                        )}
                      </SheetContent>
                      </>}
                    </Sheet>
                  </div>
                </TabsContent>

              </Tabs>
            </>
          )}

          </div>
        </main>
        <ProductFooter />
      </div>
    </EvidenceDisplayContext.Provider>
    </CollectionContext.Provider>
  );
}
