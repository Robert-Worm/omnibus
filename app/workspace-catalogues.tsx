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
import {ToolSelect} from './catalogue-table';
import {Search,X} from 'lucide-react';
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
            title="Thema openen of sluiten; je normselectie blijft bewaard"
          >
            <Checkbox
              aria-label={"Open thema " + t.title}
              checked={openIds.includes(t.id)}
              onCheckedChange={(v) => onToggle(t.id, Boolean(v))}
            />
            {/* Alleen een echte code tonen (T05, CIBGBIO24-T01); een interne naam zoals "risk-control" zegt de lezer niets. */}
            {/^[A-Z0-9-]+$/.test(themeReference(t.id)) && <span className="theme-reference">{themeReference(t.id)}</span>}
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
  <OpenItemStrip id="themes" items={opened} activeId={activeId} allActive={combined} onAll={onCombine} onActivate={onOpen} onClose={onClose} onExplore={onExplore} exploreLabel="Terug naar alle thema’s &amp; processen"/>
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
  // Compacte lijst in dezelfde vorm als de andere overzichten (besluit B-058): één regel per rapport.
  const perPage = 50;
  // Nieuwste rapport bovenaan.
  const dateKey = (f: Framework) => f.report.date || String(f.report.year ?? "");
  matches.sort((a, b) => dateKey(b).localeCompare(dateKey(a)) || a.report.title.localeCompare(b.report.title, "nl"));
  const pages = Math.max(1, Math.ceil(matches.length / perPage));
  const currentPage = Math.min(page, pages - 1);
  const dateText = (f: Framework) =>
    f.report.date ? f.report.date.split("-").reverse().join("-") : String(f.report.year ?? "");
  const scopeOptions = [
    { value: "open", label: "Open thema’s" },
    { value: "audit", label: "Mijn referentiekader" },
    { value: "all", label: "Alle bronrapporten" },
  ];
  return (
    <section className="catalogue report-catalogue">
      <section className="catalogue-table report-table" aria-label="Lijst van rapporten">
        <div className="catalogue-table-frame">
          <div className="catalogue-table-tools">
            <div className="catalogue-table-search">
              <Search size={15} aria-hidden="true" />
              <input
                id="report-search"
                type="search"
                aria-label="Zoek rapport"
                placeholder="Zoek op titel, jaar, rapport-ID of norm-ID…"
                value={query}
                maxLength={500}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="catalogue-table-filters">
              <ToolSelect
                label="Rapporten bij:"
                value={scope}
                onChange={(value) => onScope(value as "open" | "audit" | "all")}
                options={scopeOptions}
              />
              {scope === "open" && reportChoice && (
                <ToolSelect
                  label="Aan/uitzetten voor:"
                  active={Boolean(choiceTheme)}
                  value={choiceTheme?.id ?? ""}
                  onChange={(value) => reportChoice.onTheme(value)}
                  options={[
                    { value: "", label: "Alle open thema’s" },
                    ...reportChoice.themes.map((t) => ({ value: t.id, label: t.title })),
                  ]}
                />
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
              {query && (
                <button
                  type="button"
                  className="catalogue-tool-clear"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                >
                  <X size={14} aria-hidden="true" />
                  Wis zoeken
                </button>
              )}
            </div>
            {scope !== "open" && reportChoice && frameworks.length > 0 && (
              <div className="catalogue-table-grouping">
                {reportChoice.themes.length ? (
                  <button type="button" className="catalogue-tool-clear" onClick={() => onScope("open")}>
                    Rapporten per thema aan/uitzetten
                  </button>
                ) : (
                  <a className="catalogue-tool-clear" href="#themas" title="Rapporten zet je per geopend thema aan of uit.">
                    Rapporten per thema aan/uitzetten: open eerst een thema
                  </a>
                )}
              </div>
            )}
          </div>
          <output className="catalogue-table-count">
            <span>
              <strong>{matches.length}</strong> {matches.length === 1 ? "rapport" : "rapporten"}
            </span>
            {choiceTheme && reportChoice && (
              <em>
                {choiceTheme.reportIds.filter((id) => reportChoice.enabled(id)).length} van{" "}
                {choiceTheme.reportIds.length} actief in {choiceTheme.title} ·{" "}
                {countLabel(
                  choiceTheme.reportIds
                    .filter((id) => !reportChoice.enabled(id))
                    .reduce((n, id) => n + reportChoice.impact(id).norms, 0),
                  "normen",
                )}{" "}
                verborgen. Je verzamelde en gekoppelde normen blijven behouden.
              </em>
            )}
            {scope === "open" && reportChoice && !choiceTheme && reportChoice.themes.length > 0 && (
              <em>Kies bij “Aan/uitzetten voor” een thema om rapporten aan of uit te zetten.</em>
            )}
          </output>
          {matches.length > 0 && (
            <div className="catalogue-table-scroll">
              <table data-dense="">
                <thead>
                  <tr>
                    {choiceTheme && (
                      <th scope="col" className="catalogue-table-check">
                        <span className="sr-only">In thema</span>
                      </th>
                    )}
                    <th scope="col" data-column="id" style={{ width: "8.5rem" }}>
                      <span>ID</span>
                    </th>
                    <th scope="col">
                      <span>Rapport</span>
                    </th>
                    <th scope="col" data-column="date" style={{ width: "7.5rem" }}>
                      <span>Datum</span>
                    </th>
                    <th scope="col" data-column="themes" style={{ width: "13.5rem" }}>
                      <span>Thema’s en processen</span>
                    </th>
                    <th scope="col" data-column="actions" style={{ width: "10.5rem" }}>
                      <span className="sr-only">Acties</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matches.slice(currentPage * perPage, (currentPage + 1) * perPage).map((f) => {
                    const enabled = !choiceTheme || Boolean(reportChoice?.enabled(f.report.id));
                    const impact = choiceTheme && reportChoice ? reportChoice.impact(f.report.id) : null;
                    const linked = themes.filter((t) => t.reportIds.includes(f.report.id));
                    return (
                      <tr
                        key={f.report.id}
                        data-row=""
                        data-report=""
                        data-active={enabled}
                        onClick={(event) => {
                          if (!(event.target as HTMLElement).closest("button,a,input,summary,details,[role=checkbox],.catalogue-table-check"))
                            onOpen(f.report.id);
                        }}
                      >
                        {choiceTheme && reportChoice && (
                          <td className="catalogue-table-check">
                            <span className="catalogue-check-area" title={"Gebruik " + f.report.id + " voor " + choiceTheme.title}>
                              <Checkbox
                                id={"report-choice-" + f.report.id}
                                checked={reportChoice.enabled(f.report.id)}
                                disabled={!reportChoice.ready}
                                aria-label={"Gebruik " + f.report.title + " voor " + choiceTheme.title}
                                onCheckedChange={(v) => reportChoice.onToggle(f.report.id, Boolean(v))}
                              />
                            </span>
                          </td>
                        )}
                        <td data-column="id">
                          <span className="report-source-id">{f.report.id}</span>
                        </td>
                        <th scope="row" className="catalogue-table-name">
                          <button type="button" onClick={() => onOpen(f.report.id)}>
                            {f.report.title}
                          </button>
                          {impact && (
                            <span>
                              {enabled ? "" : "Uitgesloten · "}
                              {countLabel(impact.norms, "normen")} {enabled ? "verbergen bij uitsluiten" : "verborgen"}
                              {impact.collected > 0 && ` · ${impact.collected} verzameld, ${impact.linked} gekoppeld — blijven behouden`}
                            </span>
                          )}
                        </th>
                        <td data-column="date">
                          {dateText(f)}
                        </td>
                        <td data-column="themes">
                          <ReportContextLinks items={linked} onOpen={onTheme} compact />
                        </td>
                        <td data-column="actions" className="report-row-actions">
                          {onRisks && riskReportIds.includes(f.report.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={"Bekijk normen en toetspunten van " + f.report.id}
                              onClick={() => onRisks(f.report.id)}
                            >
                              Normen bekijken
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!matches.length && (
            <div className="catalogue-table-empty">
              <p>
                {scope === "all" && !frameworks.length
                  ? "Nog geen rapporten beschikbaar. De nieuwe rapportselectie wordt afzonderlijk toegevoegd."
                  : !ids.length
                    ? scope === "open"
                      ? "Open een thema om de bijbehorende rapporten te zien."
                      : "Selecteer normen om hun bronrapporten hier te zien."
                    : "Geen rapport gevonden."}
              </p>
              {!ids.length && scope !== "all" && (
                <Button variant="outline" onClick={onExplore}>
                  Thema’s bekijken
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
      {pages > 1 && (
        <nav className="report-pagination" aria-label="Rapportpagina’s">
          <Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            Vorige
          </Button>
          <span>
            {currentPage + 1} / {pages}
          </span>
          <Button variant="outline" disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>
            Volgende
          </Button>
        </nav>
      )}
    </section>
  );
}

