"use client";
import {countLabel} from '@/lib/display-count.mjs';
import { normId } from "@/lib/norm-navigation.mjs";
import LegacyCioNotice from "./legacy-cio-notice";
import TermHelp from './term-help';
import QuestionCountHelp from './question-count-help';
import { buildingBlockHeading, groupBuildingBlocks } from '@/lib/workflow-readability.mjs';
import {objectiveGroupsForDraft} from '@/lib/control-objectives.mjs';
import QuestionBuildingBlocks from './question-building-blocks';
import { WorkflowIntro, WorkflowOutcome } from './workflow-patterns';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Drag surfaces supplement explicit keyboard/touch controls and retain section/list semantics. */
import { useRef, useState, useEffect, useMemo, useId } from "react";
import { GripVertical, Plus, MoreHorizontal, X, PenLine, Layers, ArrowRight, ArrowLeft } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Draft, Framework, ResearchQuestion } from "@/lib/framework-types";
import {
  researchOf,
  addQuestion,
  editQuestion,
  deleteQuestion,
  moveQuestion,
  linkLine,
  unlinkLine,
  unlinkQuestionLines,
  linkQuestionLines,
  questionLineIds,
  questionNumbers,
  questionLabel,
  fieldIncluded,
  unassignedIds,
  setQuestionDesign,
} from "@/lib/research-plan.mjs";
import { directionLabel } from "@/lib/research-directions.mjs";
import QuestionExamples from './question-examples';
import ProposalCoverage, {type MissingCriterion} from './proposal-coverage';
import QuestionSubjectInput from './question-subject-input';
import QuestionWordingCycle from './question-wording-cycle';
import {proposalFormulation} from '@/lib/research-question-formulations.mjs';
import { appendUniqueQuestion, addOwnSubquestions, mappedQuestionSuggestions, setQuestionSubject } from '@/lib/question-writing.mjs';
import {questionStartPreview,rankedQuestionStarts,existingQuestionStart} from '@/lib/question-start.mjs';
import {questionMenuChoices,applyQuestionMenu,savedSubquestionKey} from '@/lib/question-menu.mjs';
import {cioSourceId} from '@/lib/cio-law-data.mjs';
import { normDrop, applyGroupDrop } from "@/lib/research-flow.mjs";
import {
  centralProposals, subProposals, adoptSubProposal, proposalReuseId, applyProposalWording,
  modelQuestionPlan, adoptModelQuestionPlan,
  sourceQuestionPlan, adoptSourceQuestionPlan,
  processQuestionPlan, adoptProcessQuestionPlan,
} from "@/lib/research-proposals.mjs";
import type { LibraryModel } from "./model-library";
import { filterLines } from "@/lib/workspace-view.mjs";
import FullTextPreview from "./full-text-preview";
import { sourceFields } from "@/lib/framework-source-items.mjs";
import { draftValue, basisLabels } from "@/lib/framework-model.mjs";

type Drag = { type: "line"; lineId: string; from: string | null } | {type:'group';lineId:string;lineIds:string[];from:string|null};
type SubSuggestion = {key:string;text:string;ids:string[];label?:string;scopeNote?:string;missingCriteria?:MissingCriterion[];hint?:string;existingId?:string;detail?:string};
function QuestionBranch({questions,renderQuestion}:{questions:ResearchQuestion[];renderQuestion:(question:ResearchQuestion)=>React.ReactNode}) {
  return <>{questions.map(renderQuestion)}</>;
}
export default function ResearchBuilder({
  framework,
  draft,
  disabled,
  onChange,
  onOpen,
  onExplore,
  themeIds,
  models = [],
  freshQuestions = false,
  onPendingQuestionChange,
  onAddMaterial,
}: {
  framework: Framework;
  draft: Draft;
  disabled: boolean;
  onChange: (d: Draft) => void;
  onOpen: (id: string) => void;
  onExplore?: () => void;
  themeIds: string[];
  models?: LibraryModel[];
  freshQuestions?: boolean;
  onPendingQuestionChange?: (pending: boolean) => void;
  onAddMaterial?: () => void;
}) {
  const checkboxId=useId();
  const r = researchOf(draft) as NonNullable<Draft["research"]>;
  const numbers = questionNumbers(draft);
  const roots = r.questions.filter((q) => q.parent_id === null);
  const [direction, setDirection] = useState(draft.investigation?.goal?.direction || "");
  const [chosenTopic, setChosenTopic] = useState("");
  const [chosenModelId, setChosenModelId] = useState("");
  const [chosenProposalKey, setChosenProposalKey] = useState("");
  const [ownCentral,setOwnCentral]=useState(false);
  const [startRoute,setStartRoute]=useState<'choice'|'own'|'suggested'>('choice');
  const [alternatives,setAlternatives]=useState(false);
  const [subject,setSubject]=useState(draft.investigation?.goal?.subject || '');
  const [ownSubs,setOwnSubs]=useState<string[]>([]);
  const [directPlanIds,setDirectPlanIds]=useState<string[]>([]);
  const ownText=useRef('');
  const ownSubject=useRef(draft.investigation?.goal?.subject || '');
  const [centralTarget, setCentralTarget] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState("dimensions");
  const [chosenSubKeys, setChosenSubKeys] = useState<string[]>([]);
  const [subquestionDetail,setSubquestionDetail]=useState<'broad'|'specific'>('specific');
  const [subFormulations,setSubFormulations]=useState<Record<string,{base:string;text:string}>>({});
  const proposalContext = { themeIds, framework, models, direction };
  const proposals = centralProposals(draft, proposalContext);
  const starts=useMemo(()=>rankedQuestionStarts(draft,{themeIds,framework,models,direction,targetId:centralTarget,includeAccepted:true}),[draft,themeIds,framework,models,direction,centralTarget]);
  function pickProposal(p: typeof proposals[number]) {
    if(startRoute==='choice'&&chosenProposalKey===p.key&&firstText.trim()&&!ownCentral){setStartRoute('suggested');setFocusId('__composer__');return;}
    const existing=existingQuestionStart(draft,p);
    if(startRoute==='choice'&&existing?.id===centralTarget&&firstText.trim()&&!ownCentral){setStartRoute('suggested');setFocusId('__composer__');return;}
    if(existing&&(!centralTarget||centralTarget===existing.id)){chooseCentral(existing.id);return;}
    const detail=roots.find(q=>q.id===centralTarget)?.subquestionDetail || 'specific';
    const preview=questionStartPreview(draft,p,{...proposalContext,targetId:centralTarget,subquestionDetail:detail});
    setSubquestionDetail(detail);setSubFormulations({});
    setOwnCentral(false);setFirstText(p.text);setChosenTopic(p.topic||'');setChosenModelId(p.modelId||'');setChosenProposalKey(p.key);
    setChosenSubKeys(centralTarget?r.questions.filter(q=>q.parent_id===centralTarget).map(savedSubquestionKey):preview.defaultKeys);setModelMode('dimensions');setFirstOrigin('suggested');
    setDirectPlanIds(preview.directIds);
    setSubject(p.topic || draft.investigation?.goal?.subject || '');
    setStartRoute('suggested');setAlternatives(false);setProposalQuery('');setFocusId('__composer__');
  }
  function startOwn() {
    setCentralTarget(null);setSubFormulations({});setOwnSubs([]);
    setSubject(ownSubject.current);
    setStartRoute('own');setOwnCentral(true);setFirstText(ownText.current);setFirstOrigin('user');
    setChosenProposalKey('');setChosenModelId('');setChosenTopic('');setModelMode('manual');setChosenSubKeys([]);setDirectPlanIds([]);setFocusId('__composer__');
  }
  const scopedSubSuggestions = (d: Draft, id: string, target: string | null = null):SubSuggestion[] => mappedQuestionSuggestions(subProposals(d, id, target, proposalContext),d);
  const subSuggestionReuseId = (d: Draft, id: string, key: string) => proposalReuseId(d, id, key, proposalContext);
  const adoptSubSuggestion = (d: Draft, id: string, key: string) => adoptSubProposal(d, id, key, proposalContext);
  const freeSuggestionCount = (ids: string[]) => ids.filter(id=>!(draft.research?.links||[]).some(link=>link.line_id===id)).length;
  const applySubQuestionWording = (d: Draft, id: string, key: string) => applyProposalWording(d, id, key, proposalContext);
  const [proposalQuery, setProposalQuery] = useState("");
  const [firstChoice, setFirstText] = useState<string | null>("");
  // Empty is a deliberate choice, including after clearing and reloading.
  // Suggestions become input only after the auditor explicitly picks one.
  const firstText = firstChoice ?? "";
  const activeProposal = ownCentral ? undefined : proposals.find(p => p.key === chosenProposalKey && p.text === firstText) || proposals.find(p => p.text === firstText);
  const selectedModelId = ownCentral ? "" : chosenModelId || activeProposal?.modelId || "";
  const modelPlan = selectedModelId ? modelQuestionPlan(draft, selectedModelId, proposalContext) : null;
  const selectedSourceId = ownCentral ? undefined : (chosenProposalKey || activeProposal?.key || roots.find(q=>q.id===centralTarget)?.planKey || "").match(/^source:([^:]+)/)?.[1];
  const composerContext={...proposalContext,allowOverlap:true,subquestionDetail:selectedSourceId===cioSourceId?subquestionDetail:'specific'};
  const sourcePlan = !modelPlan && selectedSourceId ? sourceQuestionPlan(draft,selectedSourceId,direction,composerContext.subquestionDetail) : null;
  const selectedProcessId = ownCentral ? undefined : (chosenProposalKey || activeProposal?.key || roots.find(q=>q.id===centralTarget)?.planKey || '').match(/^process:([^:]+)/)?.[1];
  const processPlan = selectedProcessId ? processQuestionPlan(draft,selectedProcessId,direction) : null;
  const designTopic = chosenTopic || activeProposal?.topic || (proposals.length === 1 ? proposals[0].topic : "");
  const selectedDesign = !modelPlan && direction && designTopic ? {direction, topic: designTopic} : null;
  const [choosing, setChoosing] = useState(false);
  const pendingQuestion = Boolean((firstText.trim() || ownSubs.some(t=>t.trim()) || subject.trim() !== (draft.investigation?.goal?.subject || '').trim()) && (!roots.length || choosing));
  useEffect(() => { onPendingQuestionChange?.(pendingQuestion); }, [pendingQuestion, onPendingQuestionChange]);
  useEffect(() => () => { onPendingQuestionChange?.(false); }, [onPendingQuestionChange]);
  const alreadyAdded = roots.some(
    (q) =>
      q.id !== centralTarget &&
      (!selectedModelId || q.modelId === selectedModelId) &&
      q.text.trim().toLocaleLowerCase("nl") === firstText.trim().toLocaleLowerCase("nl"),
  );
  const [firstOrigin, setFirstOrigin] = useState<"user" | "suggested">("suggested");
  const [showInterviewText, setShowInterviewText] = useState(false);
  const goalDirection=draft.investigation?.goal?.direction || '';
  const goalSubject=draft.investigation?.goal?.subject || '';
  const [previousGoal,setPreviousGoal]=useState({direction:goalDirection,subject:goalSubject});
  if(previousGoal.direction!==goalDirection || previousGoal.subject!==goalSubject) {
    setPreviousGoal({direction:goalDirection,subject:goalSubject});
    setDirection(goalDirection);
    if (firstOrigin === 'suggested' && !ownCentral) {
      setFirstText(null); setChosenTopic(''); setChosenModelId(''); setChosenProposalKey('');
    }
  }
  const [query, setQuery] = useState("");
  const [onlyFree, setOnlyFree] = useState(true);
  const [bankPage, setBankPage] = useState(0);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const controlPointer = useRef(false);
  const skipMenuFocus = useRef(false);
  const pickerInput = useRef<HTMLButtonElement>(null);
  const pickerClose = useRef<HTMLButtonElement>(null);
  const pickerReturn = useRef<HTMLElement | null>(null);
  const pickerDestination = useRef("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const suppressClick = useRef<string | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [over, setOver] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState("");
  const [manage, setManage] = useState("");
  const [bulkTarget,setBulkTarget]=useState('');
  const bulkDestination=r.questions.some(q=>q.id===bulkTarget)?bulkTarget:'';
  const [remove, setRemove] = useState("");
  const cancelRemove=useRef<HTMLButtonElement>(null);
  const removeReturn=useRef<HTMLElement|null>(null);
  const removingQuestion=r.questions.find(q=>q.id===remove);
  const removingChildren=r.questions.filter(q=>q.parent_id===remove).length;
  const [suggestFor, setSuggestFor] = useState("");
  const [picker, setPicker] = useState<{ lineId: string; from: string | null } | null>(null);
  const [target, setTarget] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [focusId, setFocusId] = useState("");
  const surface = useRef<HTMLElement>(null);
  const firstInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (freshQuestions) firstInput.current?.focus(); }, [freshQuestions]);
  const free = unassignedIds(draft) as string[];
  const selected = objectiveGroupsForDraft(framework.lines.filter((l) => draft.included.includes(l.id)),draft) as Framework['lines'];
  const filtered = filterLines(selected, draft, query).filter(
    (l: { id: string }) => !onlyFree || free.includes(l.id),
  ) as Framework["lines"];
  const page = Math.min(bankPage, Math.max(0, Math.ceil(filtered.length / 20) - 1));
  const bank = filtered.slice(page * 20, page * 20 + 20);
  const ordered = roots.flatMap((q) => [q, ...r.questions.filter((s) => s.parent_id === q.id)]);
  const targets = ordered.map((q) => ({ value: q.id, label: questionLabel(draft, q) }));
  useEffect(() => {
    if (focusId) {
      (focusId === '__choice__' ? surface.current?.querySelector<HTMLElement>('#question-entry-title') : focusId === '__composer__' ? surface.current?.querySelector<HTMLElement>('#composer-title') : focusId === "__start__"
        ? firstInput.current
        : surface.current?.querySelector<HTMLElement>('[data-question-id="' + focusId + '"]')
      )?.focus();
      const timer = setTimeout(() => setFocusId(""), 0);
      return () => clearTimeout(timer);
    }
  }, [focusId, draft]);
  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!drag) return;
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dragRef.current = null;
        setDrag(null);
        setOver("");
        setMessage("Slepen geannuleerd.");
      }
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [drag]);
  useEffect(() => {
    if (!message) return;
    const show = setTimeout(() => setFeedbackVisible(true), 0);
    const hide = setTimeout(() => setFeedbackVisible(false), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [message]);
  function finalMenuFocus() {
    if (skipMenuFocus.current) {
      skipMenuFocus.current = false;
      return false;
    }
    return true;
  }
  function blockedDrop(e: React.DragEvent) {
    return Boolean(
      (e.target as HTMLElement).closest(
        "[data-no-drop],input,[contenteditable=true],textarea:not([data-question-id])",
      ),
    );
  }
  function commit(next: () => Draft, notice = "") {
    try {
      onChange(next());
      setMessage(notice);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "De wijziging kon niet worden toegepast.");
      return false;
    }
  }
  function chooseCentral(id: string | null = null) {
    setChosenSubKeys(r.questions.filter(q=>q.parent_id===id&&id!==null).map(savedSubquestionKey));

    setOwnCentral(false);setOwnSubs([]);ownText.current='';setAlternatives(false);
    ownSubject.current=draft.investigation?.goal?.subject || '';
    setStartRoute(id?'suggested':'choice');
    const current = roots.find(q => q.id === id);
    setSubquestionDetail(current?.subquestionDetail || 'specific');setSubFormulations({});
    setSubject(current?.subject ?? current?.researchDesign?.topic ?? draft.investigation?.goal?.subject ?? '');
    setDirection(current?.researchDesign?.direction || draft.investigation?.goal?.direction || "");
    setChosenTopic(current?.researchDesign?.topic || "");
    setChosenModelId(current?.modelId || "");
    setChosenProposalKey(current?.planKey || (current?.modelId?'model:'+current.modelId:''));
    setModelMode(id?'dimensions':'manual');setDirectPlanIds([]);
    setCentralTarget(id);
    setChoosing(true);
    setFirstText(current?.text || null);
    setFirstOrigin(current?.origin || "suggested");
    setFocusId(id?'__composer__':'__choice__');
  }
  function create(parent: string | null, text = "", origin: "user" | "suggested" = "user") {
    const result = addQuestion(draft, parent, text, origin);
    if (
      commit(
        () => (parent === null && text.trim() && selectedDesign
          ? setQuestionDesign(result.draft, result.question.id, selectedDesign) : result.draft) as Draft,
        parent ? "Deelvraag toegevoegd." : "Centrale vraag toegevoegd.",
      )
    ) {
      setChoosing(false);
      setEditing(text.trim() ? "" : result.question.id);
      setFocusId(result.question.id);
    }
  }
  // Preview and save use the same root and the same selectable proposal list.
  // Creating a preview never changes the workspace.
  function prepareCentral() {
      const current=roots.find(q=>q.id===centralTarget);
      if(current&&(current.planKey===chosenProposalKey || current.modelId===selectedModelId && Boolean(selectedModelId) || !chosenProposalKey)) {
        // Reopening is an edit, not a fresh adoption: retain direct links,
        // identity, manual link mode and custom research design.
        return {draft:editQuestion(draft,current.id,firstText,firstOrigin),questionId:current.id};
      }
      if (modelPlan) {
        return adoptModelQuestionPlan(draft, selectedModelId, modelMode, proposalContext,
          {targetId: centralTarget, text: firstText, origin: firstOrigin, design: selectedDesign, selectedKeys: []});
      }
      if(sourcePlan) {
        return adoptSourceQuestionPlan(draft,selectedSourceId,modelMode,
          {targetId:centralTarget,text:firstText,origin:firstOrigin,design:selectedDesign,selectedKeys:[],subquestionDetail:composerContext.subquestionDetail});
      }
      if(processPlan) {
        return adoptProcessQuestionPlan(draft,selectedProcessId,modelMode,
          {targetId:centralTarget,text:firstText,origin:firstOrigin,design:selectedDesign,selectedKeys:[]});
      }
      const added = centralTarget ? {draft: editQuestion(draft, centralTarget, firstText, firstOrigin), question: {id: centralTarget}}
        : addQuestion(draft, null, firstText, firstOrigin);
      const savedId = added.question.id;
      let next = setQuestionDesign(added.draft, savedId, selectedDesign);
      if (ownCentral || chosenProposalKey.startsWith('item:') || (chosenProposalKey && activeProposal && !activeProposal.modelId)) next = {...next, research: {...researchOf(next), questions: researchOf(next).questions.map((q: ResearchQuestion) => {
        if(q.id!==savedId)return q;
        const ownQuestion = {...q};
        delete ownQuestion.modelId;
        delete ownQuestion.planKey;
        delete ownQuestion.linkMode;
        return ownQuestion;})}};
      return {draft: next as Draft, questionId: savedId};
  }
  const centralPreview = firstText.trim() && (!roots.length || choosing) && (centralTarget || r.questions.length < 200) ? prepareCentral() : null;
  const canSwitchDetail=!ownCentral&&selectedSourceId===cioSourceId;
  const allSelectableSubs:SubSuggestion[]=centralPreview&&!chosenProposalKey.startsWith('item:') ? questionMenuChoices(centralPreview.draft,centralPreview.questionId,composerContext) : [];
  const selectableSubs=canSwitchDetail?allSelectableSubs.filter(s=>s.detail===subquestionDetail):allSelectableSubs;
  const chosenSubs=chosenSubKeys.flatMap(key=>allSelectableSubs.filter(s=>s.key===key));
  const broadChosen=chosenSubs.filter(s=>s.key.includes(':broad:')).length;
  const subText=(s:SubSuggestion)=>subFormulations[s.key]?.base===s.text?proposalFormulation(s.text,subFormulations[s.key].text):s.text;
  function switchSubquestionDetail(detail:'broad'|'specific') {
    if(disabled||detail===subquestionDetail||!canSwitchDetail||!centralPreview)return;
    // The toggle changes the menu, never the selection from the other menu.
    setSubquestionDetail(detail);
  }
  const alternativeStarts=starts.filter(s=>s.proposal.key!==chosenProposalKey);
  function acceptCentral() {
    let savedId = "";
    if (!commit(() => {
      const result = prepareCentral();
      savedId = result.questionId;
      let next = setQuestionSubject(result.draft,savedId,subject);
      if(!ownCentral)next=applyQuestionMenu(next,savedId,allSelectableSubs,chosenSubKeys,
        Object.fromEntries(chosenSubs.map(s=>[s.key,subText(s)])),composerContext);
      next=addOwnSubquestions(next,savedId,ownSubs);
      if (!ownCentral) for(const id of directPlanIds) if(next.included.includes(id)&&!researchOf(next).links.some((l:{line_id:string})=>l.line_id===id))next=linkLine(next,id,savedId);
      return next as Draft;
    }, centralTarget ? "Vraagopzet bijgewerkt. Je gekozen bouwstenen blijven behouden." : "Vraagopzet opgeslagen. Je gekozen bouwstenen blijven behouden.")) return;
    setOwnSubs([]);ownText.current="";setChoosing(false); setEditing(""); setFocusId(savedId); setCentralTarget(null); setChosenSubKeys([]);
  }
  function end() {
    dragRef.current = null;
    setDrag(null);
    setOver("");
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      suppressClick.current = null;
    }, 350);
  }
  function start(e: React.DragEvent, payload: Drag) {
    if (disabled || controlPointer.current || (e.target as HTMLElement).closest("[data-no-drag]")) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    dragRef.current = payload;
    setDrag(payload);
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("application/x-rijksmap-item", payload.lineId);
    if (clickTimer.current) clearTimeout(clickTimer.current);
    suppressClick.current = payload.lineId;
    setMessage("Sleep " + payload.lineId + " naar een vraag.");
  }
  function feedback(e: React.DragEvent, id: string) {
    const payload = dragRef.current;
    if (!payload || disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const result = normDrop(draft, payload, id, blockedDrop(e));
    // The workspace accepts cancellation drops too, avoiding native text/paste actions.
    e.dataTransfer.dropEffect = result.valid && result.action === "copy" ? "copy" : "move";
    setOver(result.valid ? id : "");
    setMessage(result.label);
  }
  function leave(e: React.DragEvent) {
    if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget))
      setOver("");
  }
  function drop(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const payload = dragRef.current;
    if (!payload || disabled) {
      end();
      return;
    }
    const result = normDrop(draft, payload, id, blockedDrop(e));
    if (result.valid) {
      const okay = commit(
        () =>
          payload.type==='group' ? applyGroupDrop(draft,payload,id) as Draft : result.action === "unlink"
            ? (unlinkLine(draft, payload.lineId, payload.from) as Draft)
            : (linkLine(draft, payload.lineId, id, payload.from) as Draft),
        result.action === "unlink"
          ? payload.lineId +
              " uit deze vraag gehaald; blijft geselecteerd." +
              (r.links.some((l) => l.line_id === payload.lineId && l.question_id !== payload.from)
                ? " Nog gekoppeld aan een andere vraag."
                : "")
          : payload.lineId + " gekoppeld.",
      );
      if (okay && id !== "bank") setFocusId(id);
    } else
      setMessage(
        result.label === "Al aan deze vraag gekoppeld"
          ? result.label
          : "Niet verplaatst. Sleep de norm naar een vraag.",
      );
    end();
  }
  function changeOrder(q: ResearchQuestion, delta: number) {
    const siblings = r.questions.filter((s) => s.parent_id === q.parent_id),
      index = siblings.findIndex((s) => s.id === q.id),
      before = delta < 0 ? siblings[index - 1]?.id : (siblings[index + 2]?.id ?? null);
    commit(() => moveQuestion(draft, q.id, q.parent_id, before) as Draft, "Volgorde aangepast.");
  }
  function openPicker(id: string, from: string | null, fromMenu = false, originQuestion = from) {
    skipMenuFocus.current = fromMenu;
    pickerDestination.current = "";
    const origin = originQuestion
      ? surface.current
          ?.querySelector('[data-question-id="' + originQuestion + '"]')
          ?.closest(".research-question")
          ?.querySelector(".question-norms")
      : surface.current?.querySelector(".bank-items");
    pickerReturn.current =
      origin?.querySelector<HTMLElement>(
        '[data-line-id="' +
          id +
          '"] ' +
          (fromMenu
            ? '[data-slot="dropdown-menu-trigger"]'
            : '[aria-label="Koppel ' + id + ' aan een vraag"]'),
      ) ?? null;
    setPicker({ lineId: id, from });
    setTargetQuery("");
    setTarget(
      targets.find(
        (t) =>
          t.value !== from && !r.links.some((l) => l.line_id === id && l.question_id === t.value),
      )?.value ?? "",
    );
  }
  function item(id: string, from: string | null) {
    const line = framework.lines.find((l) => l.id === id);
    if (!line) return null;
    const previewKinds = line.sourcePointId ? (["objective", "risk", "controlObjective", "control", "criterion"] as const) : line.source_id
      ? (["criterion", "auditQuestion", "procedure"] as const)
      : (["objective", "risk", "controlObjective", "control"] as const);
    const preview = previewKinds.flatMap((kind) =>
      sourceFields(line, kind)
        .filter((field: { id: string }) => fieldIncluded(draft, id, field.id))
        .map((field: { id: string; text: string; basis: string }) => ({
          label: {
            objective: "Doel",
            risk: "Risico",
            controlObjective: "Beheersdoelstelling",
            control: "Beheersmaatregel",
            criterion: line.materialKind === "model-question" ? "Onderzoeksfocus" : "Norm",
            auditQuestion: "Vraag",
            procedure: "Doorvragen / toetsing",
          }[kind],
          text: draftValue(line, field.id, draft),
          basis:
            draft.overrides[id]?.[field.id] !== undefined
              ? "Eigen bewerking"
              : ((basisLabels as Record<string, string>)[field.basis] ?? "Herkomst bekijken"),
        })),
    );
    return (
      <div
        className={
          "research-item " + (drag?.lineId === id && drag?.from === from ? "item-dragging" : "")
        }
        key={id}
        data-line-id={id}
        draggable={!disabled}
        onPointerDownCapture={(e) => {
          controlPointer.current = Boolean((e.target as HTMLElement).closest("[data-no-drag]"));
        }}
        onDragStart={(e) => start(e, { type: "line", lineId: id, from })}
        onDragEnd={() => {
          if (dragRef.current) setMessage("Niet verplaatst.");
          end();
        }}
        onClickCapture={(e) => {
          if (
            suppressClick.current === id &&
            !(e.target as HTMLElement).closest("[data-no-drag]")
          ) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <GripVertical className="card-grip" size={17} aria-hidden="true" />
        <div className="research-item-label">
          {line.source_id && (
            <span className="material-kind">
              {line.materialKind === "model-question"
                ? "Modelvraag"
                : line.materialKind === "audit-coverage"
                  ? "Auditdekking"
                  : line.sourcePointId || line.sourceControlId || "Eigen norm"}
            </span>
          )}
          <FullTextPreview
            text={normId(id) + " · " + buildingBlockHeading(line).title}
            label={"Bekijk " + id + ": " + line.title}
            onOpen={() => onOpen(id)}
            suspended={Boolean(drag)}
            preview={preview}
            eyeLabel={"Bekijk inhoud van " + id}
          />
          {buildingBlockHeading(line).context && <small className="building-block-context">{buildingBlockHeading(line).context}</small>}
          {showInterviewText && line.materialKind === 'model-question' && <p className="building-block-question">{draftValue(line, 'auditQuestion', draft)}</p>}
          {line.provisionStatus && <span className="provision-status" title={line.provisionStatusDetails}>{line.provisionStatus}</span>}
        </div>
        {from === null ? (
          <Button
            data-no-drag
            variant="ghost"
            disabled={disabled || !roots.length}
            aria-label={"Koppel " + id + " aan een vraag"}
            title="Koppelen zonder slepen"
            onClick={() => openPicker(id, null)}
          >
            Koppelen
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              data-no-drag
              render={<Button variant="ghost" aria-label={"Opties voor " + id} />}
            >
              <MoreHorizontal size={17} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="research-menu" finalFocus={()=>finalMenuFocus()}>
              <DropdownMenuItem disabled={disabled} onClick={() => openPicker(id, from, true)}>
                Koppeling verplaatsen…
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled}
                onClick={() => openPicker(id, null, true, from)}
              >
                Ook aan een andere vraag koppelen…
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled}
                onClick={() => {
                  commit(
                    () => unlinkLine(draft, id, from) as Draft,
                    id + " ontkoppeld; selectie blijft behouden.",
                  );
                  skipMenuFocus.current = true;
                  setFocusId(from);
                }}
              >
                Ontkoppelen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }
  function question(q: ResearchQuestion) {
    const children = r.questions.filter((s) => s.parent_id === q.id),
      direct = questionLineIds(draft, q.id) as string[],
      total = questionLineIds(draft, q.id, true).length;
    const siblings = r.questions.filter((s) => s.parent_id === q.parent_id),
      position = siblings.findIndex((s) => s.id === q.id);
    const proposed = scopedSubSuggestions(
      draft,
      q.parent_id ?? q.id,
      q.parent_id ? q.id : null,
    ) as {
      key: string;
      text: string;
      ids: string[];
      label?: string;
      scopeNote?: string;
      missingCriteria?: MissingCriterion[];
      hint?: string;
    }[];
    const material=()=> (<>
        <div className="question-norms">
          {selected.some(l=>direct.includes(l.id)&&l.collectionGroup) ?
            (groupBuildingBlocks(direct.map(id=>selected.find(l=>l.id===id)).filter(Boolean)) as {id:string;title:string;sourceTitle:string;lines:Framework['lines']}[]).map(group=><section className="attached-block-group" key={group.id}>
              <div className="group-drag-handle" draggable={!disabled} onPointerDown={()=>{controlPointer.current=false;}}
                aria-label={'Sleep gekoppelde groep '+group.title} title="Sleep deze groep naar een andere vraag om de koppelingen te verplaatsen."
                onDragStart={e=>start(e,{type:'group',lineId:group.title,lineIds:group.lines.map(l=>l.id),from:q.id})} onDragEnd={end}>
                <GripVertical size={16} aria-hidden="true"/> Sleep groep ({group.lines.length})
              </div>
              <details open={direct.length<=5}>
                <summary><span className="group-summary-copy">{group.sourceTitle && <small>{group.sourceTitle}</small>}{group.title} ({group.lines.length})</span></summary>
                {group.lines.map(l=>item(l.id,q.id))}
              </details>
              <Button variant="ghost" disabled={disabled} aria-label={'Groep '+group.title+' loskoppelen van deze vraag'}
                onClick={()=>commit(()=>group.lines.reduce((next,l)=>unlinkLine(next,l.id,q.id),draft) as Draft)}>
                Groep loskoppelen
              </Button>
            </section>) : (expandedQuestions.includes(q.id) ? direct : direct.slice(0, 5)).map((id) => item(id, q.id))}
          {direct.length > 5 && !selected.some(l=>direct.includes(l.id)&&l.collectionGroup) && <Button variant="outline" data-no-drop
            aria-expanded={expandedQuestions.includes(q.id)}
            onClick={() => setExpandedQuestions(ids => ids.includes(q.id) ? ids.filter(id => id !== q.id) : [...ids, q.id])}>
            {expandedQuestions.includes(q.id) ? "Toon minder bouwstenen" : `Toon alle ${countLabel(direct.length,'bouwstenen')} (${direct.length - 5} meer)`}
          </Button>}
          {!direct.length && selected.length>0 && (
            <p className={"question-drop-hint " + (over === q.id ? "drop-hint-active" : "")}>
              {over === q.id
                ? normDrop(draft, drag, q.id).label
                : !q.text.trim()
                  ? "Verzamel hier bouwstenen; formuleer je vraag later."
                  : children.length
                    ? "Bouwstenen voor de centrale vraag"
                    : "Sleep bouwstenen naar deze vraag"}
            </p>
          )}
        </div>
</>);
    return (
      <section
        key={q.id}
        className={
          "research-question " +
          (q.parent_id ? "sub-question" : "central-question") +
          (over === q.id ? " drop-active" : "")
        }
        onDragEnter={(e) => feedback(e, q.id)}
        onDragOver={(e) => feedback(e, q.id)}
        onDragLeave={leave}
        onDrop={(e) => drop(e, q.id)}
        aria-label={questionLabel(draft, q)}
      >
        <div
          className="question-header"
          title={
            q.origin === "suggested" ? "Voorgestelde onderzoeksvraag" : "Eigen onderzoeksvraag"
          }
        >
          <span className="question-level">
            {numbers[q.id]} · <TermHelp id={q.parent_id ? 'subquestion' : 'central'}>{q.parent_id ? "Deelvraag" : "Centrale vraag"}</TermHelp>
          </span>
          <span className="question-count">
            {children.length ? `${direct.length} rechtstreeks · ${total} totaal` : `${direct.length} ${direct.length===1 ? 'bouwsteen' : 'bouwstenen'}`}
            {children.length > 0 && <QuestionCountHelp/>}
          </span>
          <QuestionWordingCycle text={q.text} label={questionLabel(draft,q)} disabled={disabled}
            onChange={text=>commit(()=>editQuestion(draft,q.id,text,q.origin) as Draft,'Formulering aangepast. Betekenis en bouwstenen zijn gelijk gebleven.')}/>
          <DropdownMenu>
            <DropdownMenuTrigger
              data-no-drop
              render={
                <Button
                  variant="ghost"
                  aria-label={"Vraagopties voor " + questionLabel(draft, q)}
                />
              }
            >
              Vraagopties
            </DropdownMenuTrigger>
            <DropdownMenuContent className="research-menu" finalFocus={()=>finalMenuFocus()}>
              <DropdownMenuItem
                disabled={disabled}
                onClick={() => {
                  skipMenuFocus.current = true;
                  setEditing(q.id);
                  setFocusId(q.id);
                }}
              >
                Vraag bewerken
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled}
                onClick={() => {
                  skipMenuFocus.current = true;
                  if (q.parent_id) setSuggestFor(q.id);
                  else chooseCentral(q.id);
                }}
              >
                Vraagvoorstel kiezen…
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled || position === 0}
                onClick={() => changeOrder(q, -1)}
              >
                Omhoog
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled || position === siblings.length - 1}
                onClick={() => changeOrder(q, 1)}
              >
                Omlaag
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled || children.length > 0}
                onClick={() => setManage(manage === q.id ? "" : q.id)}
              >
                Onder een andere vraag plaatsen…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={disabled || !direct.length}
                onClick={()=>commit(()=>unlinkQuestionLines(draft,q.id) as Draft)}>
                {direct.length===1?'De bouwsteen':`Alle ${countLabel(direct.length,'bouwstenen')}`} van deze vraag loskoppelen
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={disabled}
                variant="destructive"
                onClick={() => {
                  skipMenuFocus.current=true;
                  removeReturn.current=surface.current?.querySelector<HTMLElement>('[data-question-id="'+q.id+'"]')?.closest('.research-question')?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')||null;
                  setError('');setRemove(q.id);
                }}
              >
                Vraag verwijderen…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!q.parent_id && q.researchDesign && <span className="research-direction-badge">{directionLabel(q.researchDesign.direction)}</span>}
        {!q.parent_id && q.subject && <p className="question-subject">{q.subject}</p>}
        {editing === q.id ? (
          <div className="question-edit">
            {!q.parent_id&&<div className="question-edit-subject"><label htmlFor={'subject-'+q.id}>Onderwerp <span>optioneel</span></label><Input id={'subject-'+q.id} value={q.subject ?? q.researchDesign?.topic ?? ''} maxLength={1000} disabled={disabled} onChange={e=>commit(()=>setQuestionSubject(draft,q.id,e.target.value) as Draft)}/></div>}
            <Textarea
              data-question-id={q.id}
              aria-label={"Vraag " + numbers[q.id] + " bewerken"}
              className="research-question-text"
              value={q.text}
              maxLength={2000}
              rows={2}
              disabled={disabled}
              placeholder="Welke vraag wilt u beantwoorden?"
              onChange={(e) => commit(() => editQuestion(draft, q.id, e.target.value) as Draft)}
            />
            <Button
              variant="outline"
              data-no-drop
              disabled={disabled}
              onClick={() => {
                setEditing("");
                setFocusId(q.id);
              }}
            >
              Gereed
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="question-title-button"
            data-question-id={q.id}
            aria-label={"Bewerk vraag " + questionLabel(draft, q)}
            disabled={disabled}
            onClick={() => {
              setEditing(q.id);
              setFocusId(q.id);
            }}
          >
            {q.text.trim() || "Vraag nog te formuleren"}
          </button>
        )}

        {over === q.id && (
          <span className="drop-overlay" aria-hidden="true">
            {normDrop(draft, drag, q.id).label}
          </span>
        )}
        {!q.parent_id && (
          <div className="question-actions" data-no-drop>
            {roots.length>1&&<Button variant="outline" disabled={disabled} onClick={()=>chooseCentral(q.id)}><ArrowLeft size={15}/>Vraagopzet aanpassen</Button>}
            {!q.text.trim() && (
              <Button variant="link" onClick={() => chooseCentral(q.id)}>
                Vraagvoorstel kiezen
              </Button>
            )}
            <Button
              variant="outline"
              disabled={disabled || r.questions.length >= 200}
              onClick={() => create(q.id)}
            >
              <Plus size={16} />
              Deelvraag toevoegen
            </Button>
            {proposed.length>0 && <Button
              variant="link"
              disabled={disabled}
              onClick={() => setSuggestFor(suggestFor === q.id ? "" : q.id)}
            >
              Bekijk voorgestelde deelvragen
            </Button>}
          </div>
        )}
        {suggestFor === q.id && (
          <div className="sub-suggestions" data-no-drop>
            <div className="inline-panel-heading">
              <strong>
                {q.parent_id
                  ? "Vraagvoorstellen"
                  : "Deelvragen bij centrale vraag " + numbers[q.id]}
              </strong>
              <Button
                variant="ghost"
                aria-label="Voorstellen sluiten"
                onClick={() => setSuggestFor("")}
              >
                <X size={16} />
              </Button>
            </div>
            {proposed.map((s) => (
              <section key={s.key}>
                <small className="sub-proposal-origin">{s.label || (s.key.startsWith('model:') ? 'Model' : s.key.startsWith('direction:') ? 'Onderzoeksrichting' : 'Bij je selectie')} · {s.ids.length ? `${countLabel(s.ids.length,'bouwstenen')}` : 'Zelf koppelen indien nodig'}</small>
                <p>{s.text}</p>
                {s.hint && <p className="proposal-scope-note">{s.hint}</p>}
                <ProposalCoverage scopeNote={s.scopeNote} missingCriteria={s.missingCriteria}/>
                <Button
                  variant="outline"
                  disabled={
                    disabled ||
                    (!q.parent_id &&
                      r.questions.length >= 200 &&
                      !subSuggestionReuseId(draft, q.id, s.key))
                  }
                  onClick={() => {
                    const okay = commit(
                      () =>
                        (q.parent_id
                          ? applySubQuestionWording(draft, q.id, s.key)
                          : adoptSubSuggestion(draft, q.id, s.key)) as Draft,
                      q.parent_id
                        ? "Vraag geformuleerd; je koppelingen blijven behouden."
                        : subSuggestionReuseId(draft,q.id,s.key)
                          ? freeSuggestionCount(s.ids) ? `${countLabel(freeSuggestionCount(s.ids),'bouwstenen')} gekoppeld aan de bestaande deelvraag.` : "Bestaande deelvraag bijgewerkt; koppelingen blijven behouden."
                          : s.ids.length ? "Deelvraag toegevoegd; alleen nog vrije bouwstenen zijn gekoppeld." : "Deelvraag toegevoegd. Koppel de passende bouwstenen.",
                    );
                    if (okay && q.parent_id) {
                      setSuggestFor("");
                      setFocusId(q.id);
                    }
                  }}
                >
                  {q.parent_id
                    ? "Gebruik deze formulering"
                    : subSuggestionReuseId(draft, q.id, s.key)
                      ? (freeSuggestionCount(s.ids) ? `Koppel ${countLabel(freeSuggestionCount(s.ids),'bouwstenen')} aan deelvraag ` : "Gebruik formulering voor deelvraag ") +
                        numbers[subSuggestionReuseId(draft, q.id, s.key)!]
                      : s.ids.length ? "Opnemen · " + s.ids.length + " bouwstenen" : "Gebruik deze deelvraag"}
                </Button>
              </section>
            ))}
            {!proposed.length && <p>Geen nieuwe voorstellen bij deze vraag. Je kunt zelf een deelvraag toevoegen.</p>}
          </div>
        )}
        {(children.length > 0 || (!q.parent_id && direct.length > 0)) && <div className="sub-question-list">
          {!q.parent_id && direct.length > 0 && <section className="research-question direct-attachments" aria-label={`${numbers[q.id]}.0 Rechtstreeks gekoppeld`}>
            <div className="question-header">
              <h3 className="question-level">{numbers[q.id]}.0 · Rechtstreeks gekoppeld</h3>
              <span className="question-count">{direct.length} {direct.length === 1 ? 'bouwsteen' : 'bouwstenen'}</span>
            </div>
            <p className="direct-attachments-description">Bouwstenen die rechtstreeks bij de centrale vraag horen.</p>
            <details className="question-attached"><summary>{direct.length} {direct.length===1?'bouwsteen':'bouwstenen'} bekijken</summary>{material()}</details>
          </section>}
          <QuestionBranch questions={children} renderQuestion={question}/>
        </div>}
        {q.parent_id && direct.length > 0 ? <details className="question-attached"><summary>{direct.length} {direct.length===1?'bouwsteen':'bouwstenen'} bekijken</summary>{material()}</details> : direct.length === 0 ? material() : null}
        {q.parent_id && (!q.text.trim() || editing === q.id) && proposed.length > 0 && (
          <Button
            data-no-drop
            variant="link"
            className="wording-action"
            onClick={() => setSuggestFor(suggestFor === q.id ? "" : q.id)}
          >
            Vraagvoorstel kiezen
          </Button>
        )}
        {manage === q.id && (
          <div className="question-management" data-no-drop>
            <Select
              items={[
                { value: "root", label: "Zelfstandige centrale vraag" },
                ...roots
                  .filter((p) => p.id !== q.id)
                  .map((p) => ({ value: p.id, label: questionLabel(draft, p) })),
              ]}
              value={q.parent_id ?? "root"}
              onValueChange={(value) => {
                if (value) {
                  commit(
                    () =>
                      moveQuestion(draft, q.id, value === "root" ? null : String(value)) as Draft,
                    "Vraag verplaatst.",
                  );
                  setManage("");
                  setFocusId(q.id);
                }
              }}
              disabled={disabled || children.length > 0}
            >
              <SelectTrigger aria-label="Plaats vraag onder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="research-select" alignItemWithTrigger={false} align="start">
                {[
                  { id: "root", text: "Zelfstandige centrale vraag" },
                  ...roots.filter((p) => p.id !== q.id),
                ].map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id === "root" ? p.text : questionLabel(draft, p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => setManage("")}>
              Sluiten
            </Button>
          </div>
        )}

      </section>
    );
  }
  return (
    <section
      ref={surface}
      id="guide-research-builder" tabIndex={-1}
      className={"research-builder clean-flow " + (drag ? "is-dragging" : "")}
      aria-label="Onderzoeksopzet samenstellen"
      onDragOver={(e) => {
        if (dragRef.current) feedback(e, "cancel");
      }}
      onDrop={(e) => drop(e, "cancel")}
      onDropCapture={(e) => e.preventDefault()}
    >
      <LegacyCioNotice draft={draft} />
      <AlertDialog open={Boolean(removingQuestion)} onOpenChange={open=>{if(!open)setRemove('');}}>
        <AlertDialogContent className="question-remove-dialog" initialFocus={cancelRemove} finalFocus={()=>{
          (removeReturn.current?.isConnected?removeReturn.current:surface.current)?.focus();return false;
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{removingQuestion?.parent_id?'Deelvraag verwijderen?':'Centrale vraag verwijderen?'}</AlertDialogTitle>
            <AlertDialogDescription>{removingChildren?`Deze centrale vraag en de ${removingChildren} bijbehorende deelvragen worden verwijderd. `:'Deze vraag wordt verwijderd. '}De koppelingen van de verwijderde vragen vervallen. Je gekozen bouwstenen en koppelingen aan andere vragen blijven behouden.</AlertDialogDescription>
          </AlertDialogHeader>
          {removingQuestion?.text&&<p className="question-remove-text">{removingQuestion.text}</p>}
          {error&&<p role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelRemove}>Annuleren</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={disabled} onClick={()=>{
              if(!removingQuestion)return;
              const parent=removingQuestion.parent_id;
              if(commit(()=>deleteQuestion(draft,removingQuestion.id) as Draft,'Vraag verwijderd. Je gekozen bouwstenen blijven behouden.')){
                removeReturn.current=parent?surface.current?.querySelector<HTMLElement>('[data-question-id="'+parent+'"]')||surface.current:surface.current;
                setRemove('');
              }
            }}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {roots.length > 0 && <div className="research-toolbar">
        <span>{draft.included.length - free.length} van {countLabel(draft.included.length,'bouwstenen')} gekoppeld</span>
        {!choosing && <div className="research-route-actions">{roots.length===1&&<Button variant="outline" disabled={disabled} onClick={()=>chooseCentral(roots[0].id)}><ArrowLeft size={15}/>Terug naar mijn vraagopzet</Button>}<Button variant="outline" disabled={disabled || r.questions.length >= 200} onClick={() => chooseCentral()}><Plus size={16}/>Nieuwe vraagopzet</Button></div>}
      </div>}
      {(!roots.length || choosing) && startRoute==='choice' && <section className="question-entry" aria-label="Kies hoe je je vraag wilt maken">
        <WorkflowIntro id="question-entry-title" title="Hoe wil je je vraag opbouwen?">Schrijf je vragen zelf, of gebruik een voorstel bij je gekozen bouwstenen.{roots.length>0&&' Een bestaande vraagopzet kun je opnieuw openen; een nieuwe vraag komt erbij.'}</WorkflowIntro>
        <div className="question-entry-cards entry-options">
          <article className="entry-card"><div className="entry-card-top"><span className="discovery-icon"><PenLine size={25} aria-hidden="true"/></span><span>Zelf formuleren</span></div><h3>Ik bouw mijn eigen vraag</h3><p>Formuleer je <TermHelp id="central">centrale vraag</TermHelp> en <TermHelp id="subquestion">deelvragen</TermHelp>, met voorbeelden als hulp.</p>
            <div className="entry-path" aria-label="Stappen bij zelf formuleren"><span>Vraag formuleren</span><ArrowRight size={14} aria-hidden="true"/><span>Deelvragen toevoegen</span><ArrowRight size={14} aria-hidden="true"/><span>Bouwstenen koppelen</span></div>
            <div className="entry-card-footer"><Button disabled={disabled} onClick={startOwn}>Zelf een vraag maken <ArrowRight size={16}/></Button></div></article>
          <article className="entry-card"><div className="entry-card-top"><span className="discovery-icon"><Layers size={25} aria-hidden="true"/></span><span>Vanuit je selectie</span></div><h3>Ik begin met mijn selectie</h3><p>Start met een voorstel en passende <TermHelp id="subquestion">deelvragen</TermHelp> bij je gekozen <TermHelp id="block">bouwstenen</TermHelp>.</p>
            <p className="entry-choice-note">{!selected.length ? 'Kies eerst bouwstenen om een voorstel te krijgen.' : !starts.length ? 'Geen passend voorstel. Schrijf zelf een vraag of pas je selectie aan.' : `${selected.length} ${selected.length===1?'bouwsteen':'bouwstenen'} beschikbaar voor je vraagopzet.`}</p>
            <div className="entry-path" aria-label="Stappen vanuit je selectie"><span>Vraagvoorstel</span><ArrowRight size={14} aria-hidden="true"/><span>Vragen aanpassen</span><ArrowRight size={14} aria-hidden="true"/><span>Koppelingen controleren</span></div>
            <div className="entry-card-footer"><Button disabled={disabled||!starts.length} onClick={()=>pickProposal(starts[0].proposal)}>Bekijk mijn vraagopzet <ArrowRight size={16}/></Button></div>
          </article>
        </div>
        <WorkflowOutcome title="Je vraagopzet blijft aanpasbaar" action={!selected.length && onExplore ? <Button variant="link" onClick={onExplore}>Verken bouwstenen <ArrowRight size={16}/></Button> : undefined}>Je kunt je vragen later aanpassen. Gekozen bouwstenen blijven beschikbaar; koppel ze aan de vragen waarin je ze wilt onderzoeken.</WorkflowOutcome>
        {choosing && roots.length>0 && <Button variant="ghost" onClick={()=>setChoosing(false)}>Terug naar mijn vragen</Button>}
      </section>}
      {(!roots.length || choosing) && startRoute!=='choice' && <section className="question-composer" aria-label="Vraagopzet voorbereiden">
        <header className="composer-top"><div><span className="composer-eyebrow">Bouw je kader</span><h2 id="composer-title" tabIndex={-1}>{ownCentral?'Formuleer je onderzoeksvragen':centralTarget?'Pas je vraagopzet aan':'Maak het voorstel passend'}</h2>{selected.length>0&&<p className="composer-selection-context">Je {selected.length===1?'gekozen bouwsteen blijft':'gekozen bouwstenen blijven'} beschikbaar.</p>}</div><Button variant="ghost" onClick={()=>{setStartRoute('choice');setFocusId('__choice__');}}><ArrowLeft size={16}/>Terug naar de keuze</Button>{roots.length>0&&<Button variant="ghost" onClick={()=>setChoosing(false)}>Terug naar mijn vragen</Button>}</header>
        <div className={'composer-main'+(ownCentral?'':' composer-from-selection')}>
          <div className="composer-writing">
          <QuestionSubjectInput value={subject} disabled={disabled} onChange={value=>{setSubject(value);if(ownCentral)ownSubject.current=value;}}/>
          {ownCentral&&<QuestionExamples subject={subject} disabled={disabled} centralText={firstText} subquestions={ownSubs} canAddSub={r.questions.length+ownSubs.length+1<200}
            onCentral={text=>{setFirstText(text);setFirstOrigin('user');ownText.current=text;setMessage('Voorbeeld overgenomen. Pas de invulvelden aan in je centrale vraag.');}}
            onSub={text=>setOwnSubs(items=>appendUniqueQuestion(items,text))}/>}
          <div className="composer-question">
            {!ownCentral && <div className="proposal-switch"><span>{starts.find(p=>p.proposal.key===chosenProposalKey) ? <>Voorstel op basis van {starts.find(p=>p.proposal.key===chosenProposalKey)?.proposal.label} · {starts.find(p=>p.proposal.key===chosenProposalKey)?.matched} passende bouwstenen</>:'Je bestaande formulering'}</span>{alternativeStarts.length>0&&<Button variant="link" disabled={disabled} aria-expanded={alternatives} onClick={()=>{setAlternatives(v=>!v);setProposalQuery('');}}>{alternatives?'Voorstellen sluiten':'Ander voorstel'}</Button>}</div>}
            <div className="composer-wording-heading"><div id="central-question-label" className="composer-field-label"><TermHelp id="central">Centrale vraag</TermHelp></div><QuestionWordingCycle text={firstText} label="centrale vraag" disabled={disabled} onChange={text=>{setFirstText(text);if(ownCentral)ownText.current=text;setMessage('Formulering aangepast. Betekenis en bouwstenen zijn gelijk gebleven.');}}/></div>
            <Textarea id="central-question-input" ref={firstInput} aria-labelledby="central-question-label" value={firstText} maxLength={2000} rows={3} disabled={disabled} placeholder="Schrijf hier je centrale onderzoeksvraag…"
              onChange={e=>{if(activeProposal?.topic)setChosenTopic(activeProposal.topic);if(activeProposal?.key)setChosenProposalKey(activeProposal.key);if(activeProposal?.modelId)setChosenModelId(activeProposal.modelId);setFirstText(e.target.value);setFirstOrigin('user');if(ownCentral)ownText.current=e.target.value;}}/>
            {alternatives && alternativeStarts.length>0 && <section className="composer-alternatives" aria-label="Andere vraagvoorstellen">
              <Input aria-label="Zoek vraagvoorstel" placeholder="Zoek een bron of onderwerp…" value={proposalQuery} onChange={e=>setProposalQuery(e.target.value)}/>
              <div>{alternativeStarts.filter(p=>(p.proposal.label+' '+p.proposal.text).toLocaleLowerCase('nl').includes(proposalQuery.toLocaleLowerCase('nl'))).map(({proposal:p,matched})=><button type="button" disabled={disabled} key={p.key} onClick={()=>pickProposal(p)}><small>{p.label} · {matched} passende bouwstenen</small><span>{p.text}</span></button>)}</div>
              {!alternativeStarts.some(p=>(p.proposal.label+' '+p.proposal.text).toLocaleLowerCase('nl').includes(proposalQuery.toLocaleLowerCase('nl')))&&<p>Geen andere voorstellen bij deze zoekterm.</p>}
            </section>}
          </div>
          <section className="composer-branches" aria-label="Deelvragen in deze opzet">
            <header><h3><TermHelp id="subquestion">Deelvragen</TermHelp></h3><div className="composer-detail-controls"><span aria-live="polite">{ownCentral?'Optioneel':chosenSubs.length+' gekozen'+(canSwitchDetail&&chosenSubs.length?' · '+broadChosen+' breed, '+(chosenSubs.length-broadChosen)+' specifiek':'')}</span>{canSwitchDetail&&<fieldset className="composer-detail-toggle"  aria-label="Detailniveau van voorgestelde deelvragen"><button type="button" aria-pressed={subquestionDetail==='broad'} disabled={disabled} onClick={()=>switchSubquestionDetail('broad')}>Breed</button><button type="button" aria-pressed={subquestionDetail==='specific'} disabled={disabled} onClick={()=>switchSubquestionDetail('specific')}>Specifiek</button></fieldset>}</div></header>
            {canSwitchDetail&&<p className="composer-detail-hint">Combineer brede en specifieke deelvragen. Je keuzes blijven behouden bij het wisselen. Een toetspunt kan bij meerdere vragen horen en telt maar één keer mee in je selectie.</p>}
            <>
              {ownSubs.map((text,i)=><div className="own-subquestion" key={i}><span>{i+1}</span><Textarea rows={2} aria-label={'Nieuwe deelvraag '+(i+1)} placeholder="Wat wil je hiervoor weten?" value={text} disabled={disabled} maxLength={2000} onChange={e=>setOwnSubs(items=>items.map((t,j)=>j===i?e.target.value:t))}/><Button variant="ghost" aria-label={'Deelvraag '+(i+1)+' verwijderen'} disabled={disabled} onClick={()=>setOwnSubs(items=>items.filter((_,j)=>j!==i))}><X size={16}/></Button></div>)}
              <button type="button" className="add-branch" disabled={disabled||r.questions.length+chosenSubs.length+ownSubs.length+(centralTarget?0:1)>=200} onClick={()=>setOwnSubs(items=>[...items,''])}><Plus size={18}/>Deelvraag toevoegen</button>
            </>
            {!ownCentral&&<>
              {selectableSubs.length>0&&<p className="composer-note">{centralTarget?'Je bestaande deelvragen zijn aangevinkt. Vink uit wat je wilt verwijderen; dit gebeurt pas bij bewaren.':'Vink de deelvragen aan die je wilt gebruiken.'} Met het wisselicoon verander je alleen de formulering.</p>}
              <div className="composer-subquestions">{selectableSubs.map((s,i)=><div key={s.key} className="composer-subquestion-item"><div className={'composer-subquestion-row '+(chosenSubKeys.includes(s.key)?'is-chosen':'')}><label className="composer-subquestion" htmlFor={checkboxId+s.key}><Checkbox id={checkboxId+s.key} checked={chosenSubKeys.includes(s.key)} disabled={disabled||(!chosenSubKeys.includes(s.key)&&r.questions.length-r.questions.filter(q=>q.parent_id===centralTarget&&centralTarget!==null).length+chosenSubs.length+ownSubs.length+(centralTarget?0:1)>=200)} onCheckedChange={checked=>setChosenSubKeys(keys=>checked?[...new Set([...keys,s.key])]:keys.filter(k=>k!==s.key))}/><span><span aria-live="polite">{subText(s)}</span><small>{s.ids.length?s.ids.length+(s.ids.length===1?' passende bouwsteen':' passende bouwstenen'):'Zonder bouwstenen'}</small></span></label><QuestionWordingCycle text={subText(s)} label={'deelvraag '+(i+1)} disabled={disabled} onChange={text=>setSubFormulations(values=>({...values,[s.key]:{base:s.text,text}}))}/></div><ProposalCoverage scopeNote={s.scopeNote} missingCriteria={s.missingCriteria}/></div>)}</div>
              {!selectableSubs.length&&<p className="composer-note">Geen deelvragen voorgesteld bij deze selectie. Voeg zelf een deelvraag toe als dat nodig is.</p>}
            </>}
          </section>
          </div>
        </div>
        <footer className="composer-actions"><span>{ownCentral?'Je kunt je vragen daarna blijven aanpassen.':centralTarget?'Uitgevinkte deelvragen worden verwijderd. De bouwstenen blijven in je selectie.':'Je gekozen deelvragen krijgen hun passende bouwstenen. Bestaande koppelingen blijven behouden.'}</span><Button disabled={disabled||!firstText.trim()||alreadyAdded||(!centralTarget&&r.questions.length>=200)} onClick={acceptCentral}>{alreadyAdded?'Al opgenomen':centralTarget?'Wijzigingen bewaren':ownCentral?'Vragen toevoegen':'Gebruik deze opzet'}<ArrowRight size={16}/></Button></footer>
      </section>}
      <div className={"research-columns" + ((!roots.length || choosing) ? " question-workbench-hidden" : "")}>
        <div className="research-canvas workflow-working-panel">
              {roots.length > 0 && <div className="canvas-heading workflow-working-heading">
                <h2>Onderzoeksvragen</h2>
                {selected.some(line=>line.materialKind==='model-question') && <label className="question-read-toggle" htmlFor={checkboxId+"-interviews"}><Checkbox id={checkboxId+"-interviews"} checked={showInterviewText} onCheckedChange={v=>setShowInterviewText(Boolean(v))}/>Interviewvragen tonen</label>}
              </div>}
              <QuestionBranch questions={roots} renderQuestion={question}/>
            </div>
            {(roots.length > 0 || selected.length > 0) && <aside
              className={"research-bank " + (!selected.length?'bank-is-empty ':'') + (over === "bank" ? "drop-active" : "")}
              id="guide-building-blocks" tabIndex={-1}
              aria-label="Gekozen bouwstenen"
              onDragEnter={(e) => feedback(e, "bank")}
              onDragOver={(e) => feedback(e, "bank")}
              onDragLeave={leave}
              onDrop={(e) => drop(e, "bank")}
            >
              <div className="bank-heading workflow-working-heading">
                <h3>Mijn <TermHelp id="block">bouwstenen</TermHelp></h3>
              </div>
              {r.links.length > 0 && drag?.from && <div className={"bank-return-zone" + (drag?.from ? " return-ready" : "")}>
                <strong>
                  {over === "bank" ? "Loslaten: uit deze vraag halen" : "Bouwsteen terugzetten"}
                </strong>
                <span>
                  Sleep hierheen om de koppeling te verwijderen. De bouwsteen blijft geselecteerd.
                </span>
              </div>}
              {!selected.length ? <div className="bank-empty-state"><Layers size={24} aria-hidden="true"/><h4>Nog geen bouwstenen</h4><p>Werk eerst je vragen uit. Voeg <TermHelp id="block">bouwstenen</TermHelp> toe vóór je exporteert.</p><div>{onExplore&&<Button variant="outline" onClick={onExplore}>Verken bouwstenen <ArrowRight size={16}/></Button>}{onAddMaterial&&<Button variant="ghost" disabled={disabled} onClick={onAddMaterial}><Plus size={16}/>Maak een eigen bouwsteen</Button>}</div></div> : <>
              {onAddMaterial && <Button className="bank-add-material" variant="ghost" disabled={disabled} onClick={onAddMaterial}><Plus size={16}/>Eigen bouwsteen toevoegen</Button>}
              <div className="bank-scroll">
                {selected.length>0 && <QuestionBuildingBlocks lines={selected} attached={bulkDestination?questionLineIds(draft,bulkDestination):[]}
                  linkedElsewhere={r.links.filter(l=>l.question_id!==bulkDestination).map(l=>l.line_id)} disabled={disabled}
                  questions={r.questions.map(q=>({id:q.id,label:questionLabel(draft,q)}))} targetId={bulkDestination} onTargetChange={setBulkTarget}
                  onLink={ids=>Boolean(bulkDestination)&&commit(()=>linkQuestionLines(draft,bulkDestination,ids) as Draft,'Bouwstenen gekoppeld aan '+questionLabel(draft,r.questions.find(q=>q.id===bulkDestination)!))}/>
                }
                <p className="bank-instruction">{roots.length ? "Sleep naar een vraag, of kies Koppelen." : "Maak eerst een vraag om deze bouwstenen te koppelen."}</p>
                {selected.length > 6 && (
                  <Input
                    aria-label="Zoek geselecteerde normen"
                    placeholder="Zoek normen…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setBankPage(0);
                    }}
                  />
                )}
                {roots.length > 0 && <label className="suggestion-option" htmlFor="research-only-free">
                  <Checkbox
                    id="research-only-free"
                    checked={onlyFree}
                    onCheckedChange={(v) => {
                      setOnlyFree(Boolean(v));
                      setBankPage(0);
                    }}
                  />
                  Alleen nog niet gekoppeld ({free.length})
                </label>}
                <div className="bank-items">{(groupBuildingBlocks(bank) as {id:string;title:string;sourceTitle:string;lines:Framework['lines']}[]).map(group=><section key={group.id}>
                  {group.id!=='other' && <div className="bank-group-heading group-drag-handle" draggable={!disabled&&roots.length>0}
                    onPointerDown={()=>{controlPointer.current=false;}}
                    aria-label={'Sleep groep '+group.title} title="Sleep de groep naar een vraag. Alleen geselecteerde bouwstenen binnen het huidige zoekfilter worden gekoppeld."
                    onDragStart={e=>start(e,{type:'group',lineId:group.title,lineIds:filtered.filter(l=>l.collectionGroup?.id===group.id).map(l=>l.id),from:null})} onDragEnd={end}>
                    <small>{group.sourceTitle}</small><strong>{group.title}</strong>
                    <span><GripVertical size={16} aria-hidden="true"/> Sleep groep ({filtered.filter(l=>l.collectionGroup?.id===group.id).length})</span>
                  </div>}
                  {group.lines.map(l=>item(l.id,null))}
                </section>)}</div>
                {!filtered.length && (
                  <p className="bank-empty">
                    {!selected.length
                      ? "Verzamel normen, modelvragen of maak een eigen bouwsteen."
                      : onlyFree && free.length === 0
                        ? "Alles gekoppeld. Zet het filter uit om een bouwsteen opnieuw te gebruiken."
                        : "Geen normen gevonden."}
                  </p>
                )}
                {!selected.length && onExplore && (
                  <Button variant="outline" onClick={onExplore}>
                    Bouwstenen kiezen
                  </Button>
                )}
                {filtered.length > 20 && (
                  <div className="bank-pagination">
                    <Button
                      variant="ghost"
                      disabled={page === 0}
                      onClick={() => setBankPage(page - 1)}
                    >
                      Vorige
                    </Button>
                    <span>
                      {page + 1}/{Math.ceil(filtered.length / 20)}
                    </span>
                    <Button
                      variant="ghost"
                      disabled={(page + 1) * 20 >= filtered.length}
                      onClick={() => setBankPage(page + 1)}
                    >
                      Volgende
                    </Button>
                  </div>
                )}
              </div>
              </>}
            </aside>}
          </div>
      <Sheet
        open={Boolean(picker)}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
      >
        <SheetContent
          className="norm-link-sheet"
          showCloseButton={false}
          initialFocus={() => pickerInput.current ?? pickerClose.current ?? true}
          finalFocus={() => {
            const target = pickerDestination.current
              ? surface.current?.querySelector<HTMLElement>(
                  '[data-question-id="' + pickerDestination.current + '"]',
                )
              : null;
            return (
              target ??
              (pickerReturn.current?.isConnected ? pickerReturn.current : null) ??
              firstInput.current ??
              true
            );
          }}
        >
          <SheetHeader>
            <SheetTitle>Bouwsteen koppelen</SheetTitle>
            <SheetDescription>
              Kies de onderzoeksvraag die deze bouwsteen ondersteunt.
            </SheetDescription>
          </SheetHeader>
          {picker && (
            <div className="norm-link-picker">
              <div className="inline-panel-heading">
                <strong>
                  {picker.from ? "Verplaats" : "Koppel"} {normId(picker.lineId)}
                </strong>
                <Button
                  variant="ghost"
                  aria-label="Koppelen sluiten"
                  ref={pickerClose}
                  onClick={() => setPicker(null)}
                >
                  <X size={16} />
                </Button>
              </div>
              {(() => {
                const line = framework.lines.find((l) => l.id === picker.lineId);
                if (!line) return null;
                return (
                  <section className="link-norm-context" aria-label="Bouwsteen die u koppelt">
                    <h3>{line.title}</h3>
                    <details open>
                      <summary>Inhoud van deze bouwsteen</summary>
                      <dl>
                        {(line.source_id
                          ? (["objective", "criterion", "auditQuestion", "procedure"] as const)
                          : (["objective", "risk", "control", "auditQuestion"] as const)
                        ).flatMap((kind) =>
                          sourceFields(line, kind)
                            .filter((f) => fieldIncluded(draft, line.id, f.id))
                            .map((f) => (
                              <div key={f.id}>
                                <dt>
                                  {
                                    {
                                      objective: "Doel",
                                      risk: "Risico",
                                      control: "Beheersmaatregel",
                                      auditQuestion: "Auditvraag",
                                      criterion:
                                        line.materialKind === "model-question"
                                          ? "Onderzoeksfocus"
                                          : "Norm",
                                      procedure: "Doorvragen / toetsing",
                                    }[kind]
                                  }
                                </dt>
                                <dd>{draftValue(line, f.id, draft)}</dd>
                              </div>
                            )),
                        )}
                      </dl>
                    </details>
                  </section>
                );
              })()}
              {targets.length > 6 && (
                <Input
                  aria-label="Zoek onderzoeksvraag"
                  placeholder="Zoek op nummer of vraag…"
                  value={targetQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setTargetQuery(query);
                    if (
                      !targets
                        .find((t) => t.value === target)
                        ?.label.toLocaleLowerCase("nl")
                        .includes(query.toLocaleLowerCase("nl"))
                    )
                      setTarget("");
                  }}
                />
              )}
              <RadioGroup
                className="question-target-list"
                aria-label="Kies een onderzoeksvraag"
                value={target}
                onValueChange={(value) => setTarget(String(value))}
              >
                {ordered
                  .filter((q) =>
                    questionLabel(draft, q)
                      .toLocaleLowerCase("nl")
                      .includes(targetQuery.toLocaleLowerCase("nl")),
                  )
                  .map((q) => {
                    const attached = r.links.some(
                      (l) => l.line_id === picker.lineId && l.question_id === q.id,
                    );
                    return (
                      <label
                        key={q.id}
                        className={"question-target" + (q.parent_id ? " child-target" : "")}
                        data-selected={target === q.id}
                        data-unavailable={attached}
                      >
                        <RadioGroupItem
                          ref={target === q.id ? pickerInput : undefined}
                          value={q.id}
                          disabled={disabled || attached}
                          aria-labelledby={"target-label-" + q.id}
                        />
                        <span className="question-target-copy" id={"target-label-" + q.id}>
                          <strong>
                            {numbers[q.id]} · {q.parent_id ? "Deelvraag" : "Centrale vraag"}
                          </strong>
                          <span>{q.text.trim() || "Vraag nog te formuleren"}</span>
                          {attached && <small>Al gekoppeld</small>}
                        </span>
                      </label>
                    );
                  })}
              </RadioGroup>
              {targetQuery &&
                !targets.some((t) =>
                  t.label.toLocaleLowerCase("nl").includes(targetQuery.toLocaleLowerCase("nl")),
                ) && <p>Geen vragen gevonden.</p>}
              <div className="link-actions">
                <Button
                  disabled={
                    disabled ||
                    !normDrop(
                      draft,
                      { type: "line", lineId: picker.lineId, from: picker.from },
                      target,
                    ).valid
                  }
                  onClick={() => {
                    const p = picker;
                    if (
                      commit(
                        () => linkLine(draft, p.lineId, target, p.from) as Draft,
                        p.lineId + " gekoppeld.",
                      )
                    ) {
                      pickerDestination.current = target;
                      setPicker(null);
                      setFocusId(target);
                    }
                  }}
                >
                  {picker.from ? "Verplaatsen" : "Koppelen"}
                </Button>
                <Button variant="ghost" onClick={() => setPicker(null)}>
                  Annuleren
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {error && (
        <p role="alert" className="save-error">
          {error}
        </p>
      )}
      <output
        className={message && (feedbackVisible || drag) ? "flow-feedback" : "sr-only"}
        aria-live="polite"
      >
        {message}
      </output>
    </section>
  );
}
