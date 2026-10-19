// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/cio-execution-review.mjs";
// Explicit editorial decisions, not automatic similarity clustering or a count cap.
// The original criterion texts and testing aspects remain available in each result.
export const cioInitialExecutionMerges = data.cioInitialExecutionMerges;

// Follow-up review: one assignable working-paper section, not merely a shared theme.
// All predecessors are from the 210-point stage and disjoint from the initial merges.
export const cioFollowupExecutionMerges = data.cioFollowupExecutionMerges;

export const cioExecutionMerges = [...cioInitialExecutionMerges,...cioFollowupExecutionMerges];

export function applyCioExecutionReview(previous) {
  const byId = new Map(previous.map(p => [p.id,p]));
  const consumed = new Set();
  const identifiers = new Set(byId.keys());
  const combined = cioExecutionMerges.map(spec => {
    if (identifiers.has(spec.id)) throw Error(`Bestaand CIO-ID hergebruikt: ${spec.id}`);
    identifiers.add(spec.id);
    const parts = spec.from.map(id => {
      if (!byId.has(id) || consumed.has(id)) throw Error(`Ongeldige CIO-uitvoeringscombinatie: ${id}`);
      consumed.add(id);
      return byId.get(id);
    });
    // Keep the complete wording: no semantic truncation, invented requirements or lost exceptions.
    const aspects = key => parts.map((p,i) => `${i+1}. ${p.title}\n${p[key]}`).join("\n\n");
    const union = key => [...new Set(parts.flatMap(p => p[key]))];
    const originalIds = parts.flatMap(p => p.from || [p.id]);
    return {...spec, group:spec.group || parts[0].group,
      body:aspects("body"), risk:aspects("risk"), rationale:aspects("rationale"),
      control:aspects("control"), documents:[...new Set(parts.flatMap(p => p.documents.split(/;\s*/)))].join("; "),
      design:aspects("design"), existence:aspects("existence"), operation:aspects("operation"),
      refs:union("refs"), pages:union("pages").sort((a,b)=>a-b),
      from:[...new Set(parts.flatMap(p => [p.id,...(p.from || [])]))], originalIds,
      reviewDate:"11 september 2026", executionParts:parts,
    };
  });
  return [...previous.filter(p => !consumed.has(p.id)), ...combined];
}
