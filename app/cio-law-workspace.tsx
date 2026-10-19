"use client";
import {countLabel} from '@/lib/display-count.mjs';

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  ListChecks,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Draft } from "@/lib/framework-types";
import {
  cioCatalogue,
  cioSourceBank,
  cioPages,
  cioIssues,
  cioStatus,
  cioPoints,
  cioSelection,
  chooseCioPoints,
  cioGoalFor,
} from "@/lib/cio-law-adapter.mjs";
import "./cio-law-workspace.css";

type Actor = { label: string; role: string; condition?: string | null };
type Phase = {
  status: string;
  action?: string;
  expected_evidence?: string;
  interpretation_boundary?: string;
  reason: string;
};
type Link = {
  record_id: string;
  supported_clause: string;
  contribution: string;
  explanation: string;
  derivation: string;
  unresolved_interpretation?: string;
};
export type Point = {
  id: string;
  criterion_id: string;
  title: string;
  text: string;
  basis: string;
  objective_ids: string[];
  addressees: Actor[];
  normative_kind: string;
  scope: string;
  conditions: string[];
  exceptions: string[];
  interpretation_status: string;
  interpretation_resolution?: { status: string; reason: string };
  selection_status: string;
  selection_reason: string;
  source_links: Link[];
  phase_plans: { opzet: Phase; bestaan: Phase; werking: Phase };
  split_rationale: string;
  chapter: string;
  source_cross_references: string[];
  source_interpretation_notes: string[];
};
export type Criterion = {
  id: string;
  title: string;
  text: string;
  basis: string;
  objective_ids: string[];
  composition_rationale: string;
  source_record_ids: string[];
  chapter: string;
  applicability: string;
  child_selection: string;
  additional_context_reason?: string;
};
export type Objective = {
  id: string;
  title: string;
  text: string;
  basis: string;
  rationale: string;
  risk: string | null;
  risk_basis: string | null;
  source_record_ids: string[];
};
type Span = { page: number; start: number; end: number; quote: string };
export type RecordEntry = {
  id: string;
  locator: string;
  title: string;
  normative_kind: string;
  source_status: string;
  source_spans: Span[];
  assertion: string;
  actors: Actor[];
  conditions: string[];
  exceptions: string[];
  cross_references: string[];
  interpretation_notes: string[];
};
export type Issue = {
  id: string;
  affected_ids: string[];
  status: string;
  description: string;
  resolution: string;
};
const catalogue = cioCatalogue as unknown as { objectives: Objective[]; criteria: Criterion[] };
const points = cioPoints as unknown as Point[];
const records = (cioSourceBank as unknown as { records: RecordEntry[] }).records;
const pages = cioPages as unknown as { page: number; text: string }[];
const limits = (cioIssues as unknown as { issues: Issue[] }).issues.filter(
  (i) => i.status === "ACCEPTED_SOURCE_LIMIT",
);
const source = cioStatus as unknown as {
  title: string;
  official_publication: string;
  official_url: string;
  official_pdf_url: string;
  published_on: string;
  effective_from: string;
  verified_on: string;
  edition: string;
  jurisdiction: string;
  lineage: string;
  external_dependencies: string;
  current_consolidation_verification: { display_note: string };
};
const recordMap = new Map(records.map((r) => [r.id, r]));
const kinds: Record<string, string> = {
  DUTY: "Verplichting",
  PROHIBITION: "Verbod",
  POWER: "Bevoegdheid",
  PERMISSION: "Toegestane keuze",
  DEFINITION: "Definitie",
  SCOPE: "Reikwijdte",
  EXCEPTION: "Uitzondering",
  COMMENCEMENT: "Inwerkingtreding",
  EXPLANATION: "Toelichting",
  OTHER: "Overige broninhoud",
};
const roles: Record<string, string> = {
  NORM_ADDRESSEE: "Normadressaat / bevoegdheidshouder",
  TASK_BEARER: "Taakdrager",
  BENEFICIARY: "Ontvanger / begunstigde",
  OTHER: "Overige betrokkene",
};
const bases: Record<string, string> = {
  ANALYST_PROPOSAL: "Analytisch voorstel",
  SOURCE_PARAPHRASE: "Bronparafrase",
  ANALYST_SYNTHESIS: "Analytische synthese",
  AUDIT_OPERATIONALIZATION: "Toetsuitwerking",
  DIRECT_SOURCE: "Letterlijke bron",
};
const contributions: Record<string, string> = {
  PRIMARY: "Primaire grondslag",
  DEFINITION: "Definitie",
  SCOPE: "Reikwijdte",
  CONDITION: "Voorwaarde",
  EXCEPTION: "Uitzondering",
  QUALIFICATION: "Kwalificatie",
  EXPLANATION: "Toelichting",
};
const derivations: Record<string, string> = {
  DIRECT: "Rechtstreeks",
  PARAPHRASE: "Parafrase",
  SYNTHESIS: "Synthese",
};
const interpretations: Record<string, string> = {
  SOURCE_CLEAR: "Bronbetekenis duidelijk",
  ANALYST_DERIVED: "Analytisch afgeleid",
  SOURCE_AMBIGUITY: "Bron bevat onduidelijkheid",
  DEPENDENT_ON_EXTERNAL_SOURCE: "Afhankelijk van externe bron",
};
const chapterOptions = [...new Set(points.map((p) => p.chapter))].sort();
const actorOptions = [...new Set(points.flatMap((p) => p.addressees.map((a) => a.label)))].sort(
  (a, b) => a.localeCompare(b, "nl"),
);

function TextList({ title, values }: { title: string; values: string[] }) {
  return values.length ? (
    <section className="cio-text-list">
      <h5>{title}</h5>
      <ul>
        {values.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </section>
  ) : null;
}
export function Actors({ actors }: { actors: Actor[] }) {
  return (
    <section className="cio-actors">
      <h5>Voor wie</h5>
      {actors.length ? (
        <dl>
          {actors.map((a, i) => (
            <div key={i}>
              <dt>{a.label}</dt>
              <dd>
                {roles[a.role] || a.role}
                {a.condition && <p>{a.condition}</p>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Geen actor benoemd in de bron. Er is geen normadressaat bij bedacht.</p>
      )}
    </section>
  );
}
export function LimitList({ items }: { items: Issue[] }) {
  return (
    <div className="cio-limit-list">
      {items.map((i) => (
        <section key={i.id}>
          <h5>Bronbeperking · {i.id}</h5>
          <p>{i.description}</p>
          <p>
            <strong>Begrenzing:</strong> {i.resolution}
          </p>
        </section>
      ))}
    </div>
  );
}
function ExactSpan({ span }: { span: Span }) {
  const page = pages.find((p) => p.page === span.page);
  // Package offsets count Unicode codepoints, not JavaScript UTF-16 code units.
  const chars = page ? Array.from(page.text) : [];
  const exact = page && chars.slice(span.start, span.end).join("") === span.quote;
  return (
    <section className="cio-span">
      <small>
        Pagina {span.page} · tekens {span.start}–{span.end} (Unicode-codepoints)
      </small>
      <blockquote>{span.quote}</blockquote>
      {page && (
        <details className="cio-page">
          <summary>Volledige bronpagina {span.page} tonen</summary>
          {!exact && (
            <p role="alert">
              De markering sluit niet exact aan. Gebruik het letterlijke citaat hierboven; trek geen
              conclusie uit de markering.
            </p>
          )}
          <pre>
            {exact ? (
              <>
                {chars.slice(0, span.start).join("")}
                <mark>{span.quote}</mark>
                {chars.slice(span.end).join("")}
              </>
            ) : (
              page.text
            )}
          </pre>
        </details>
      )}
    </section>
  );
}
export function SourceRecord({ record }: { record: RecordEntry }) {
  return (
    <div className="cio-source-record">
      <div className="cio-meta">
        <span>
          {record.source_status === "EXPLANATORY_CONTEXT"
            ? "Toelichting — geen zelfstandige nieuwe plicht"
            : "Hoofdtekst / directe bron"}
        </span>
        <span>{kinds[record.normative_kind] || record.normative_kind}</span>
      </div>
      <h5>
        {record.locator} · {record.title}
      </h5>
      {record.source_spans.map((s, i) => (
        <ExactSpan key={i} span={s} />
      ))}
      <details>
        <summary>Volledige broncontext en kwalificaties</summary>
        <p>
          <strong>Getrouwe samenvatting:</strong> {record.assertion}
        </p>
        <Actors actors={record.actors} />
        <TextList title="Voorwaarden in de bron" values={record.conditions} />
        <TextList title="Uitzonderingen in de bron" values={record.exceptions} />
        <TextList title="Verwijzingen" values={record.cross_references} />
        <TextList title="Interpretatienotities" values={record.interpretation_notes} />
      </details>
    </div>
  );
}
export function SourceReferences({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Gekoppelde bronpassages ({ids.length})</summary>
      {open &&
        ids.map((id) => {
          const record = recordMap.get(id);
          return record ? (
            <SourceRecord key={id} record={record} />
          ) : (
            <p key={id} role="alert">
              Bron {id} niet beschikbaar.
            </p>
          );
        })}
    </details>
  );
}

export function Approach({ point }: { point: Point }) {
  return (
    <div className="cio-approach">
      <p className="cio-muted">
        Toetsvoorstellen, geen voorgeschreven bewijsformat en geen bewijs dat aan het punt is
        voldaan.
      </p>
      <div className="cio-phase-grid">
        {(["opzet", "bestaan"] as const).map((key) => {
          const p = point.phase_plans[key];
          return (
            <section key={key} className={`cio-phase cio-phase-${key}`}>
              <h4>{key === "opzet" ? "Opzet" : "Bestaan"}</h4>
              <p className="cio-meta">
                {p.status === "APPLICABLE" ? "Toepasselijke onderzoeksfase" : "Niet van toepassing"}
              </p>
              {p.action && (
                <p className="cio-phase-action">
                  <strong>Handeling</strong>
                  <br />
                  {p.action}
                </p>
              )}
              {p.expected_evidence && (
                <p className="cio-phase-evidence">
                  <strong>Verwacht bewijs</strong>
                  <br />
                  {p.expected_evidence}
                </p>
              )}
              {p.interpretation_boundary && (
                <p className="cio-phase-boundary">
                  <strong>Bewijs- en interpretatiegrens</strong>
                  <br />
                  {p.interpretation_boundary}
                </p>
              )}
              <p className="cio-phase-reason">
                <strong>Reden</strong>
                <br />
                {p.reason}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type WorkspaceProps = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  disabled?: boolean;
  navigate: (destination: string) => void;
  initialPointId?: string;
};

export default function CioLawWorkspace(props: WorkspaceProps) {
  // A new search request starts a fresh view without changing the saved selection.
  return <CioLawWorkspaceContent key={props.initialPointId || "catalogue"} {...props} />;
}

function CioLawWorkspaceContent({
  draft,
  onChange,
  disabled = false,
  navigate,
  initialPointId,
}: WorkspaceProps) {
  const initial = points.find((p) => p.id === initialPointId);
  const [objectiveId, setObjectiveId] = useState(
    initial?.objective_ids[0] || catalogue.objectives[0]?.id || "",
  );
  const [chapter, setChapter] = useState("");
  const [actor, setActor] = useState("");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(initial?.id || "");
  const [panel, setPanel] = useState<"points" | "source" | "approach">("points");
  const [error, setError] = useState("");
  const objective = catalogue.objectives.find((o) => o.id === objectiveId);
  const goal = objective ? cioGoalFor(objective.id) : null;
  const selection = cioSelection(draft);
  const selected = new Set<string>(selection.selectedIds);
  const q = query.trim().toLocaleLowerCase("nl");
  const visible = points.filter((p) => {
    const criterion = catalogue.criteria.find((c) => c.id === p.criterion_id);
    return (
      (!objectiveId || p.objective_ids.includes(objectiveId)) &&
      (!chapter || p.chapter === chapter) &&
      (!actor || p.addressees.some((a) => a.label === actor)) &&
      (!q ||
        [
          p.id,
          p.title,
          p.text,
          p.chapter,
          p.scope,
          ...p.conditions,
          ...p.exceptions,
          ...p.addressees.map((a) => a.label),
          criterion?.title,
          criterion?.text,
          ...p.source_links.map((l) => recordMap.get(l.record_id)?.locator),
        ]
          .join(" ")
          .toLocaleLowerCase("nl")
          .includes(q))
    );
  });
  const criteria = catalogue.criteria.filter((c) => visible.some((p) => p.criterion_id === c.id));
  const eligible = visible.filter((p) => p.selection_status === "SELECTABLE");
  const visibleSelection = cioSelection(
    draft,
    eligible.map((p) => p.id),
  );
  const active = visible.find((p) => p.id === activeId) || visible[0];
  function choose(ids: string[], include: boolean) {
    if (disabled) return;
    try {
      onChange(chooseCioPoints(draft, ids, include) as Draft);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "De selectie kon niet worden bewaard.");
    }
  }
  function openPoint(id: string, tab: "points" | "source" | "approach" = "points") {
    setActiveId(id);
    setPanel(tab);
  }
  return (
    <section className="cio-workspace" aria-label="CIO-stelsel 2026">
      <header className="cio-header">
        <div>
          <p className="cio-eyebrow">Wetten en kaders · {source.official_publication}</p>
          <h1>{source.title}</h1>
          <p>
            14 beheersdoelstellingen · 72 normen · 148 selecteerbare punten · 2 punten op HOLD
          </p>
        </div>
        <Button onClick={() => navigate("framework")} variant="outline">
          Onderzoeksopzet <ArrowRight size={16} />
        </Button>
      </header>
      <section className="cio-notice" aria-label="Bronstatus">
        <p>{source.current_consolidation_verification.display_note}</p>
        <small>
          Onafhankelijke AI-reviews; geen menselijke juridische of professionele auditgoedkeuring.
          Selectie bevestigt geen toepasselijkheid of naleving.
        </small>
        <details>
          <summary>Uitgave, externe afhankelijkheden en {limits.length} bronbeperkingen</summary>
          <dl className="cio-source-meta">
            <div>
              <dt>Publicatie / ingang / controle</dt>
              <dd>
                {source.published_on} / {source.effective_from} / {source.verified_on}
              </dd>
            </div>
            <div>
              <dt>Uitgave en reikwijdte</dt>
              <dd>
                {source.edition}
                <br />
                {source.jurisdiction}
              </dd>
            </div>
          </dl>
          <p>{source.lineage}</p>
          <p>{source.external_dependencies}</p>
          <p>
            <a href={source.official_url} target="_blank" rel="noreferrer">
              Officiële publicatie
            </a>{" "}
            ·{" "}
            <a href={source.official_pdf_url} target="_blank" rel="noreferrer">
              Officiële PDF (online)
            </a>
          </p>
          <LimitList items={limits} />
        </details>
      </section>
      <div className="cio-filters">
        <label>
          <span>Zoeken</span>
          <div className="cio-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Punt, norm, actor of artikel"
            />
          </div>
        </label>
        <label>
          <span>Oorspronkelijk hoofdstuk</span>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">Alle hoofdstukken</option>
            {chapterOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Voor wie — alle actorrollen</span>
          <select value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">Alle actoren</option>
            {actorOptions.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          onClick={() => {
            setObjectiveId("");
            setChapter("");
            setActor("");
            setQuery("");
          }}
        >
          Filters wissen
        </Button>
      </div>
      {error && (
        <p role="alert" className="cio-error">
          {error}
        </p>
      )}
      <div className="cio-layout">
        <aside className="cio-groups" aria-label="Groeperen op beheersdoelstelling">
          <h2>Beheersdoelstellingen</h2>
          <p className="cio-muted">Analytische groepering, geen extra verplichting.</p>
          <button aria-pressed={!objectiveId} onClick={() => setObjectiveId("")}>
            Alle beheersdoelstellingen <span>{points.length}</span>
          </button>
          {catalogue.objectives.map((o) => (
            <button
              key={o.id}
              aria-pressed={objectiveId === o.id}
              onClick={() => setObjectiveId(o.id)}
            >
              {o.title}
              <span>{points.filter((p) => p.objective_ids.includes(o.id)).length}</span>
            </button>
          ))}
        </aside>
        <main className="cio-content">
          {objective && (
            <section className="cio-context">
              <div>
                <h3>
                  Doel{" "}
                  <span className="cio-badge">
                    {goal ? "Analytisch voorstel" : "Niet aangeleverd"}
                  </span>
                </h3>
                <p>
                  {goal?.text ||
                    "Het beoordeelde bronpakket bevat geen afzonderlijk organisatiedoel voor deze groep."}
                </p>
                {goal?.rationale && (
                  <details>
                    <summary>Herleiding van het doel</summary>
                    <p>{goal.rationale}</p>
                    {goal.source_record_ids?.map((id: string) => {
                      const record = recordMap.get(id);
                      return record ? (
                        <SourceRecord key={id} record={record} />
                      ) : (
                        <p key={id}>{id}</p>
                      );
                    })}
                  </details>
                )}
              </div>
              <div>
                <h3>
                  Risico <span className="cio-badge">Analytisch voorstel</span>
                </h3>
                <p>{objective.risk || "Geen afzonderlijk risico aangeleverd."}</p>
              </div>
              <div className="cio-bd">
                <h3>
                  <ShieldCheck size={17} /> Beheersdoelstelling{" "}
                  <span className="cio-badge">{bases[objective.basis] || objective.basis}</span>
                </h3>
                <p>{objective.text}</p>
                <details>
                  <summary>Waarom deze groepering?</summary>
                  <p>{objective.rationale}</p>
                  <SourceReferences ids={objective.source_record_ids} />
                </details>
              </div>
            </section>
          )}
          <div className="cio-results">
            <p aria-live="polite">
              {countLabel(criteria.length,'normen')} · {countLabel(visible.length,'punten')} getoond · {selection.selected}{" "}
              punten in onderzoek
            </p>
            <label className="cio-check">
              <Checkbox
                disabled={disabled || !eligible.length}
                checked={visibleSelection.all}
                indeterminate={visibleSelection.partial}
                onCheckedChange={(v) =>
                  choose(
                    eligible.map((p) => p.id),
                    v === true,
                  )
                }
              />
              <span>Getoonde selecteerbare punten ({eligible.length})</span>
            </label>
          </div>
          {!criteria.length && (
            <p className="cio-empty">
              Geen passende punten. Wis een filter of pas de zoekterm aan.
            </p>
          )}
          {criteria.map((c) => {
            const children = visible.filter((p) => p.criterion_id === c.id);
            const allChildren = points.filter((p) => p.criterion_id === c.id);
            const selectable = children.filter((p) => p.selection_status === "SELECTABLE");
            const state = cioSelection(
              draft,
              selectable.map((p) => p.id),
            );
            const p = children.find((child) => child.id === active?.id);
            const affected = p
              ? new Set([p.id, c.id, ...p.objective_ids, ...p.source_links.map((l) => l.record_id)])
              : new Set<string>();
            const pointLimits = limits.filter((i) => i.affected_ids.some((id) => affected.has(id)));
            return (
              <article className="cio-criterion" key={c.id}>
                <header>
                  <div className="cio-meta">
                    <span>{c.chapter}</span>
                    <span>{bases[c.basis] || c.basis}</span>
                    <span>{c.id}</span>
                  </div>
                  <h2>{c.title}</h2>
                  <p className="cio-criterion-text">{c.text}</p>
                  <details>
                    <summary>Samenstelling en toepasselijkheid van deze norm</summary>
                    <p>{c.composition_rationale}</p>
                    <p>{c.applicability}</p>
                    <p>{c.child_selection}</p>
                    {c.additional_context_reason && <p>{c.additional_context_reason}</p>}
                    <p>
                      Beheersdoelstellingen:{" "}
                      {c.objective_ids
                        .map((id) => catalogue.objectives.find((o) => o.id === id)?.title || id)
                        .join(" · ")}
                    </p>
                    <SourceReferences ids={c.source_record_ids} />
                  </details>
                </header>
                <div className="cio-criterion-selection">
                  <label className="cio-check">
                    <Checkbox
                      disabled={disabled || !selectable.length}
                      checked={state.all}
                      indeterminate={state.partial}
                      onCheckedChange={(v) =>
                        choose(
                          selectable.map((p) => p.id),
                          v === true,
                        )
                      }
                    />
                    <span>
                      {state.partial
                        ? "Gedeeltelijk geselecteerd"
                        : state.all
                          ? "Alle passende punten geselecteerd"
                          : "Selecteer passende punten"}{" "}
                      · {state.selected}/{state.total}
                    </span>
                  </label>
                  {children.length !== allChildren.length && (
                    <small>
                      {children.length} van {allChildren.length} kinderen zichtbaar door filters;
                      selectie geldt alleen getoonde kinderen.
                    </small>
                  )}
                </div>
                <div className="cio-point-list">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className={`cio-point-row${p?.id === child.id ? " is-active" : ""}${child.selection_status !== "SELECTABLE" ? " is-hold" : ""}`}
                    >
                      <Checkbox
                        aria-label={`${child.title} selecteren`}
                        disabled={disabled || child.selection_status !== "SELECTABLE"}
                        checked={selected.has(child.id)}
                        onCheckedChange={(v) => choose([child.id], v === true)}
                      />
                      <button
                        aria-expanded={p?.id === child.id}
                        onClick={() => openPoint(child.id)}
                      >
                        <span>{child.title}</span>
                        <p className="cio-point-text">{child.text}</p>
                        <small>
                          {kinds[child.normative_kind] || child.normative_kind} ·{" "}
                          {child.addressees.map((a) => a.label).join("; ") || "Actor niet benoemd"}
                        </small>
                      </button>
                      {child.selection_status !== "SELECTABLE" && (
                        <span className="cio-hold">HOLD · niet selecteerbaar</span>
                      )}
                    </div>
                  ))}
                </div>
                {p && (
                  <section className="cio-point-detail" aria-label={`Punt ${p.title}`}>
                    <div className="cio-detail-heading">
                      <h3>{p.title}</h3>
                      <small>{p.id}</small>
                    </div>
                    <nav className="cio-tabs" aria-label="Puntweergave">
                      {(
                        [
                          { id: "points", label: "Toetspunt", Icon: ListChecks },
                          { id: "source", label: "Bron en herleiding", Icon: BookOpen },
                          { id: "approach", label: "Toetsaanpak", Icon: ClipboardCheck },
                        ] as const
                      ).map(({ id, label, Icon }) => (
                        <button key={id} aria-pressed={panel === id} onClick={() => setPanel(id)}>
                          <Icon size={16} />
                          {label}
                        </button>
                      ))}
                    </nav>
                    {p.selection_status !== "SELECTABLE" && (
                      <div className="cio-notice cio-hold-notice">
                        <strong>HOLD — geen selectie mogelijk</strong>
                        <p>{p.selection_reason}</p>
                      </div>
                    )}
                    {pointLimits.length > 0 && (
                      <details className="cio-notice" open>
                        <summary>{pointLimits.length} gekoppelde bronbeperking(en)</summary>
                        <LimitList items={pointLimits} />
                      </details>
                    )}
                    {panel === "points" && (
                      <div className="cio-point-body">
                        <div className="cio-meta">
                          <span>{kinds[p.normative_kind] || p.normative_kind}</span>
                          <span>{bases[p.basis] || p.basis}</span>
                          <span>
                            {interpretations[p.interpretation_status] || p.interpretation_status}
                          </span>
                        </div>
                        <Actors actors={p.addressees} />
                        <h5>Reikwijdte</h5>
                        <p>{p.scope}</p>
                        <TextList title="Voorwaarden" values={p.conditions} />
                        <TextList title="Uitzonderingen" values={p.exceptions} />
                        <h5>Waarom één zelfstandig punt?</h5>
                        <p>{p.split_rationale}</p>
                        <p>
                          <strong>Selectiegrens:</strong> {p.selection_reason}
                        </p>
                        {p.interpretation_resolution && (
                          <p>
                            <strong>Interpretatiebegrenzing:</strong>{" "}
                            {p.interpretation_resolution.reason}
                          </p>
                        )}
                        <TextList
                          title="Bronverwijzingen en afhankelijkheden"
                          values={p.source_cross_references}
                        />
                        <TextList
                          title="Interpretatienotities"
                          values={p.source_interpretation_notes}
                        />
                        <p className="cio-muted">
                          Dit punt hoort bij{" "}
                          {p.objective_ids
                            .map((id) => catalogue.objectives.find((o) => o.id === id)?.title || id)
                            .join("; ")}
                          . Meerdere relaties leveren geen dubbele selectie op.
                        </p>
                        <Button variant="outline" onClick={() => setPanel("source")}>
                          Bekijk exacte bron en herleiding <ArrowRight size={16} />
                        </Button>
                      </div>
                    )}
                    {panel === "source" && (
                      <div className="cio-derivation">
                        <p className="cio-muted">
                          Elke relatie verklaart welk tekstdeel de bron draagt. Een definitie,
                          bevoegdheid of toelichting wordt geen afzonderlijke verplichting.
                        </p>
                        {p.source_links.map((link, i) => {
                          const record = recordMap.get(link.record_id);
                          return (
                            <section className="cio-link" key={`${link.record_id}-${i}`}>
                              <div className="cio-meta">
                                <span>{contributions[link.contribution] || link.contribution}</span>
                                <span>{derivations[link.derivation] || link.derivation}</span>
                                <span>{link.record_id}</span>
                              </div>
                              <h4>Ondersteunde clausule</h4>
                              <p>{link.supported_clause}</p>
                              <p>{link.explanation}</p>
                              {link.unresolved_interpretation && (
                                <p className="cio-notice">{link.unresolved_interpretation}</p>
                              )}
                              {record ? (
                                <SourceRecord record={record} />
                              ) : (
                                <p role="alert">
                                  De gekoppelde bron is niet beschikbaar. Geen bronconclusie
                                  mogelijk.
                                </p>
                              )}
                            </section>
                          );
                        })}
                        <Button variant="outline" onClick={() => setPanel("points")}>
                          Terug naar het toetspunt
                        </Button>
                      </div>
                    )}
                    {panel === "approach" && <Approach point={p} />}
                  </section>
                )}
              </article>
            );
          })}
        </main>
      </div>
    </section>
  );
}
