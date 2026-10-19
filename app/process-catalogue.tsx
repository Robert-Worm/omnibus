"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activeProcesses as processes } from "@/lib/process-catalogue.mjs";
import { adoptProcessQuestionPlan, chooseProcess } from "@/lib/research-proposals.mjs";
import type { Draft } from "@/lib/framework-types";
import { catalogueSlice } from "@/lib/norm-navigation.mjs";
import { foundations } from "@/lib/investigation.mjs";
import { reviewedProcessTopics } from "@/lib/reviewed-process-links.mjs";
import {
  filterProcesses,
  processDomainOptions,
  processSourceOptions,
} from "@/lib/catalogue-filters.mjs";
// A process carries its own sources, so both lists are derived once from the
// catalogue instead of being maintained by hand.
const domainOptions: { id: string; title: string }[] = processDomainOptions();
const sourceOptions: { id: string; title: string }[] = processSourceOptions(foundations);
export default function ProcessCatalogue({
  draft,
  onChange,
  navigate,
  onSources,
  onTheme,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  navigate: (s: string) => void;
  onSources: (s: string) => void;
  onTheme: (s: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [domain, setDomain] = useState("all"),
    [sourceId, setSourceId] = useState("");
  const filtered = domain !== "all" || sourceId !== "";
  const view = catalogueSlice(
    filterProcesses(processes, { domain, sourceId }),
    query,
    page,
    (p: (typeof processes)[number]) => p.id + " " + p.title + " " + p.keywords,
  );
  const rows: typeof processes = view.rows;
  return (
    <section className="foundation-catalogue">
      <div className="collection-header">
        <div className="collection-header-top">
          <label className="collection-search-label" htmlFor="process-search">Zoek thema of proces</label>
        </div>
        <Input
          id="process-search"
          className="collection-search"
          aria-label="Zoek proces"
          placeholder="Zoek een proces, bijvoorbeeld change management…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <div className="collection-filters">
          <div className="collection-filter-group" aria-label="Soort ingang">
            <Button variant="outline" onClick={() => navigate("catalogue")}>
              Thema’s
            </Button>
            <Button aria-pressed>Processen</Button>
          </div>
          <label className="collection-filter">
            <span>Domein</span>
            <select
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">Alle domeinen</option>
              {domainOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>
          <label className="collection-filter">
            <span>Wet of kader</span>
            <select
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Alle wetten &amp; kaders</option>
              {sourceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {filtered && <p className="creator-help">
        Zoekfilters beperken de getoonde processen; domein en bron komen uit de bronnen die bij een proces horen.{' '}
        <Button variant="link" onClick={() => { setDomain("all"); setSourceId(""); setPage(0); }}>
          Alle processen tonen
        </Button>
      </p>}
      <div className="process-list">
        {rows.map((p) => (
          <article key={p.id}>
            <div>
              <span className="source-meta">{p.id}</span>
              <h2>{p.title}</h2>
              <p>{p.question}</p>
              {reviewedProcessTopics(p.id).map(topic=>(
                <details key={topic.themeId} className="creator-review">
                  <summary>Uit historische rapporten: {topic.title} ({topic.lineIds.length})</summary>
                  <p className="creator-help">{topic.reason}</p>
                  <p className="source-meta">Bij dit proces: {topic.lineIds.join(', ')}</p>
                  <Button variant="link" onClick={()=>onTheme(topic.themeId)}>Bekijk het volledige thema</Button>
                </details>
              ))}
            </div>
            <div className="process-actions">
              <Button variant="outline" onClick={() => {onChange(chooseProcess(draft,p.id) as Draft);onSources(p.id);}}>
                Bronnen verkennen
              </Button>
              {p.themeId && (
                <Button variant="outline" onClick={() => onTheme(p.themeId!)}>
                  Praktijknormen
                </Button>
              )}
              <Button
                disabled={(draft.research?.questions.length || 0) >= 200}
                onClick={() => {
                  onChange(adoptProcessQuestionPlan(draft,p.id).draft as Draft);
                  navigate("framework");
                }}
              >
                Begin met deze vraag
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <p>{filtered
        ? 'Geen proces binnen deze filters. Zet de filters uit om alle processen te zien.'
        : 'Geen proces gevonden.'}</p>}
      {view.pages > 1 && (
        <nav className="foundation-pagination" aria-label="Procespagina’s">
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
        </nav>
      )}
    </section>
  );
}
