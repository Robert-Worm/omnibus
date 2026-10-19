"use client";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Framework } from "@/lib/framework-types";
import { referenceLabel } from "@/lib/report-reader.mjs";
import { reportForEvidence } from "@/lib/corpus-model.mjs";
import {directEvidence} from '@/lib/evidence-presentation.mjs';
export const EvidenceDisplayContext = createContext(false);
export default function EvidenceLinks({
  framework,
  ids,
  onEvidence,
}: {
  framework: Framework;
  ids: string[];
  onEvidence: (id: string) => void;
}) {
  const showAll = useContext(EvidenceDisplayContext);
  const [open, setOpen] = useState(false);
  const expanded = showAll || open;
  if (!ids.length) return <span className="no-evidence">Geen directe brononderbouwing</span>;
  const entries=directEvidence(framework,ids);
  if (!entries.length) return null;
  return (
    <div className="source-disclosure">
      <Button
        variant="link"
        aria-expanded={expanded}
        onClick={() => setOpen((v) => !v)}
        disabled={showAll}
      >
        Bronnen ({entries.length})
      </Button>
      {expanded && (
        <div className="source-group">
          <p>
            {
              reportForEvidence(
                framework,
                entries[0],
              ).title
            }
          </p>
          <span className="evidence-links">
            {entries.map((e) => {
              const id=e.id;
              return (
                <Button key={id} variant="link" title={e?.quote} onClick={() => onEvidence(id)}>
                  {referenceLabel(framework, id).split(" · ").slice(1).join(" · ")}
                </Button>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
}
