"use client";
import {countLabel} from '@/lib/display-count.mjs';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { chooseField, fieldIncluded } from "@/lib/research-plan.mjs";
import { Textarea } from "@/components/ui/textarea";
import type { Draft, Line, ElementKey, Framework } from "@/lib/framework-types";
import EvidenceLinks from "./evidence-links";
import { labels, basisLabels, isEdited, draftValue } from "@/lib/framework-model.mjs";
import { sourceFields } from "@/lib/framework-source-items.mjs";
import {sharedControlCriterion,sameDraftControlCriterion} from '@/lib/evidence-presentation.mjs';
export default function FrameworkFields({
  framework,
  line,
  draft,
  readOnly,
  disabled,
  onChange,
  onEdit,
  onEvidence,
}: {
  framework: Framework;
  line: Line;
  draft: Draft;
  readOnly: boolean;
  disabled: boolean;
  onChange?: (draft: Draft) => void;
  onEdit: (id: string, text: string) => void;
  onEvidence: (id: string) => void;
}) {
  const names: Record<string, string> = labels;
  const provenance: Record<string, string> = basisLabels;
  return (
    <div className="chain-grid">
      {(Object.keys(labels) as ElementKey[]).filter(kind=>!(line.sourcePointId && ['finding','owner','auditQuestion'].includes(kind))).map((kind, i) => {
        const fieldSection = <section key={kind} id={`field-${line.id}-${kind}`} className={"chain-cell " + kind}>
          <div className="cell-heading">
            <h3>
              <span>{String(i + 1).padStart(2, "0")} </span>
              {names[kind]}
            </h3>
            {sourceFields(line, kind).length > 1 && (
              <span className="basis-tag">{countLabel(sourceFields(line, kind).length,'onderdelen')}</span>
            )}
          </div>
          {!readOnly && sourceFields(line, kind).length > 1 && (
            <p className="field-choice-note">
              Kies één of meer passende onderdelen. Niet gekozen tekst blijft in de bron
              beschikbaar; controleer de samenhang van uw selectie.
            </p>
          )}
          {sourceFields(line, kind).map((field) => {
            const changed = !readOnly && isEdited(line, field.id, draft);
            const basis = changed ? "USER_PROPOSAL" : field.basis;
            const content = (
              <div
                key={field.id}
                className={
                  "field-part " +
                  (!readOnly && !fieldIncluded(draft, line.id, field.id) ? "field-excluded" : "")
                }
              >
                {!readOnly && onChange && sourceFields(line, kind).length > 1 && (
                  <label className="field-choice" htmlFor={`include-${line.id}-${field.id}`}>
                    <Checkbox
                      id={`include-${line.id}-${field.id}`}
                      checked={fieldIncluded(draft, line.id, field.id)}
                      disabled={
                        disabled ||
                        (fieldIncluded(draft, line.id, field.id) &&
                          sourceFields(line, kind).filter((f) =>
                            fieldIncluded(draft, line.id, f.id),
                          ).length === 1)
                      }
                      onCheckedChange={(v) =>
                        onChange(chooseField(draft, line, kind, field.id, Boolean(v)) as Draft)
                      }
                    />
                    Opnemen in mijn referentiekader
                  </label>
                )}
                <span className={"basis-tag " + basis}>{provenance[basis]}</span>
                {readOnly ? (
                  <p className="readonly-field">{field.text || (kind==='controlObjective'?'Nog niet afzonderlijk beoordeeld.':'—')}</p>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`${line.id}-${field.id}`}>
                      {names[kind]} {field.id}
                    </label>
                    <Textarea
                      id={`${line.id}-${field.id}`}
                      value={draftValue(line, field.id, draft)}
                      disabled={disabled}
                      maxLength={10000}
                      onChange={(e) => onEdit(field.id, e.target.value)}
                    />
                  </>
                )}
                <details className="field-explanation">
                  <summary>Waarom dit onderdeel?</summary>
                  <p className="basis-reason">
                    {changed ? "Onderbouwing van de oorspronkelijke formulering: " : ""}
                    {field.reason}
                  </p>
                </details>
                <div className="cell-footer">
                  <EvidenceLinks
                    framework={framework}
                    ids={field.evidence_ids}
                    onEvidence={onEvidence}
                  />
                  {changed && (
                    <Button variant="link" onClick={() => onEdit(field.id, field.text)}>
                      Oorspronkelijk terugzetten
                    </Button>
                  )}
                </div>
                {changed && (
                  <details>
                    <summary>Oorspronkelijke formulering</summary>
                    <p>{field.text}</p>
                  </details>
                )}
              </div>
            );
            if (kind==='control' && sharedControlCriterion(line)) {
              const same=readOnly || sameDraftControlCriterion(line,draft);
              return <details key={`${line.id}-${field.id}`} className="duplicate-field" open={!same ? true : undefined}>
                <summary>{same ? 'Zelfde tekst als de norm' : 'Afzonderlijke beheersmaatregel'}</summary>
                {same && <p>Hier is geen aparte maatregel uitgewerkt.{!readOnly && ' U kunt hieronder een eigen beheersmaatregel formuleren.'}</p>}
                {content}
              </details>;
            }
            return content;
          })}
        </section>;
        return ['auditQuestion','owner'].includes(kind) ? <details className="field-legacy-context" key={kind}><summary>{names[kind]} · oorspronkelijke context</summary>{fieldSection}</details> : fieldSection;
      })}
    </div>
  );
}
