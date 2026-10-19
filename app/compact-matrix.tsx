"use client";
import {countLabel} from '@/lib/display-count.mjs';
import { useRef, useState, useEffect, useId, useMemo } from "react";
import { Info } from 'lucide-react';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from '@/components/ui/tooltip';
import "./matrix-readability.css";
import { useBrowseState } from "./browse-state";
import {resetReportView} from '@/lib/report-workspaces.mjs';
import FilterPicker from "./filter-picker";
import { AuditProfilePicker, RelevancePreview, type AuditProfile } from "./audit-profile";
import { defaultProfile, profileActive, rankForProfile } from "@/lib/audit-relevance.mjs";
import { normId, filterSubjects, subjectOptions } from "@/lib/norm-navigation.mjs";
import FullTextPreview from "./full-text-preview";
import { fieldIncluded } from "@/lib/research-plan.mjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { labels, basisLabels, draftValue, isEdited } from "@/lib/framework-model.mjs";
import { sourceFields } from "@/lib/framework-source-items.mjs";
import { branchCount } from "@/lib/framework-branches.mjs";
import { defaultColumns, filterLines, pageSlice, selectLines } from "@/lib/workspace-view.mjs";
import type { Draft, Line, ElementKey } from "@/lib/framework-types";
export type MatrixTextDensity = 'compact' | 'comfortable' | 'full';
function SubjectExplanation({id,text}:{id:string;text:string}){
  const [open,setOpen]=useState(false);
  const tooltipId=useId();
  return <div className="matrix-subject-explanation"><p className="matrix-item-context">{text}</p><TooltipProvider delay={250}><Tooltip open={open} onOpenChange={setOpen}><TooltipTrigger className="matrix-subject-info" aria-label={`Toelichting bij ${id}`} aria-describedby={open?tooltipId:undefined} onClick={()=>setOpen(true)}><Info size={15}/></TooltipTrigger><TooltipContent id={tooltipId} role="tooltip" className="full-text-popup matrix-subject-popup" side="bottom" align="start"><span>{text}</span></TooltipContent></Tooltip></TooltipProvider></div>;
}
export default function CompactMatrix({
  lines,
  draft,
  viewDraft,
  disabled,
  onChange,
  onOpen,
  onOpenField,
  selected,
  viewKey = "fixture",
  reveal,
  onRevealComplete,
  profile = defaultProfile,
  onProfileChange,
  onOpenReport,
  resetRequest=0,
  onResetComplete,
  pointSelection,
  pointChoices,
  initialColumns = defaultColumns,
  columnOptions,
  subjectDefinitions,
  subjectLabel = 'Onderwerp',
  basisNames,
  showSubjectSuggestions = true,
  columnBasis,
  embedded = false,
  showProvenance = true,
  initialTextDensity = 'comfortable',
  textDensity,
  combineIdentity = false,
  groupLines,
  descriptiveTitles = false,
  subjectColumnLabel = descriptiveTitles ? 'Norm' : 'Onderdeel',
}: {
  lines: Line[];
  draft: Draft;
  viewDraft: Draft;
  disabled: boolean;
  onChange: (draft: Draft) => void;
  onOpen: (id: string) => void;
  onOpenField?: (id: string, field: ElementKey) => void;
  selected: string;
  viewKey?: string;
  reveal?: { id: string; nonce: number };
  onRevealComplete?: () => void;
  profile?: AuditProfile;
  onProfileChange?: (p: AuditProfile) => void;
  onOpenReport?: (line: Line) => void;
  resetRequest?: number;
  onResetComplete?: ()=>void;
  /** Opt-in prototype: explicit child choices; existing parent selection is unchanged. */
  pointSelection?: {
    counts: Record<string, { selected: number; total: number }>;
    onChoose: (id: string) => void;
    onBulk: (ids: string[]) => void;
  };
  initialColumns?: string[];
  columnOptions?: ElementKey[];
  subjectDefinitions?: {id:string;title:string}[];
  subjectLabel?: string;
  basisNames?: Record<string,string>;
  showSubjectSuggestions?: boolean;
  columnBasis?: Partial<Record<ElementKey,string>>;
  /** The parent supplies filtered lines, columns and group controls. */
  embedded?: boolean;
  /** Edited or unavailable fields remain identifiable even in a quiet matrix. */
  showProvenance?: boolean;
  initialTextDensity?: MatrixTextDensity;
  textDensity?: MatrixTextDensity;
  /** Show the selection, identifier and title together in a single column. */
  combineIdentity?: boolean;
  groupLines?: (lines:Line[])=>{id:string;title:string;lines:Line[]}[];
  descriptiveTitles?: boolean;
  subjectColumnLabel?: string;
  /** Child choices are available only for worked-out source rows. */
  pointChoices?: {
    counts: Record<string, { selected: number; total: number; legacySelected?: boolean }>;
    onChoose: (id: string) => void;
    onSelect: (ids: string[], selected: boolean) => void;
  };
  /** Kept for the isolated density fixture; evidence expansion now lives in the detail panel. */
  showSources?: boolean;
  onSources?: (value: boolean) => void;
}) {
  const selectedOnlyId = useId();
  const [localTextDensity, setLocalTextDensity] = useState<MatrixTextDensity>(initialTextDensity);
  const density = textDensity ?? localTextDensity;
  const [view, setView, ready] = useBrowseState("matrix-" + viewKey, {
    query: "",
    group: "",
    selectedOnly: false,
    index: 0,
    showAll: false,
    columns: initialColumns as string[],
    subjects: [] as string[],
    top: 0,
    left: 0,
    lastId: "",
    revealNonce: 0,
  });
  const { query, selectedOnly, index, showAll } = view;
  // Descriptive matrices already show the full criterion under the norm title.
  // Filter both defaults and restored column preferences; keep the source field intact.
  const availableColumns = (columnOptions ?? (Object.keys(labels) as ElementKey[]).filter(k=>!['auditQuestion','owner'].includes(k)))
    .filter(k=>!descriptiveTitles || k!=='criterion');
  // Upgrade the old default only; custom column selections remain preferences.
  const columns = embedded ? initialColumns.filter(k=>availableColumns.includes(k as ElementKey)) : view.columns.join(',')==='objective,risk,control,auditQuestion'
    ? defaultColumns.filter(k=>availableColumns.includes(k as ElementKey)) : view.columns.filter(k=>availableColumns.includes(k as ElementKey));
  // Keep the complete identifier beside its checkbox, including longer report prefixes.
  // Size from the whole workspace so filtering/pagination does not make the column jump.
  const idColumnRem = Math.max(11, 3.5 + lines.reduce((length, line) => Math.max(length, normId(line.id).length), 0) * .875);
  const identityColumnRem = combineIdentity ? Math.max(21, idColumnRem) : descriptiveTitles ? Math.max(8.5,2+lines.reduce((n,l)=>Math.max(n,normId(l.id).length),0)*.42) : idColumnRem;
  const resetHandled=useRef(0);
  const restored = useRef(false);
  const handled = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(ready&&resetRequest&&resetHandled.current!==resetRequest){
      resetHandled.current=resetRequest;
      restored.current=true;
      scroller.current?.querySelector<HTMLElement>('[data-slot=table-container]')?.scrollTo(0,0);
      setView(v=>({...resetReportView(v),group:''}));
      onResetComplete?.();
    }
  },[ready,resetRequest,setView,onResetComplete]);
  const setQuery = (query: string) => {
    setNotice("");
    setView((v) => ({ ...v, query, top: 0 }));
  };
  const setSelectedOnly = (selectedOnly: boolean) =>
    setView((v) => ({ ...v, selectedOnly, top: 0 }));
  const setIndex = (index: number) => setView((v) => ({ ...v, index, top: 0 }));
  const setColumns = (next: string[] | ((old: string[]) => string[])) =>
    setView((v) => ({ ...v, columns: typeof next === "function" ? next(v.columns) : next }));
  const [notice, setNotice] = useState("");
  const columnPicker = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: Event) => {
      const element = columnPicker.current;
      if (element?.open && event.target instanceof Node && !element.contains(event.target))
        element.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && columnPicker.current?.open) {
        columnPicker.current.open = false;
        columnPicker.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const candidates = useMemo(() => embedded ? lines : filterLines(lines, viewDraft, query, false).filter(
    (l: Line) => !selectedOnly || draft.included.includes(l.id) || Boolean(pointChoices?.counts[l.id]?.selected || pointChoices?.counts[l.id]?.legacySelected),
  ) as Line[], [embedded, lines, viewDraft, query, selectedOnly, draft.included, pointChoices]);
  const subjectFiltered = useMemo(() => embedded || groupLines ? candidates : filterSubjects(candidates, view.subjects) as Line[], [embedded, groupLines, candidates, view.subjects]);
  const ranked = useMemo(() => !embedded && onProfileChange
    ? rankForProfile(subjectFiltered, profile)
    : { lines: subjectFiltered, hidden: 0, unknown: 0 }, [embedded, onProfileChange, subjectFiltered, profile]);
  const filtered = useMemo(() => (groupLines&&view.group ? groupLines(ranked.lines as Line[]).find(g=>g.id===view.group)?.lines||[] : ranked.lines) as Line[], [groupLines, view.group, ranked.lines]);
  const { page, pages, rows } = pageSlice(filtered, embedded || groupLines || showAll ? 0 : index, embedded || groupLines || showAll ? Math.max(1, filtered.length) : 25) as {
    page: number;
    pages: number;
    rows: Line[];
  };
  const included = new Set(draft.included);
  const optionsFor = (items:Line[]) => subjectDefinitions
    ? subjectDefinitions.map(s=>({...s,count:items.filter(l=>filterSubjects([l],[s.id]).length>0).length})).filter(s=>s.count>0)
    : subjectOptions(items);
  const counts = optionsFor(
    onProfileChange ? rankForProfile(candidates, profile).lines : candidates,
  );
  const options = optionsFor(lines)
    .map((o) => ({ ...o, count: counts.find((c) => c.id === o.id)?.count ?? 0 }))
    .filter((o) => o.count > 0 || view.subjects.includes(o.id));
  useEffect(() => {
    if (ready && !restored.current) {
      restored.current = true;
      const el = scroller.current?.querySelector<HTMLElement>("[data-slot=table-container]");
      el?.scrollTo(view.left, view.top);
    }
  }, [ready, view.left, view.top]);
  useEffect(() => {
    if (
      !ready ||
      !reveal ||
      handled.current === reveal.nonce ||
      !lines.some((l) => l.id === reveal.id)
    )
      return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      handled.current = reveal.nonce;
      const i = filtered.findIndex((l) => l.id === reveal.id),
        hidden = i < 0;
      setView((v) => ({
        ...v,
        ...(hidden ? { query: "", subjects: [], selectedOnly: false, group:'' } : {}),
        index: v.showAll ? 0 : Math.floor(
          (hidden
            ? rankForProfile(lines, { ...profile, strongOnly: false }).lines.findIndex(
                (l: Line) => l.id === reveal.id,
              )
            : i) / 25,
        ),
        lastId: reveal.id,
        top: 0,
        revealNonce: reveal.nonce,
      }));
      if (hidden) setNotice("Filters gewist om " + normId(reveal.id) + " te tonen.");
      if (hidden && profile.strongOnly) onProfileChange?.({ ...profile, strongOnly: false });
    });
    return () => {
      cancelled = true;
    };
  }, [reveal, ready, lines, filtered, setView, profile, onProfileChange]);
  useEffect(() => {
    if (reveal && ready && view.revealNonce === reveal.nonce) {
      scroller.current
        ?.querySelector<HTMLElement>('[data-norm-id="' + reveal.id + '"]')
        ?.scrollIntoView({ block: "nearest" });
      onRevealComplete?.();
    }
  }, [view.revealNonce, ready, reveal, onRevealComplete]);
  const rowAll = (id:string) => pointChoices?.counts[id] ? pointChoices.counts[id].total>0 && pointChoices.counts[id].selected === pointChoices.counts[id].total : included.has(id);
  const rowSome = (id:string) => pointChoices?.counts[id] ? pointChoices.counts[id].selected > 0 || Boolean(pointChoices.counts[id].legacySelected) : included.has(id);
  const selectRows = (ids:string[], selected:boolean) => pointChoices ? pointChoices.onSelect(ids,selected) : onChange(selectLines(draft,ids,selected) as Draft);
  const selectableRows = (items:Line[]) => items.filter(l=>pointChoices?.counts[l.id]?.total!==0);
  const all = selectableRows(filtered).length > 0 && selectableRows(filtered).every((l) => rowAll(l.id));
  const allPage = selectableRows(rows).length > 0 && selectableRows(rows).every((l) => rowAll(l.id));
  const somePage = rows.some((l) => rowSome(l.id));
  const keys = (Object.keys(labels) as ElementKey[]).filter((k) => columns.includes(k));
  const [scrollEdges,setScrollEdges]=useState({left:false,right:false});
  useEffect(()=>{
    const element=scroller.current?.querySelector<HTMLElement>("[data-slot=table-container]");
    if(!element)return;
    const update=()=>setScrollEdges({left:element.scrollLeft>1,right:element.scrollLeft+element.clientWidth<element.scrollWidth-1});
    const observer=new ResizeObserver(update);
    observer.observe(element);
    if(element.firstElementChild)observer.observe(element.firstElementChild);
    element.addEventListener("scroll",update,{passive:true});update();
    return ()=>{observer.disconnect();element.removeEventListener("scroll",update);};
  },[columns,rows.length,viewKey]);
  const names: Record<string, string> = labels;
  const provenance: Record<string, string> = basisNames ?? basisLabels;
  function renderNorm(line:Line){
    const fields=sourceFields(line,'criterion').filter(f=>fieldIncluded(viewDraft,line.id,f.id));
    const first=fields[0],own=branchCount(draft,line.id,'criterion');
    const basis=first?(isEdited(line,first.id,viewDraft)?'USER_PROPOSAL':first.basis):undefined;
    return <>
      {basis&&(showProvenance||basis==='USER_PROPOSAL'||basis==='NOT_ESTABLISHED')&&basis!==columnBasis?.criterion&&<span className={'basis-tag '+basis}>{provenance[basis]}</span>}
      <SubjectExplanation id={line.id} text={draftValue(line,'criterion',viewDraft)}/>
      {(fields.length>1||own>0)&&<Button variant="link" className="multiplicity" onClick={()=>onOpenField?onOpenField(line.id,'criterion'):onOpen(line.id)}>{[fields.length>1?`${fields.length} brononderdelen`:'',own>0?`${own} eigen aanvullingen`:''].filter(Boolean).join(' · ')}</Button>}
    </>;
  }
  const renderTitle = (line: Line) => <>
    <Button
      variant="link"
      onClick={() => {
        setView((v) => ({ ...v, lastId: line.id }));
        onOpen(line.id);
      }}
      aria-label={`Bekijk ${line.id}: ${line.title}`}
      className="compact-title"
    >
      <span>{line.title}</span>
    </Button>
    {descriptiveTitles&&renderNorm(line)}
    {onProfileChange && profileActive(profile) && (
      <RelevancePreview line={line} profile={profile} onOpen={() => onOpen(line.id)} />
    )}
  </>;
  function scroll(direction: number) {
    const element = scroller.current?.querySelector<HTMLElement>("[data-slot=table-container]");
    element?.scrollBy({
      left: direction * Math.max(260, element.clientWidth - 250),
      behavior: "auto",
    });
  }
  return (
    <section className={`matrix-workspace${embedded ? ' matrix-embedded' : ''}${groupLines?' matrix-grouped':''}`} data-text-density={density} aria-label="Kaderonderdelen">
      {!embedded && <><div className="compact-toolbar">
        <Input
          aria-label="Zoek kaderonderdelen"
          placeholder="Zoek in alle basisvelden…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
        />
        <label htmlFor={selectedOnlyId}>
          <Checkbox
            id={selectedOnlyId}
            checked={selectedOnly}
            onCheckedChange={(v) => {
              setSelectedOnly(Boolean(v));
              setIndex(0);
            }}
          />
          Alleen geselecteerd
        </label>
        <output className="result-count">
          {filtered.length} resultaten
          {!pointChoices && <> · {lines.filter((l) => included.has(l.id)).length} geselecteerd {viewKey === "audit-selection" ? "in totaal" : "in deze weergave"}</>}
          {pointSelection && ` · ${countLabel(lines.reduce((n,l)=>n+(pointSelection.counts[l.id]?.selected??0),0),'toetspunten')}`}
        </output>
        {!groupLines&&<label className="matrix-page-size">Weergave
          <select aria-label="Aantal onderdelen per pagina" value={showAll ? 'all' : '25'} onChange={e=>{
            setView(v=>({...v,showAll:e.target.value==='all',index:0,top:0}));
            scroller.current?.querySelector('[data-slot=table-container]')?.scrollTo(0,0);
          }}>
            <option value="25">25 per pagina</option>
            <option value="all">Toon alles ({filtered.length})</option>
          </select>
        </label>}
        {!textDensity && <label className="matrix-text-density">Tekst
          <select aria-label="Hoeveel tekst in de cellen" value={density} onChange={e=>setLocalTextDensity(e.target.value as MatrixTextDensity)}>
            <option value="compact">Compact · 3 regels</option>
            <option value="comfortable">Meer tekst</option>
            {!groupLines&&<option value="full">Volledige tekst</option>}
          </select>
        </label>}
        <Button
          variant="outline"
          disabled={disabled || selectableRows(filtered).length === 0}
          onClick={() => pointSelection ? pointSelection.onBulk(filtered.map(l=>l.id)) : selectRows(filtered.map(l=>l.id),!all)}
        >
          {pointSelection ? `Kies alle toetspunten (${filtered.reduce((n,l)=>n+(pointSelection.counts[l.id]?.total??0),0)})` : `${all ? "Deselecteer" : "Selecteer"} alle ${filtered.length} resultaten`}
        </Button>
        <details className="column-picker" ref={columnPicker}>
          <summary>Kolommen ({keys.length}/{availableColumns.length})</summary>
          <div>
            {availableColumns.map((k) => (
              <label key={k}>
                <Checkbox
                  checked={columns.includes(k)}
                  disabled={columns.length === 1 && columns.includes(k)}
                  onCheckedChange={(v) =>
                    setColumns((old) => (v ? [...old, k] : old.filter((id) => id !== k)))
                  }
                />
                {names[k]}
              </label>
            ))}
            <Button variant="link" onClick={() => setColumns(availableColumns)}>
              Alle {availableColumns.length} velden
            </Button>
            <Button variant="link" onClick={() => setColumns(initialColumns)}>
              Standaardweergave
            </Button>
          </div>
        </details>
        {!groupLines&&<fieldset className="column-arrows"  aria-label="Kolommen verschuiven">
          <span>Verschuiven</span>
          <Button variant="outline" disabled={!scrollEdges.left} aria-label="Vorige kolommen" onClick={() => scroll(-1)}>
            ←
          </Button>
          <Button variant="outline" disabled={!scrollEdges.right} aria-label="Volgende kolommen" onClick={() => scroll(1)}>
            →
          </Button>
        </fieldset>}
      </div>
      <div className="subject-toolbar">
        {onProfileChange && (
          <AuditProfilePicker
            value={profile}
            onChange={(p) => {
              onProfileChange(p);
              setIndex(0);
            }}
          />
        )}
        {groupLines?<label className="matrix-group-filter">Procesgroep<select aria-label="Procesgroep" value={view.group} onChange={e=>setView(v=>({...v,group:e.target.value}))}><option value="">Alle groepen</option>{groupLines(lines).map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>:<FilterPicker
          label={subjectLabel}
          options={options}
          value={view.subjects}
          onChange={(subjects) => setView((v) => ({ ...v, subjects, index: 0, top: 0 }))}
        />}
        {showSubjectSuggestions && view.subjects.length === 0 &&
          options.slice(0, 3).map((o) => (
            <Button
              key={o.id}
              variant="ghost"
              className="subject-suggestion"
              onClick={() => setView((v) => ({ ...v, subjects: [o.id], index: 0, top: 0 }))}
            >
              {o.title} <span className="filter-count">{o.count}</span>
            </Button>
          ))}
      </div>
      {onProfileChange && profileActive(profile) && (
        <output className="profile-results">
          AI-inschatting ·{" "}
          {profile.sort === "original" ? "oorspronkelijke volgorde" : "meest passend eerst"}
          {profile.strongOnly ? " · alleen sterk passend" : ""}
          {ranked.hidden > 0 ? ` · ${ranked.hidden} verborgen` : ""}
          {ranked.unknown > 0 ? ` · ${ranked.unknown} nog niet beoordeeld` : ""}
          {profile.strongOnly && (
            <Button
              variant="link"
              onClick={() => {
                onProfileChange({ ...profile, strongOnly: false });
                setIndex(0);
              }}
            >
              Toon ook overige normen
            </Button>
          )}
        </output>
      )}
      </>}
      {notice && (
        <output className="navigation-notice">
          {notice}{" "}
          <Button variant="ghost" onClick={() => setNotice("")}>
            Sluiten
          </Button>
        </output>
      )}
      {groupLines&&!embedded?<div className="matrix-group-stack" ref={scroller}>{groupLines(filtered).map(group=><section className="matrix-browse-group" key={group.id} data-report-group={group.id}>
        <header><h3>{group.title}</h3><span>{countLabel(group.lines.length,'onderdelen')}</span></header>
        <CompactMatrix lines={group.lines} draft={draft} viewDraft={viewDraft} disabled={disabled} onChange={onChange} onOpen={onOpen} onOpenField={onOpenField} onOpenReport={onOpenReport} selected={selected||view.lastId} viewKey={`${viewKey}-group-${group.id}`} embedded combineIdentity={!descriptiveTitles} descriptiveTitles={descriptiveTitles} subjectColumnLabel={subjectColumnLabel} showProvenance={showProvenance} initialColumns={columns} columnOptions={availableColumns} textDensity={density} pointChoices={pointChoices} pointSelection={pointSelection}/>
      </section>)}</div>:<div
        className={`compact-table identified-table${combineIdentity ? ' combined-identity-table' : ''}${descriptiveTitles&&!combineIdentity?' matrix-explained-table':''}`}
        ref={scroller}
        onScrollCapture={(e) => {
          const el = e.target as HTMLElement;
          setView((v) => ({ ...v, top: el.scrollTop, left: el.scrollLeft }));
        }}
      >
        <Table style={{ minWidth: `calc(${identityColumnRem}rem + ${(combineIdentity ? 0 : descriptiveTitles?288:230) + keys.length * (descriptiveTitles?185:215)}px)` }}>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: `${identityColumnRem}rem` }}>
                <div className="row-title">
                  {!pointSelection && <Checkbox
                    aria-label={`${embedded ? 'Selecteer deze groep' : showAll ? 'Selecteer alle getoonde resultaten' : 'Selecteer deze pagina'} (${countLabel(rows.length,'onderdelen')})`}
                    checked={allPage}
                    indeterminate={somePage && !allPage}
                    disabled={disabled || !selectableRows(rows).length}
                    onCheckedChange={() => selectRows(rows.map(l=>l.id),!allPage)}
                  />}
                  <span>{combineIdentity ? 'Onderdeel' : 'ID'}</span>
                </div>
              </TableHead>
              {!combineIdentity && <TableHead style={descriptiveTitles?{width:'18rem'}:undefined}>{subjectColumnLabel}</TableHead>}
              {keys.map((k) => (
                <TableHead key={k} data-field={k}>{names[k]}{columnBasis?.[k]&&<small className="matrix-column-basis">{provenance[columnBasis[k]!]}</small>}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow
                key={l.id}
                data-norm-id={l.id}
                data-state={(selected || view.lastId) === l.id ? "selected" : undefined}
              >
                <TableCell>
                  <div className="row-title">
                    {!pointSelection && <Checkbox
                      checked={rowAll(l.id)}
                      indeterminate={rowSome(l.id) && !rowAll(l.id)}
                      disabled={disabled || pointChoices?.counts[l.id]?.total===0}
                      aria-label={pointChoices?.counts[l.id] ? `Selecteer alle toetspunten van ${l.id}` : `Neem ${l.id} op in mijn auditkader`}
                      onCheckedChange={() => selectRows([l.id],!rowAll(l.id))}
                    />}
                    {onOpenReport ? (
                      <Button
                        variant="link"
                        className="norm-id norm-report-link"
                        aria-label={"Open bronrapport van " + normId(l.id)}
                        onClick={() => onOpenReport(l)}
                      >
                        {normId(l.id)}
                      </Button>
                    ) : (
                      <span className="norm-id">{normId(l.id)}</span>
                    )}
                    {pointChoices?.counts[l.id]&&<Button variant="ghost" className="point-choice-button bd-row-choice matrix-point-chip" disabled={disabled}
                      title={`${pointChoices.counts[l.id].selected} van ${countLabel(pointChoices.counts[l.id].total,'toetspunten')} gekozen`}
                      aria-label={`Kies toetspunten voor ${l.id}`} onClick={()=>pointChoices.onChoose(l.id)}>
                      <span>Bekijk toetspunten</span><span className="matrix-count-label">{pointChoices.counts[l.id].selected}/{pointChoices.counts[l.id].total} gekozen</span>
                    </Button>}
                  </div>
                  {combineIdentity && <div className="matrix-identity-title">{renderTitle(l)}</div>}
                  {pointSelection && <Button variant="outline" className="point-choice-button" disabled={disabled}
                    aria-label={`Kies toetspunten voor ${l.id}`}
                    onClick={()=>pointSelection.onChoose(l.id)}>
                    Bekijk toetspunten · {pointSelection.counts[l.id]?.selected??0}/{pointSelection.counts[l.id]?.total??0} gekozen
                  </Button>}
                  {pointChoices?.counts[l.id] && <>
                    {(included.has(l.id) || pointChoices.counts[l.id].legacySelected) && <small className="bd-legacy-label">Eerdere itemkeuze</small>}
                  </>}
                </TableCell>
                {!combineIdentity && <TableCell>{renderTitle(l)}</TableCell>}
                {keys.map((k) => {
                  const fields = sourceFields(l, k).filter((f) =>
                    fieldIncluded(viewDraft, l.id, f.id),
                  );
                  const first = fields[0];
                  const extra = fields.length - 1;
                  const own = branchCount(draft, l.id, k);
                  const basis = isEdited(l, first.id, viewDraft) ? "USER_PROPOSAL" : first.basis;
                  return (
                    <TableCell key={k}>
                      {(showProvenance || basis==='USER_PROPOSAL' || basis==='NOT_ESTABLISHED') && basis!==columnBasis?.[k]&&<span className={"basis-tag " + basis}>{provenance[basis]}</span>}
                      <FullTextPreview
                        text={draftValue(l, first.id, viewDraft)}
                        label={`Bekijk ${names[k]} van ${l.id}`}
                        onOpen={() => onOpenField ? onOpenField(l.id, k) : onOpen(l.id)}
                      />
                      {(extra > 0 || own > 0) && (
                        <Button
                          variant="link"
                          className="multiplicity"
                          onClick={() => onOpen(l.id)}
                        >
                          {extra > 0 ? `${fields.length} brononderdelen` : ""}
                          {extra > 0 && own > 0 ? " · " : ""}
                          {own > 0 ? `${own} eigen aanvullingen` : ""}
                        </Button>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>}
      {!filtered.length && (
        <p className="matrix-empty">Geen onderdelen gevonden. Pas uw zoekopdracht of filter aan.</p>
      )}
      {!embedded && !groupLines && <div className="matrix-bottom">
        <span>{density==='full' ? 'Volledige tekst' : 'Verkorte weergave'} · open een onderdeel voor toelichting en bronnen.</span>
        {showAll ? <output >Alle {filtered.length} resultaten op één pagina</output> : <Pagination aria-label="Pagina’s kaderonderdelen">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                disabled={page === 0}
                onClick={() => {
                  setIndex(page - 1);
                  scroller.current?.querySelector("[data-slot=table-container]")?.scrollTo(0, 0);
                }}
              >
                ← Vorige
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span>
                Pagina {page + 1} van {pages} · 25 per pagina
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="ghost"
                disabled={page + 1 === pages}
                onClick={() => {
                  setIndex(page + 1);
                  scroller.current?.querySelector("[data-slot=table-container]")?.scrollTo(0, 0);
                }}
              >
                Volgende →
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>}
      </div>}
    </section>
  );
}
