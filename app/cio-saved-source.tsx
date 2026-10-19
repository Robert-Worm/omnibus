"use client";

import { useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import CriterionSourceLayout from "./criterion-source-layout";
import CioEditorialHistory,{type CioEditorialEdition} from './cio-editorial-history';
import {
  cioPages,
  cioStatus,
  cioRoleLabels,
  cioContributionLabels,
  cioKindLabels,
} from "@/lib/cio-law-data.mjs";
import "./cio-law-workspace.css";

type Actor = { label: string; role: string; condition?: string | null };
type Span = { page: number; start: number; end: number; quote: string };
type SavedRecord = {
  id: string;
  locator: string;
  title: string;
  source_status: string;
  normative_kind: string;
  assertion?: string;
  source_spans: Span[];
  actors?: Actor[];
  conditions?: string[];
  exceptions?: string[];
  cross_references?: string[];
  interpretation_notes?: string[];
};
type SourceLink = {
  record_id: string;
  supported_clause: string;
  contribution: string;
  explanation: string;
  derivation: string;
  unresolved_interpretation?: string;
};
type Issue = { id: string; status: string; description: string; resolution: string };
type SavedTrace = {
  source: {
    source_id?: string;
    title?: string;
    official_publication?: string;
    edition?: string;
    published_on?: string;
    effective_from?: string;
    verified_on?: string;
    official_pdf_byte_verification?: { sha256?: string };
    current_consolidation_verification?: { display_note?: string };
    external_dependencies?: string;
  };
  reviewBasis?: string;
  editorial?: CioEditorialEdition;
  point: {
    id: string;
    title: string;
    text: string;
    basis?: string;
    normative_kind?: string;
    addressees?: Actor[];
    scope?: string;
    conditions?: string[];
    exceptions?: string[];
    selection_status?: string;
    selection_reason?: string;
    split_rationale?: string;
    source_links: SourceLink[];
    interpretation_resolution?: { reason?: string };
    source_interpretation_notes?: string[];
  };
  criterion?: {
    id?: string;
    title?: string;
    text?: string;
    composition_rationale?: string;
    applicability?: string;
  };
  records: SavedRecord[];
  issues?: Issue[];
};
export type CioSavedReference = {
  cioTrace?: string;
  sourceText?: string;
  sourceContext?: string;
  title?: string;
};
const roles = cioRoleLabels as Record<string, string>;
const contributions = cioContributionLabels as Record<string, string>;
const kinds = cioKindLabels as Record<string, string>;
const derivations: Record<string, string> = {
  DIRECT: "Rechtstreeks",
  PARAPHRASE: "Parafrase",
  SYNTHESIS: "Synthese",
};
const bases: Record<string, string> = {
  SOURCE_PARAPHRASE: "Bronparafrase",
  ANALYST_SYNTHESIS: "Analytische synthese",
  AUDIT_OPERATIONALIZATION: "Toetsuitwerking",
  ANALYST_PROPOSAL: "Analytisch voorstel",
};
const currentPages = cioPages as { page: number; text: string }[];

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseSnapshot(value: string | undefined): SavedTrace | null {
  if (!value) return null;
  try {
    const trace: unknown = JSON.parse(value);
    if (
      !object(trace) ||
      !object(trace.source) ||
      !object(trace.point) ||
      !Array.isArray(trace.records) ||
      !Array.isArray(trace.point.source_links)
    )
      return null;
    if (![trace.point.id, trace.point.title, trace.point.text].every((v) => typeof v === "string"))
      return null;
    if (
      !trace.point.source_links.every(
        (l) =>
          object(l) &&
          [l.record_id, l.supported_clause, l.contribution, l.explanation, l.derivation].every(
            (v) => typeof v === "string",
          ),
      )
    )
      return null;
    if (
      !trace.records.every(
        (r) =>
          object(r) &&
          [r.id, r.locator, r.title, r.source_status, r.normative_kind].every(
            (v) => typeof v === "string",
          ) &&
          Array.isArray(r.source_spans) &&
          r.source_spans.every(
            (s) =>
              object(s) &&
              Number.isInteger(s.page) &&
              Number(s.page) > 0 &&
              Number.isInteger(s.start) &&
              Number(s.start) >= 0 &&
              Number.isInteger(s.end) &&
              Number(s.end) >= Number(s.start) &&
              typeof s.quote === "string",
          ),
      )
    )
      return null;
    return trace as unknown as SavedTrace;
  } catch {
    return null;
  }
}
function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
function savedText(value: unknown) {
  return typeof value === "string" ? value : "";
}
function TextList({ title, values }: { title: string; values: unknown }) {
  const items = texts(values);
  return items.length ? (
    <section className="cio-text-list">
      <h5>{title}</h5>
      <ul>
        {items.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </section>
  ) : null;
}
function Actors({ actors }: { actors: unknown }) {
  const list = Array.isArray(actors)
    ? actors.filter(
        (a): a is Actor => object(a) && typeof a.label === "string" && typeof a.role === "string",
      )
    : [];
  return (
    <section className="cio-actors">
      <h5>Voor wie — bewaarde actorrollen</h5>
      {list.length ? (
        <dl>
          {list.map((a, i) => (
            <div key={i}>
              <dt>{a.label}</dt>
              <dd>
                {roles[a.role] || a.role}
                {savedText(a.condition) && <p>{savedText(a.condition)}</p>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>
          Geen actor in deze momentopname benoemd. Er is geen actor uit de huidige catalogus
          ingevuld.
        </p>
      )}
    </section>
  );
}
function SavedSpan({ span, samePublication }: { span: Span; samePublication: boolean }) {
  const page = samePublication ? currentPages.find((p) => p.page === span.page) : undefined;
  const chars = page ? Array.from(page.text) : [];
  const exact = Boolean(
    page && span.end <= chars.length && chars.slice(span.start, span.end).join("") === span.quote,
  );
  return (
    <section className="cio-span">
      <small>
        Pagina {span.page} · tekens {span.start}–{span.end} (Unicode-codepoints)
      </small>
      <blockquote>{span.quote}</blockquote>
      {exact ? (
        <details className="cio-page">
          <summary>Volledige overeenkomende bronpagina {span.page}</summary>
          <p className="cio-muted">
            De publicatiehash is gelijk en deze passage komt exact overeen. Alleen de paginaweergave
            komt uit het lokale bronpakket; de normtekst en herleiding hierboven blijven de
            opgeslagen versie.
          </p>
          <pre>
            {chars.slice(0, span.start).join("")}
            <mark>{span.quote}</mark>
            {chars.slice(span.end).join("")}
          </pre>
        </details>
      ) : (
        <small>
          Alleen het opgeslagen exacte citaat:{" "}
          {samePublication
            ? "voor deze passage is geen exact overeenkomend lokaal pagina-anker beschikbaar."
            : "de bronidentiteit is niet via een gelijke publicatiehash bevestigd."}
        </small>
      )}
    </section>
  );
}
function RecordBody({
  record,
  samePublication,
}: {
  record: SavedRecord;
  samePublication: boolean;
}) {
  return (
    <div className="cio-source-record">
      <div className="cio-meta">
        <span>
          {record.source_status === "DIRECT_SOURCE"
            ? "Hoofdtekst / directe bron"
            : record.source_status === "EXPLANATORY_CONTEXT"
              ? "Toelichting — geen zelfstandige nieuwe plicht"
              : record.source_status}
        </span>
        <span>{kinds[record.normative_kind] || record.normative_kind}</span>
      </div>
      <h4>
        {record.locator} · {record.title}
      </h4>
      {record.source_spans.map((span, i) => (
        <SavedSpan key={i} span={span} samePublication={samePublication} />
      ))}
      <details>
        <summary>Bewaarde broncontext en kwalificaties</summary>
        {savedText(record.assertion) && (
          <p>
            <strong>Bronparafrase:</strong> {savedText(record.assertion)}
          </p>
        )}
        <Actors actors={record.actors} />
        <TextList title="Voorwaarden" values={record.conditions} />
        <TextList title="Uitzonderingen" values={record.exceptions} />
        <TextList title="Kruisverwijzingen" values={record.cross_references} />
        <TextList title="Interpretatienotities" values={record.interpretation_notes} />
      </details>
    </div>
  );
}

export default function CioSavedSource({
  material,
  criterion,
}: {
  material: CioSavedReference;
  criterion?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"criterion" | "source">("source");
  const trace = parseSnapshot(material.cioTrace);
  const hash = trace?.source.official_pdf_byte_verification?.sha256;
  const samePublication =
    typeof hash === "string" &&
    /^[a-f\d]{64}$/i.test(hash) &&
    hash === cioStatus.official_pdf_byte_verification.sha256;
  const recordMap = new Map(trace?.records.map((r) => [r.id, r]) || []);
  const linked = new Set(trace?.point.source_links.map((l) => l.record_id) || []);
  const additional = trace?.records.filter((r) => !linked.has(r.id)) || [];
  const limits = Array.isArray(trace?.issues)
    ? trace.issues.filter((i) => object(i) && i.status === "ACCEPTED_SOURCE_LIMIT")
    : [];
  const sourceContent = trace ? (
    <div>
      <p className="cio-eyebrow">
        Opgeslagen bronmomentopname · {savedText(trace.source.official_publication)}
      </p>
      <h3>{savedText(trace.source.title)}</h3>
      <p className="cio-muted">
        {savedText(trace.source.edition)} · controlepeildatum{" "}
        {savedText(trace.source.verified_on) || "niet opgeslagen"}
      </p>
      <section className="cio-notice">
        <p>
          {savedText(trace.source.current_consolidation_verification?.display_note) ||
            "De voor de auditperiode geldende versie en toepasselijkheid moeten afzonderlijk worden vastgesteld."}
        </p>
        <p>{savedText(trace.source.external_dependencies)}</p>
        <small>
          AI-review is geen menselijke juridische of professionele auditgoedkeuring. De opgeslagen
          bron- en interpretatieteksten worden niet door de huidige catalogus vervangen.
        </small>
      </section>
      <section>
        <h4>Bewaard toetspunt · {trace.point.id}</h4>
        <p>{trace.point.text}</p>
        <div className="cio-meta">
          <span>
            {kinds[trace.point.normative_kind || ""] || savedText(trace.point.normative_kind)}
          </span>
          <span>{bases[trace.point.basis || ""] || savedText(trace.point.basis)}</span>
        </div>
        <Actors actors={trace.point.addressees} />
        <p>{savedText(trace.point.scope)}</p>
        <TextList title="Voorwaarden van het punt" values={trace.point.conditions} />
        <TextList title="Uitzonderingen van het punt" values={trace.point.exceptions} />
        {savedText(trace.point.selection_reason) && (
          <p>
            <strong>Selectiegrens:</strong> {savedText(trace.point.selection_reason)}
          </p>
        )}
        {savedText(trace.point.interpretation_resolution?.reason) && (
          <p>
            <strong>Interpretatiebegrenzing:</strong>{" "}
            {savedText(trace.point.interpretation_resolution?.reason)}
          </p>
        )}
        <TextList
          title="Bewaarde interpretatienotities"
          values={trace.point.source_interpretation_notes}
        />
      </section>
      {trace.criterion && (
        <details>
          <summary>Bewaard oudercriterium en samenstelling</summary>
          <h4>{savedText(trace.criterion.title)}</h4>
          <p>{savedText(trace.criterion.text)}</p>
          <p>{savedText(trace.criterion.composition_rationale)}</p>
          <p>{savedText(trace.criterion.applicability)}</p>
          <p>{savedText(trace.point.split_rationale)}</p>
        </details>
      )}
      <CioEditorialHistory edition={trace.editorial}/>
      {limits.length > 0 && (
        <section className="cio-notice">
          <h4>Geaccepteerde bronbeperkingen — niet opgelost verklaard</h4>
          <div className="cio-limit-list">
            {limits.map((i, n) => (
              <section key={`${i.id}-${n}`}>
                <h5>{savedText(i.id)}</h5>
                <p>{savedText(i.description)}</p>
                <p>
                  <strong>Begrenzing:</strong> {savedText(i.resolution)}
                </p>
              </section>
            ))}
          </div>
        </section>
      )}
      {trace.point.source_links.map((link, i) => {
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
            {savedText(link.unresolved_interpretation) && (
              <p className="cio-notice">{savedText(link.unresolved_interpretation)}</p>
            )}
            {record ? (
              <RecordBody record={record} samePublication={samePublication} />
            ) : (
              <p role="alert">
                Deze gekoppelde bron ontbreekt in de opgeslagen momentopname. Er is geen huidige
                bron voor in de plaats gezet.
              </p>
            )}
          </section>
        );
      })}
      {additional.length > 0 && (
        <details>
          <summary>
            Overige bewaarde bronnen voor doel, beheersdoelstelling en norm (
            {additional.length})
          </summary>
          <p className="cio-muted">
            Aanvullende groepscontext. Deze bronlijst maakt niet iedere passage tot grondslag van
            ieder tekstdeel van het punt.
          </p>
          {additional.map((record) => (
            <RecordBody key={record.id} record={record} samePublication={samePublication} />
          ))}
        </details>
      )}
      <details>
        <summary>Versiegegevens van de momentopname</summary>
        <p>
          Bronidentiteit: {savedText(trace.source.source_id)}
          <br />
          Publicatiehash: {savedText(hash) || "ontbreekt"}
          <br />
          Reviewbasis: {savedText(trace.reviewBasis) || "niet opgeslagen"}
        </p>
        <p>
          {samePublication
            ? "De opgeslagen en lokale publicatiehash zijn gelijk. Markering wordt per passage aanvullend op exacte tekstgelijkheid gecontroleerd."
            : "Geen gelijke publicatiehash. Lokale volledige pagina’s en markeringen zijn daarom niet gebruikt."}
        </p>
      </details>
    </div>
  ) : (
    <div>
      <p role="alert" className="cio-notice">
        De CIO-bronmomentopname ontbreekt of is niet volledig leesbaar. De huidige catalogus wordt
        niet als vervanging gebruikt.
      </p>
      {material.sourceText && (
        <>
          <h4>Overige opgeslagen brontekst — ongewijzigd</h4>
          <blockquote className="source-original-text" style={{ whiteSpace: "pre-wrap" }}>
            {material.sourceText}
          </blockquote>
        </>
      )}
      {material.sourceContext && <p>{material.sourceContext}</p>}
      {material.cioTrace && (
        <details>
          <summary>Ongewijzigde opgeslagen bronmetadata</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {material.cioTrace}
          </pre>
        </details>
      )}
    </div>
  );
  return (
    <section
      className="source-control-reference cio-workspace"
      style={{ padding: 0, maxWidth: "none" }}
      aria-label="Opgeslagen CIO-bron en herleiding"
    >
      <details onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          <BookOpen size={16} aria-hidden="true" style={{ display: "inline", marginRight: 6 }} />
          Vergelijk met bron
        </summary>
        {open &&
          (criterion ? (
            <CriterionSourceLayout
              criterion={criterion}
              source={sourceContent}
              active={tab}
              onActive={setTab}
            />
          ) : (
            sourceContent
          ))}
      </details>
    </section>
  );
}
