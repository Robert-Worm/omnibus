"use client";
import FoundationSourceReader, { type FoundationReference } from "./lazy-foundation-reader";
import ProvisionStatus, { type ProvisionStatusFields } from "./provision-status";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import CioSavedSource from "./cio-saved-source";
import {WwkeSavedSource} from './wwke-law-browser';
import {TopicalSavedSource} from './topical-law-browser';

type Reference = FoundationReference &
  ProvisionStatusFields & {
    sourceControlId?: string;
    sourceText?: string;
    sourceAssessment?: string;
    sourceMappings?: string;
    sourceMaturity?: string;
    sourceContext?: string;
    sourceLicense?: string;
    sourceChanges?: string;
    sourceMethodology?: string;
    cioTrace?: string;
    lawTrace?: string;
    topicalTrace?: string;
  };

export default function SourceControlReference({
  material,
  showContext = true,
  showStatus = true,
  onRead,
  criterion,
}: {
  material?: Reference;
  showContext?: boolean;
  showStatus?: boolean;
  onRead?: () => void;
  criterion?: ReactNode;
}) {
  if (!material) return null;
  if(material.topicalTrace)return <TopicalSavedSource serialized={material.topicalTrace}/>;
  if(material.lawTrace)return <WwkeSavedSource serialized={material.lawTrace}/>;
  if (
    material.cioTrace ||
    material.foundationId === "CIO2026-REEXTRACT-1" ||
    material.sourceId === "CIO2026-REEXTRACT-1"
  ) {
    return <CioSavedSource material={material} criterion={criterion} />;
  }
  let maturity: string[] = [];
  try {
    const parsed: unknown = JSON.parse(material.sourceMaturity || "[]");
    if (Array.isArray(parsed)) maturity = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    /* Older or incomplete drafts still show their source description. */
  }
  // Reflow PDF column wraps only for display; the stored source text remains exact.
  const readable = (text: string) =>
    text.replace(/\r/g, "").replace(/\n(?!\s*(?:\d+[.)]\s|\n))/g, " ");
  return (
    <section className="source-control-reference" aria-label="Bron en toepassingscontext">
      {onRead ? (
        <Button variant="outline" onClick={onRead}>
          <BookOpen size={16} aria-hidden="true" />
          Vergelijk met bron
        </Button>
      ) : (
        <FoundationSourceReader reference={material} criterion={criterion} />
      )}
      {showContext && material.sourceContext && <p>{material.sourceContext}</p>}
      {showStatus && <ProvisionStatus item={material} />}
      <details>
        <summary>Bron en bewerking · {material.sourceControlId}</summary>
        {material.statusAsOf && <p>Bronpeildatum: {material.statusAsOf}</p>}
        {material.statusNote && <p>{material.statusNote}</p>}
        <p>{material.sourceChanges}</p>
        {material.sourceMethodology && <p>{material.sourceMethodology}</p>}
        {material.sourceText && (
          <>
            <h3>Brontekst · letterlijk</h3>
            <p className="source-original-text">{readable(material.sourceText)}</p>
          </>
        )}
        {material.sourceAssessment && (
          <>
            <h3>Control assessment · origineel</h3>
            <p className="source-original-text">{readable(material.sourceAssessment)}</p>
          </>
        )}
        {material.sourceMappings && <p>Bronverwijzingen: {material.sourceMappings}</p>}
        {!!maturity.length && (
          <>
            <h3>Volwassenheidsniveaus uit de bron</h3>
            <p>Referentie voor maatwerk, geen voorgeschreven minimum of oordeel over werking.</p>
            {maturity.map((value, i) => (
              <details key={i}>
                <summary>Niveau {i + 1}</summary>
                <p className="source-original-text">{readable(value)}</p>
              </details>
            ))}
          </>
        )}
        {material.sourceLicense && <p>{material.sourceLicense}</p>}
      </details>
    </section>
  );
}
