"use client";
import { useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { Draft, Line, StructureNode, BranchItem, Framework } from "@/lib/framework-types";
import EvidenceLinks from "./evidence-links";
import {
  structureNodes,
  childKinds,
  branchLabels,
  addBranch,
  editBranch,
  removeBranch,
} from "@/lib/framework-branches.mjs";
import { basisLabels, isEdited, updateValue } from "@/lib/framework-model.mjs";
import { sourceElement, sourceRelations } from "@/lib/framework-source-items.mjs";

export default function FrameworkStructure({
  framework,
  line,
  draft,
  disabled,
  onChange,
  onEvidence,
}: {
  framework: Framework;
  line: Line;
  draft: Draft;
  disabled: boolean;
  onChange: (draft: Draft) => void;
  onEvidence: (id: string) => void;
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [undo, setUndo] = useState<BranchItem | null>(null);
  const [error, setError] = useState("");
  const nodes = structureNodes(line, draft) as StructureNode[];
  const root = nodes[0];
  const kinds: Record<string, string> = childKinds;
  const names: Record<string, string> = branchLabels;
  const plural: Record<string, string> = {
    risk: "risico’s",
    control: "maatregelen",
    auditQuestion: "auditvragen",
    procedure: "toetsingen",
  };
  const provenance: Record<string, string> = basisLabels;
  function change(text: string, node: StructureNode) {
    onChange(
      (node.isBase
        ? updateValue(draft, line, node.id, text)
        : editBranch(draft, line.id, node.id, text)) as Draft,
    );
  }
  function add(parentId: string) {
    try {
      const result = addBranch(draft, line.id, parentId, line);
      onChange(result.draft as Draft);
      setOpenIds((ids) => [...new Set([...ids, parentId, result.node.id])]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toevoegen niet gelukt.");
    }
  }
  function remove(node: StructureNode) {
    try {
      onChange(removeBranch(draft, line.id, node.id) as Draft);
      setUndo({
        id: node.id,
        kind: node.kind as BranchItem["kind"],
        parent_id: node.parent_id!,
        text: node.text,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verwijderen niet gelukt.");
    }
  }
  function restore() {
    if (!undo) return;
    try {
      const result = addBranch(draft, line.id, undo.parent_id, line);
      onChange(editBranch(result.draft, line.id, result.node.id, undo.text) as Draft);
      setOpenIds((ids) => [...new Set([...ids, undo.parent_id, result.node.id])]);
      setUndo(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Herstel niet gelukt.");
    }
  }
  function nodeView(node: StructureNode) {
    const children = nodes.filter((n) => n.parent_id === node.id);
    const source = node.isBase ? sourceElement(line, node.id) : undefined;
    const changed = node.isBase && isEdited(line, node.id, draft);
    const basis = source && !changed ? source.basis : "USER_PROPOSAL";
    const relation = node.isBase
      ? sourceRelations(line).find((r) => r.from === node.parent_id && r.to === node.id)
      : undefined;
    const relationChanged =
      relation && (isEdited(line, relation.from, draft) || isEdited(line, relation.to, draft));
    const childKind = kinds[node.kind];
    return (
      <Collapsible
        key={node.id}
        className={"branch-node " + node.kind}
        open={openIds.includes(node.id)}
        onOpenChange={(open) =>
          setOpenIds((ids) =>
            open ? [...new Set([...ids, node.id])] : ids.filter((id) => id !== node.id),
          )
        }
      >
        <CollapsibleTrigger render={<Button variant="ghost" className="branch-trigger" />}>
          <ChevronRight aria-hidden="true" className="branch-chevron" />
          <span className="branch-summary">
            <span className="branch-name">
              {names[node.kind]} <span className={"basis-tag " + basis}>{provenance[basis]}</span>
            </span>
            <span className="branch-preview">{node.text || "Nog in te vullen"}</span>
            <span className="branch-count">
              {childKind
                ? `${children.length} ${children.length === 1 ? names[childKind].toLowerCase() : plural[childKind]}`
                : "Onderzoeksstap"}
            </span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="branch-content">
          <label htmlFor={`${line.id}-branch-${node.id}`}>{names[node.kind]} bewerken</label>
          <Textarea
            id={`${line.id}-branch-${node.id}`}
            value={node.text}
            disabled={disabled}
            maxLength={10000}
            onChange={(e) => change(e.target.value, node)}
          />
          {source ? (
            <div className="branch-provenance">
              <details className="field-explanation">
                <summary>Waarom dit onderdeel?</summary>
                <p>{source.reason}</p>
              </details>
              <EvidenceLinks
                framework={framework}
                ids={source.evidence_ids}
                onEvidence={onEvidence}
              />
              {relation && (
                <p>
                  <strong>
                    Koppeling:{" "}
                    {relationChanged
                      ? "herbeoordelen na uw aanpassing"
                      : provenance[relation.basis]}
                    .
                  </strong>{" "}
                  {relation.relation} {relation.reason}
                </p>
              )}
            </div>
          ) : (
            <p className="branch-provenance">
              Eigen voorstel en voorgestelde koppeling aan het bovenliggende onderdeel. Geen directe
              brononderbouwing of vastgestelde werking. Normen en verantwoordelijkheden van de
              basislijn zijn niet automatisch van toepassing.
            </p>
          )}
          {children.length > 0 && <div className="branch-children">{children.map(nodeView)}</div>}
          <div className="branch-actions">
            {childKind && (
              <Button variant="outline" disabled={disabled} onClick={() => add(node.id)}>
                <Plus size={16} />
                {names[childKind]} toevoegen
              </Button>
            )}
            {!node.isBase && (
              <Button
                variant="ghost"
                disabled={disabled || children.length > 0}
                title={children.length ? "Verwijder eerst de onderliggende onderdelen" : undefined}
                onClick={() => remove(node)}
              >
                <Trash2 size={15} />
                Verwijderen
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  return (
    <section className="structure-view" aria-label="Vertakte auditstructuur">
      <p className="edit-note">
        Oorspronkelijke vertakkingen en eerdere eigen aanvullingen blijven hier behouden.
        De afzonderlijke beheersdoelstelling staat tussen risico en maatregel bij Basisvelden.
        Bestaande relaties zijn niet automatisch omgezet naar nieuwe doelstellingen.
      </p>
      <div className="structure-goal">
        <label htmlFor={`${line.id}-structure-goal`}>Doel</label>
        <span
          className={
            "basis-tag " +
            (isEdited(line, "objective", draft) ? "USER_PROPOSAL" : line.objective.basis)
          }
        >
          {provenance[isEdited(line, "objective", draft) ? "USER_PROPOSAL" : line.objective.basis]}
        </span>
        <Textarea
          id={`${line.id}-structure-goal`}
          value={root.text}
          disabled={disabled}
          maxLength={10000}
          onChange={(e) => change(e.target.value, root)}
        />
      </div>
      <div className="goal-risks">
        {nodes.filter((n) => n.parent_id === "objective").map(nodeView)}
      </div>
      <Button variant="outline" disabled={disabled} onClick={() => add("objective")}>
        <Plus size={16} />
        Risico toevoegen aan dit doel
      </Button>
      {undo && (
        <div className="branch-undo">
          <span>Extra onderdeel verwijderd.</span>
          <Button variant="link" disabled={disabled} onClick={restore}>
            Ongedaan maken
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="branch-error">
          {error}
        </p>
      )}
    </section>
  );
}
