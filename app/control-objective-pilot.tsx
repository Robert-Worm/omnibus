"use client";
import CompactContextText from './compact-context-text';
import {CollectionBadge} from './collection-choice';
import ReportPointSource, {type ReportSourceEntry} from './report-point-source';
import { useState } from "react";
import {
  Target,
  TriangleAlert,
  ShieldCheck,
  Settings2,
  ListChecks,
  ArrowRight,
  X,
  History,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import type { Draft, Line } from "@/lib/framework-types";
import { controlObjectiveFor } from "@/lib/control-objectives.mjs";
import { organizationalGoalFor } from "@/lib/organizational-goals.mjs";
import { reportDateLabel } from "@/lib/report-display.mjs";
import { setReportPointSelection, pointWording } from "@/lib/report-point-adapter.mjs";
import catalogue from "@/lib/report-point-catalogue.mjs";
import "./control-objective-pilot.css";

export default function ControlObjectivePilot({
  lines,
  draft,
  disabled,
  onChange,
  onBuilder,
  request,
  onClose,
  reportCorpus,
}: {
  lines: Line[];
  draft: Draft;
  disabled: boolean;
  onChange: (d: Draft) => void;
  onBuilder: () => void;
  request?: { id: string; field?: string; pointId?:string };
  onClose?: () => void;
  reportCorpus?: ReportSourceEntry[];
}) {
  const [mode, setMode] = useState<"generic" | "source">("generic");
  const [error, setError] = useState("");
  const [previewWording, setPreviewWording] = useState(false);
  const [sourcePointId,setSourcePointId]=useState(request?.pointId||'');
  const [panel, setPanel] = useState(
    request?.field === "finding"
      ? "history"
      : request?.field === "procedure"
        ? "execution"
        : "points",
  );
  const block = catalogue.blocks.find(
    (b) => b.id === request?.id && lines.some((l) => l.id === b.id),
  );
  const points = catalogue.points.filter((p) => p.legacy_line_id === block?.id);
  const retainedCriterion = points.length === 1 && points[0].detail_level === "CRITERION_RETAINED";
  const report = catalogue.reports.find((r) => r.id === block?.report_id);
  const materials = new Map(
    (draft.investigation?.materials || [])
      .filter((m) => m.sourcePointId)
      .map((m) => [m.sourcePointId, m]),
  );
  const isSelected = (id: string) => {
    const saved = materials.get(id);
    return Boolean(saved && draft.included.includes(saved.id));
  };
  const count = points.filter((p) => isSelected(p.id)).length;
  function select(ids: string[], value: boolean) {
    try {
      onChange(setReportPointSelection(draft, catalogue, ids, value, mode) as Draft);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Selectie kon niet worden bewaard.");
    }
  }
  return (
    <Sheet
      open={Boolean(block)}
      onOpenChange={(value) => {
        if (!value) onClose?.();
      }}
    >
      <SheetContent className="audit-detail bd-pilot-detail" showCloseButton={false} aria-modal="true">
        <SheetHeader className="bd-header">
          <div className="bd-heading-row">
            <div>
              <SheetDescription>{block?.id} · Rapportanalyse</SheetDescription>
              <SheetTitle>{block?.line.title}</SheetTitle>
            </div>
            <SheetClose render={<Button variant="ghost" size="icon" aria-label="Sluiten" />}>
              <X size={20} />
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="bd-panel-nav" aria-label="Rapportanalyse">
          <Button
            variant="ghost"
            aria-pressed={panel === "points"}
            onClick={() => setPanel("points")}
          >
            <ListChecks size={16} />
            Toetspunten
          </Button>
          <Button variant="ghost" aria-pressed={panel==='source'} onClick={()=>{setSourcePointId(sourcePointId||points[0]?.id);setPanel('source');}}>Bronpassage</Button>
          <Button
            variant="ghost"
            aria-pressed={panel === "execution"}
            onClick={() => setPanel("execution")}
          >
            <ClipboardCheck size={16} />
            Toetsaanpak
          </Button>
          <Button variant="ghost" aria-pressed={panel==='history'} onClick={()=>setPanel('history')}><History size={16}/>Historische bevinding</Button>
        </div>
        {block && (
          <div className="bd-pilot-body">
            {error && <p role="alert">{error}</p>}
            {panel==='source'&&sourcePointId?<ReportPointSource key={sourcePointId} pointId={sourcePointId} entry={reportCorpus?.find(c=>c.framework.report.id===block.report_id)} onReturn={()=>setPanel('points')}/>:<div className="bd-workspace">
              <aside className="bd-context" aria-label="Samenhang van risico en beheersing">
                {[
                  {
                    label: "Doel",
                    text: draft.overrides?.[block.id]?.objective ?? organizationalGoalFor(block.line).text,
                    field: "objective",
                    Icon: Target,
                  },
                  {
                    label: "Risico",
                    text: block.line.risk.text,
                    field: "risk",
                    Icon: TriangleAlert,
                  },
                  {
                    label: "Beheersdoelstelling",
                    text: controlObjectiveFor(block.line).text,
                    field: "controlObjective",
                    Icon: ShieldCheck,
                  },
                  {
                    label: "Beheersmaatregel",
                    text: block.line.control.text,
                    field: "control",
                    Icon: Settings2,
                  },
                ].map(({ label, text, field, Icon }) => (
                  <section
                    key={field}
                    className={`bd-context-card bd-${field}${request?.field === field ? " bd-focus" : ""}`}
                  >
                    <div className="bd-card-heading">
                      <Icon size={18} aria-hidden="true" />
                      <h3>{label}</h3>
                      {field === "controlObjective" && <span className="bd-label">Voorstel</span>}
                      {field === "objective" && organizationalGoalFor(block.line).basis === "PROPOSED" && <span className="bd-label">Voorstel</span>}
                    </div>
                    <CompactContextText text={text} label={label} initialExpanded={request?.field===field}/>
                  </section>
                ))}
              </aside>
              {panel === "points" && (
                <section className="bd-testing" aria-label="Norm en toetspunten">
                    <section
                      className={`bd-criterion${request?.field === "criterion" ? " bd-focus" : ""}`}
                    >
                      <div className="bd-card-heading">
                        <ListChecks size={19} aria-hidden="true" />
                        <h3>Norm</h3>
                        <span className="bd-label">Voorstel uit analyse</span>
                      </div>
                      <CollectionBadge kind="report" id={block.report_id}/><p>{block.criterion.text}</p>
                    </section>
                  <div className="bd-points-heading">
                    <div>
                      <h3>Toetspunten</h3>
                      <span className="bd-muted">Kies wat je wilt meenemen.</span>
                    </div>
                    <output className="bd-count">
                      {count} van {points.length} gekozen
                    </output>
                  </div>
                  <div className="bd-point-toolbar">
                    {points.length > 1 && (
                      <label className="bd-select-all" htmlFor="bd-select-all">
                        <Checkbox
                          id="bd-select-all"
                          disabled={disabled}
                          checked={count === points.length}
                          indeterminate={count > 0 && count < points.length}
                          onCheckedChange={() =>
                            select(
                              points.map((p) => p.id),
                              count !== points.length,
                            )
                          }
                        />
                        Alle toetspunten
                      </label>
                    )}
                    {points.some((p) => p.variant_available) && (
                      <fieldset className="bd-mode" aria-label="Voorbeeldformulering van toetspunten">
                        <button
                          type="button"
                          aria-pressed={mode === "generic"}
                          onClick={() => { setMode("generic"); setPreviewWording(true); }}
                        >
                          Generiek
                        </button>
                        <button
                          type="button"
                          aria-pressed={mode === "source"}
                          onClick={() => { setMode("source"); setPreviewWording(true); }}
                        >
                          Broncontext
                        </button>
                      </fieldset>
                    )}
                  </div>
                  {previewWording && points.some((p) => p.variant_available) && (
                    <output className="bd-preview-note" data-status-block="">
                      Voorbeeld · {mode === "generic" ? "generiek" : "broncontext"}. Nieuwe keuzes gebruiken deze formulering; bewaarde keuzes blijven ongewijzigd.
                    </output>
                  )}
                  {(draft.included.includes(block.id) ||
                    Boolean(materials.get(block.id + "/TC-ALL") &&
                      draft.included.includes(materials.get(block.id + "/TC-ALL")!.id))) && (
                    <p className="bd-legacy-note">
                      Eerdere selectie van het volledige item. Bij het aanpassen kiest u voortaan
                      afzonderlijke toetspunten; bestaande vraagkoppelingen worden niet overgezet.
                    </p>
                  )}
                  <div className={`bd-points${retainedCriterion ? " bd-single-criterion" : ""}`}>
                    {points.map((original) => {
                      const saved = materials.get(original.id),
                        chosen = isSelected(original.id);
                      // Preview is independent of saved materials; switching never rewrites them.
                      const preview = previewWording && original.variant_available;
                      const p = pointWording(original, preview ? mode : saved?.wordingMode || mode);
                      const title = saved && !preview ? saved.title : p.title;
                      const text = saved && !preview
                        ? (draft.overrides?.[saved.id]?.criterion ?? saved.body)
                        : p.text;
                      return (
                        <article className={`bd-point${chosen ? " is-chosen" : ""}`} key={p.id} data-point={p.id} data-inspected={request?.pointId===p.id||undefined}>
                          {request?.pointId===p.id&&<small className="viewer-current-point">Bekeken bouwsteen</small>}
                          <div className="bd-point-top">
                            <Checkbox
                              id={`choose-${p.id}`}
                              aria-label={`Kies ${title}`}
                              aria-describedby={`text-${p.id}`}
                              disabled={disabled}
                              checked={chosen}
                              onCheckedChange={(value) => select([p.id], Boolean(value))}
                            />
                            <div className="bd-point-copy">
                              <label htmlFor={`choose-${p.id}`}>
                                <strong>{title}</strong><CollectionBadge kind="report" id={p.report_id}/>
                              </label>
                              <p id={`text-${p.id}`}>{text}</p>
                              <div className="bd-point-meta">
                                <span>{p.id}</span>
                                <Button variant="link" onClick={()=>{setSourcePointId(p.id);setPanel('source');}}>Bronpassage</Button>
                                {original.detail_level === "CRITERION_RETAINED" && (
                                  <span>Norm als geheel · uitsplitsing nog te beoordelen</span>
                                )}
                                {saved && (
                                  <span>
                                    Bewaard ·{" "}
                                    {!original.variant_available
                                      ? "analysevoorstel"
                                      : saved.wordingMode === "source"
                                        ? "broncontext"
                                        : "generiek"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
              {panel === "history" && (
                <section className="bd-evidence-panel bd-single-panel" aria-label="Historische bevinding">
                  <section className="bd-panel-card bd-history-card">
                    <div className="bd-card-heading">
                      <History size={20} />
                      <h3>Historische bevinding</h3>
                    </div>
                    <small>
                      {report?.title}
                    </small>
                    <small className="bd-report-date">
                      {reportDateLabel(report)}
                      {block.line.entity && <> · {block.line.entity}</>}
                    </small>
                    {report?.scope && (
                      <section className="bd-report-context">
                        <h4>Onderzoekscontext</h4>
                        <p>{report.scope}</p>
                      </section>
                    )}

                    {[...new Set([
                      ...block.line.finding.evidence_ids,
                      ...points.flatMap((p) => p.source_links.map((link) => link.evidence_id)),
                    ])].map((id) => {
                      const source = catalogue.sources.find(
                        (s) => s.report_id === block.report_id && s.evidence_ids.includes(id),
                      );
                      return (
                        <section className="bd-quote" key={id}>
                          <h4>
                            {id}
                            {source ? ` · pagina ${source.page}` : ""}
                          </h4>
                          {source ? (
                            <blockquote>{source.quote}</blockquote>
                          ) : (
                            <p>Passage niet in deze weergave beschikbaar.</p>
                          )}
                        </section>
                      );
                    })}
                    <p className="bd-muted">
                      Dit beschrijft het historische onderzoek, niet de huidige situatie.
                    </p>
                  </section>
                </section>
              )}
              {panel === "execution" && (
                <section
                  className="bd-execution-panel"
                  aria-label="Toetsaanpak"
                >
                  {!retainedCriterion && !block.line.practicalRevision && (
                    <section className="bd-panel-card bd-execution-card">
                      <div className="bd-card-heading">
                        <ClipboardCheck size={20} />
                        <h3>Voorgestelde toetsaanpak</h3>
                      </div>
                      <p>{block.line.procedure.text}</p>
                      <small>{block.line.procedure.reason}</small>
                    </section>
                  )}
                  <section aria-label="Uitvoering per toetspunt">
                    <div className="bd-points-heading">
                      <h3>Uitvoering per toetspunt</h3>
                      <Button variant="outline" onClick={() => setPanel("points")}>
                        Kies toetspunten <ArrowRight size={15} />
                      </Button>
                    </div>
                    <div className="bd-execution-grid">
                    {points.map((original) => {
                      const saved = materials.get(original.id),
                        p = pointWording(original, saved?.wordingMode || mode);
                      const savedPhases = saved ? [
                        { key: "opzet", text: saved.testDesign },
                        { key: "bestaan", text: saved.testExistence },
                        { key: "werking", text: saved.testOperation },
                      ].filter((phase) => phase.text?.trim()) : [];
                      const savedProcedure = saved && (draft.overrides?.[saved.id]?.procedure ?? saved.procedure);
                      const structuredSaved = savedPhases.length > 0 && savedProcedure === savedPhases
                        .map((phase) => phase.key.toUpperCase() + "\n" + phase.text).join("\n\n");
                      return (
                        <section className="bd-panel-card bd-execution-point" key={p.id}>
                          <h4>{saved?.title || p.title}</h4>
                          <small>{p.id}</small>
                          {saved && structuredSaved ? savedPhases.map((phase) => (
                            <section className={`bd-phase bd-phase-${phase.key}`} key={phase.key}>
                              <h5>{phase.key}</h5>
                              <p>{phase.text}</p>
                            </section>
                          )) : saved ? (
                            <p style={{ whiteSpace: "pre-wrap" }}>
                              {savedProcedure}
                            </p>
                          ) : (
                            Object.entries(p.phases)
                              .filter(([, v]) => (v as { status: string }).status === "APPLICABLE")
                              .map(([key, value]) => {
                                const v = value as {
                                  procedure: string;
                                  evidence: string;
                                  boundary: string;
                                };
                                return (
                                  <section className={`bd-phase bd-phase-${key}`} key={key}>
                                    <h5>{key}</h5>
                                    <p>{v.procedure}</p>
                                    <p>
                                      <strong>Bewijs:</strong> {v.evidence}
                                    </p>
                                    <p className="bd-muted">{v.boundary}</p>
                                  </section>
                                );
                              })
                          )}
                        </section>
                      );
                    })}
                    </div>
                  </section>
                </section>
              )}
            </div>}
          </div>
        )}
        <footer className="bd-footer">
          <span>Keuzes worden direct bewaard.</span>
          <div>
            <Button
              variant="outline"
              onClick={() => {
                onClose?.();
                onBuilder();
              }}
            >
              Naar stap 3: Bouw je kader <ArrowRight size={15} />
            </Button>
            <SheetClose render={<Button />}>Gereed</SheetClose>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
