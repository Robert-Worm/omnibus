"use client";
import {countLabel} from '@/lib/display-count.mjs';
import { useEffect, useRef } from "react";
import { themeReference } from "@/lib/theme-workspaces.mjs";
import { describeThemes, themeDiscoveryText, matchingThemeCriteria } from '@/lib/theme-discovery.mjs';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FilterPicker from "./filter-picker";
import OpenItemStrip,{OpenWorkspaceEmpty} from './open-item-strip';
import ReportContextLinks from './report-context-links';
import { useBrowseState } from "./browse-state";
import { catalogueSlice } from "@/lib/norm-navigation.mjs";
import {
  filterThemes,
  processOptionsFrom,
  themeProcessIds,
  themeSubjects,
} from "@/lib/catalogue-filters.mjs";
import { reportMatchesQuery } from "@/lib/report-navigation.mjs";
import type { Framework } from "@/lib/framework-types";
export type Theme = {
  id: string;
  title: string;
  keywords: string;
  lineIds: string[];
  reportIds: string[];
  directoryHidden?: boolean;
};
// Built once: the process catalogue does not change after load.
const themeProcessOptions: { id: string; title: string }[] = processOptionsFrom(themeProcessIds);
export function ThemeCatalogue({
  framework,
  onProcesses,
  themes,
  openIds,
  onOpen,
  onToggle,
  onDeselectAll,
  onReports,
}: {
  framework: Framework;
  onProcesses?: () => void;
  themes: Theme[];
  openIds: string[];
  onOpen: (id: string) => void;
  onToggle: (id: string, open: boolean) => void;
  onDeselectAll?: () => void;
  onReports: (id: string) => void;
}) {
  const [view, setView] = useBrowseState("theme-catalogue", {
    query: "",
    page: 0,
    openOnly: false,
    subject: "all",
    processId: "",
  });
  const { query, openOnly, subject, processId } = view;
  const filtered = subject !== "all" || processId !== "" || openOnly;
  const { matches, rows, page, pages } = catalogueSlice(
    describeThemes(filterThemes(themes, { subject, processId, openOnly, openIds }), framework),
    query,
    view.page,
    (t: ReturnType<typeof describeThemes>[number]) => themeReference(t.id) + ' ' + themeDiscoveryText(t),
  );
  return (
    <section className="catalogue">
      <div className="collection-header">
        <div className="collection-header-top">
          <label className="collection-search-label" htmlFor="theme-search">Zoek thema of proces</label>
        </div>
        <Input
          id="theme-search"
          className="collection-search"
          aria-label="Zoek thema"
          placeholder="Zoek een thema, onderwerp of bouwsteen…"
          value={query}
          onChange={(e) => setView((v) => ({ ...v, query: e.target.value, page: 0 }))}
        />
        <div className="collection-filters">
          <div className="collection-filter-group" aria-label="Soort ingang">
            <Button aria-pressed>Thema’s</Button>
            <Button variant="outline" onClick={onProcesses}>
              Processen
            </Button>
          </div>
          <label className="collection-filter">
            <span>Onderwerp</span>
            <select
              value={subject}
              onChange={(e) => setView((s) => ({ ...s, subject: e.target.value, page: 0 }))}
            >
              <option value="all">Alle onderwerpen</option>
              {themeSubjects.map((s: { id: string; title: string }) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="collection-filter">
            <span>Proces</span>
            <select
              value={processId}
              onChange={(e) => setView((s) => ({ ...s, processId: e.target.value, page: 0 }))}
            >
              <option value="">Alle processen</option>
              {themeProcessOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="creator-check" htmlFor="theme-open-only">
            <Checkbox
              id="theme-open-only"
              checked={openOnly}
              onCheckedChange={(v) => setView((s) => ({ ...s, openOnly: Boolean(v), page: 0 }))}
            />
            Alleen open thema’s
          </label>
        </div>
      </div>
      {filtered && <p className="creator-help">
        Zoekfilters beperken de getoonde thema’s; onderwerp en proces zijn zoekhulp, geen oordeel over toepasselijkheid.{' '}
        <Button
          variant="link"
          onClick={() => setView((s) => ({ ...s, subject: "all", processId: "", openOnly: false, page: 0 }))}
        >
          Alle thema’s tonen
        </Button>
      </p>}
      <p className="pilot-corpus-note">Testversie: {new Set(themes.flatMap(t=>t.reportIds)).size} rapporten verwerkt. Meer dan 500 potentiële rapporten zijn geselecteerd voor latere uitbreiding, maar nog niet verwerkt.</p>
      <div className="catalogue-toolbar">
        <p className="report-result-count">{matches.length} {matches.length === 1 ? 'thema' : 'thema’s'} · alfabetisch</p>
        {onDeselectAll && (
          <Button
            variant="outline"
            disabled={!openIds.length}
            title="Sluit alle open thema’s; bouwstenen en onderzoeksvragen blijven bewaard"
            onClick={onDeselectAll}
          >
            Alle thema’s deselecteren
          </Button>
        )}
      </div>
      {rows.map((t: ReturnType<typeof describeThemes>[number]) => (
        <article className="theme-card selectable-theme" key={t.id}>
          <label
            className="theme-selection-cell"
            title="Thema openen of sluiten; uw normselectie blijft bewaard"
          >
            <Checkbox
              aria-label={"Open thema " + t.title}
              checked={openIds.includes(t.id)}
              onCheckedChange={(v) => onToggle(t.id, Boolean(v))}
            />
            <span className="theme-reference">{themeReference(t.id)}</span>
          </label>
          <div>
            <div className="theme-summary">
              <h2>{t.title}</h2>
              <p className="theme-description">{t.description}</p>
              {matchingThemeCriteria(t,query).length>0 && <p className="theme-search-matches">
                Gevonden: {matchingThemeCriteria(t,query).slice(0,2).map((c: {title:string})=>c.title).join(' · ')}
                {matchingThemeCriteria(t,query).length>2 ? ` · en ${matchingThemeCriteria(t,query).length-2} andere bouwstenen` : ''}
              </p>}
            </div>
            <p className="theme-counts">
              <Button
                variant="ghost"
                aria-label={"Bekijk normen voor " + t.title}
                onClick={() => onOpen(t.id)}
              >
                <strong>{t.lineIds.length}</strong> {t.lineIds.length === 1 ? "norm" : "normen"}
              </Button>
              <Button
                variant="ghost"
                aria-label={"Bekijk rapporten voor " + t.title}
                onClick={() => onReports(t.id)}
              >
                <strong>{t.reportIds.length}</strong>{" "}
                {t.reportIds.length === 1 ? "rapport" : "rapporten"}
              </Button>
            </p>
          </div>
          <Button onClick={() => onOpen(t.id)}>
            {openIds.includes(t.id) ? "Verder in thema" : "Bekijk normen"}
          </Button>
        </article>
      ))}
      {!themes.length && <p className="empty-framework">Nog geen thema’s beschikbaar. De eerdere proefrapporten zijn uit het aanbod gehaald. Modellen en kaders blijven beschikbaar.</p>}
      {pages > 1 && (
        <nav className="report-pagination" aria-label="Themapagina’s">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setView((v) => ({ ...v, page: page - 1 }))}
          >
            Vorige
          </Button>
          <span>
            {page + 1} / {pages}
          </span>
          <Button
            variant="outline"
            disabled={page + 1 === pages}
            onClick={() => setView((v) => ({ ...v, page: page + 1 }))}
          >
            Volgende
          </Button>
        </nav>
      )}
      {!matches.length && <p>{openOnly && !openIds.length
        ? 'Nog geen thema geopend. Zet het filter uit om alle thema’s te zien.'
        : filtered
          ? 'Geen thema binnen deze filters. Zet de filters uit om alle thema’s te zien.'
          : 'Geen beschikbaar thema gevonden.'}</p>}
    </section>
  );
}
export function OpenThemes({themes,openIds,activeId,combined,onCombine,onOpen,onClose,onExplore,actions}:{themes:Theme[];openIds:string[];activeId:string|null;combined:boolean;onCombine:()=>void;onOpen:(id:string)=>void;onClose:(id:string)=>void;onExplore:()=>void;actions?:React.ReactNode}) {
 const opened=themes.filter(t=>openIds.includes(t.id));
 return <section className="open-themes" aria-label="Open thema’s en processen">
  <OpenItemStrip id="themes" items={opened} activeId={activeId} allActive={combined} onAll={onCombine} onActivate={onOpen} onClose={onClose} onExplore={onExplore} exploreLabel="Thema of proces openen"/>
  {actions&&<div className="open-workspace-actions">{actions}</div>}
  {!opened.length&&<OpenWorkspaceEmpty prompt="Open een thema of proces om de inhoud te bekijken."/>}
 </section>;
}
export function ReportCatalogue({
  frameworks,
  themes,
  reportIds,
  auditReportIds,
  scope,
  onScope,
  onOpen,
  onRisks,
  riskReportIds=[],
  onTheme,
  onExplore,
  reportChoice,
  entryRequest,
  onEntryComplete,
}: {
  frameworks: Framework[];
  themes: Theme[];
  reportIds: string[];
  auditReportIds: string[];
  scope: "open" | "audit" | "all";
  onScope: (scope: "open" | "audit" | "all") => void;
  onOpen: (id: string) => void;
  onRisks?: (id:string)=>void;
  riskReportIds?: string[];
  onTheme: (id: string) => void;
  onExplore: () => void;
  reportChoice?: {
    themes: Theme[];
    themeId: string;
    onTheme: (id: string) => void;
    enabled: (reportId: string) => boolean;
    onToggle: (reportId: string, enabled: boolean) => void;
    ready: boolean;
    impact: (reportId: string) => { norms: number; collected: number; linked: number };
  };
  entryRequest?: number;
  onEntryComplete?: () => void;
}) {
  const [view, setView, ready] = useBrowseState("report-catalogue", {
    query: "",
    themeFilter: [] as string[],
    page: 0,
  });
  const handledEntry = useRef(0);
  useEffect(() => {
    if (!ready || !entryRequest || handledEntry.current === entryRequest) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      handledEntry.current = entryRequest;
      setView({ query: "", themeFilter: [], page: 0 });
      onEntryComplete?.();
    });
    return () => {
      cancelled = true;
    };
  }, [ready, entryRequest, setView, onEntryComplete]);
  const { query, themeFilter, page } = view;
  const setQuery = (query: string) => setView((v) => ({ ...v, query }));
  const setPage = (page: number) => setView((v) => ({ ...v, page }));
  const choiceTheme =
    scope === "open" ? reportChoice?.themes.find((t) => t.id === reportChoice.themeId) : undefined;
  const ids =
    scope === "all"
      ? frameworks.map((f) => f.report.id)
      : scope === "audit"
        ? auditReportIds
        : (choiceTheme?.reportIds ?? reportIds);
  const scopeIds = new Set(ids);
  const filteredReportIds = new Set(
    themes.filter((t) => themeFilter.includes(t.id)).flatMap((t) => t.reportIds),
  );
  const unique = [...new Map(frameworks.map((f) => [f.report.id, f])).values()];
  const matches = unique.filter(
    (f) =>
      scopeIds.has(f.report.id) &&
      (scope === "all" ||
        choiceTheme ||
        !themeFilter.length ||
        filteredReportIds.has(f.report.id)) &&
      reportMatchesQuery(f, query),
  );
  const pages = Math.max(1, Math.ceil(matches.length / 25));
  const currentPage = Math.min(page, pages - 1);
  return (
    <section className="catalogue report-catalogue">
      <div className="collection-header">
        <div className="collection-header-top">
          <label className="collection-search-label" htmlFor="report-search">Zoek rapport</label>
        </div>
        <Input
          id="report-search"
          className="collection-search"
          aria-label="Zoek rapport"
          placeholder="Zoek op titel, jaar, rapport-ID of norm-ID…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <div className="collection-filters">
          <label className="collection-filter library-scope">
            <span>Rapporten bij</span>
            <select
              aria-label="Rapporten bij"
              value={scope}
              onChange={(e) => onScope(e.target.value as "open" | "audit" | "all")}
            >
              <option value="open">Open thema’s</option>
              <option value="audit">Mijn referentiekader</option>
              <option value="all">Alle bronrapporten</option>
            </select>
          </label>
        </div>
      </div>
      {scope !== "open" && reportChoice && frameworks.length>0 && (
        <div className="report-choice-panel">
          <Button variant="outline" disabled={!reportChoice.themes.length} onClick={() => onScope("open")}>
            Rapporten aan/uitzetten per thema
          </Button>
          {!reportChoice.themes.length && <a href="#themas">Open eerst een thema</a>}
        </div>
      )}
      {scope === "open" && reportChoice && (
        <section className="report-choice-panel" aria-label="Bronrapporten kiezen">
          <label className="library-scope">
            Rapporten aan/uitzetten voor
            <select
              aria-label="Rapportkeuze voor thema"
              value={choiceTheme?.id ?? ""}
              onChange={(e) => reportChoice.onTheme(e.target.value)}
            >
              <option value="">Alle open thema’s</option>
              {reportChoice.themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          {choiceTheme ? (
            <>
              <output>
                {choiceTheme.reportIds.filter((id) => reportChoice.enabled(id)).length} van{" "}
                {choiceTheme.reportIds.length} actief
                {" · "}
                {choiceTheme.reportIds
                  .filter((id) => !reportChoice.enabled(id))
                  .reduce((n, id) => n + reportChoice.impact(id).norms, 0)}{" "}
                normen verborgen
              </output>
              <span>
                Filtert alleen dit thema. Uw verzamelde en gekoppelde normen blijven behouden, ook
                in de export.
              </span>
            </>
          ) : (
            <span>Kies een thema om rapporten aan of uit te zetten.</span>
          )}
        </section>
      )}
      {scope !== "all" && themes.length > 1 && !choiceTheme && (
        <FilterPicker
          label="Themafilters"
          options={themes.map((t) => ({
            ...t,
            count: new Set(t.reportIds.filter((id) => scopeIds.has(id))).size,
          }))}
          value={themeFilter}
          onChange={(themeFilter) => setView((v) => ({ ...v, themeFilter, page: 0 }))}
        />
      )}
      <p className="report-result-count">
        {matches.length} {matches.length === 1 ? "rapport" : "rapporten"}
      </p>
      {matches.length > 0 && (
        <div className="report-list-heading" data-choice={Boolean(choiceTheme)} aria-hidden="true">
          {choiceTheme && <span>In thema</span>}
          <span>Rapport</span>
          <span>Bekijken</span>
        </div>
      )}
      {matches.slice(currentPage * 25, (currentPage + 1) * 25).map((f) => (
        <article
          className="report-list-item"
          data-choice={Boolean(choiceTheme)}
          data-active={!choiceTheme || reportChoice?.enabled(f.report.id)}
          key={f.report.id}
        >
          {choiceTheme && reportChoice && (
            <div className="report-selection-cell">
              <label
                className="report-selection-target"
                htmlFor={"report-choice-" + f.report.id}
                aria-label={"Gebruik rapport " + f.report.id + " voor " + choiceTheme.title}
              >
                <Checkbox
                  id={"report-choice-" + f.report.id}
                  className="report-choice-checkbox"
                  checked={reportChoice.enabled(f.report.id)}
                  disabled={!reportChoice.ready}
                  aria-label={"Gebruik " + f.report.title + " voor " + choiceTheme.title}
                  onCheckedChange={(v) => reportChoice.onToggle(f.report.id, Boolean(v))}
                />
              </label>
              {!reportChoice.enabled(f.report.id) && (
                <span className="report-excluded-status">Uitgesloten</span>
              )}
            </div>
          )}
          <div className="report-list-body">
            <h2>
              <span className="report-source-id" aria-label={"Rapport-ID " + f.report.id}>
                {f.report.id}
              </span>
              <span>{f.report.title}</span>
            </h2>
            <p>
              {f.report.date
                ? `Rapportdatum ${f.report.date.split("-").reverse().join("-")}`
                : `Verslagjaar ${f.report.year}`}
            </p>
            {choiceTheme && reportChoice && (
              <p className="report-norm-impact">
                {countLabel(reportChoice.impact(f.report.id).norms,'normen')}{" "}
                {reportChoice.enabled(f.report.id) ? "verbergen bij uitsluiten" : "verborgen"} in
                dit thema
                {reportChoice.impact(f.report.id).collected > 0 && (
                  <>
                    {" "}
                    · {reportChoice.impact(f.report.id).collected} verzameld, waarvan{" "}
                    {reportChoice.impact(f.report.id).linked} gekoppeld — blijven behouden
                  </>
                )}
              </p>
            )}
            <ReportContextLinks items={themes.filter(t=>t.reportIds.includes(f.report.id))} onOpen={onTheme}/>
          </div>
          <div className="report-list-actions">
          {onRisks&&riskReportIds.includes(f.report.id)&&<Button onClick={()=>onRisks(f.report.id)}>Bekijk normen en toetspunten →</Button>}
          <Button variant="outline" onClick={() => onOpen(f.report.id)}>
            Lees rapport →
          </Button>
          </div>
        </article>
      ))}
      {pages > 1 && (
        <nav className="report-pagination" aria-label="Rapportpagina’s">
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Vorige
          </Button>
          <span>
            {currentPage + 1} / {pages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage + 1 === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Volgende
          </Button>
        </nav>
      )}
      {!matches.length && (
        <div className="empty-framework">
          <p>
            {scope==='all' && !frameworks.length ? 'Nog geen rapporten beschikbaar. De nieuwe rapportselectie wordt afzonderlijk toegevoegd.' : !ids.length
              ? scope === "open"
                ? "Open een thema om de bijbehorende rapporten te zien."
                : "Selecteer normen om hun bronrapporten hier te zien."
              : "Geen rapport gevonden."}
          </p>
          {!ids.length && scope!=='all' && (
            <Button variant="outline" onClick={onExplore}>
              Thema’s bekijken
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
