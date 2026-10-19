import proposals from '../app/organizational-goals.json' with {type:'json'};
import additions from '../app/report-additions.json' with {type:'json'};

export function reviewedControlObjectiveFor(line) {
  const added=additions.control_objectives.find(g=>g.legacy_line_ids.includes(line.id));
  if(added)return added;
  const p = proposals[line.id];
  return p?.control_objective ? {
    text: p.control_objective,
    basis: 'PROPOSED',
    evidence_ids: [...p.evidence_ids],
    reason: 'Voorgestelde beheersuitkomst uit de doelreview. ' + p.control_objective_rationale,
  } : null;
}

// Presentation/reuse proposals never replace the original source record.
// Adopted WB materials and user overrides remain their own saved snapshots.
export function organizationalGoalFor(line) {
  if (line.practicalRevision) return line.objective;
  const added=additions.organizational_goals.find(g=>g.legacy_line_id===line.id);
  if(added)return added;
  const proposal = proposals[line.id];
  if (!proposal || proposal.decision === 'RETAINED') return line.objective;
  return {
    text: proposal.text,
    basis: 'PROPOSED',
    evidence_ids: [...proposal.evidence_ids],
    reason: 'Voorgesteld organisatie-/procesdoel, afgeleid uit de bestaande bronanalyse; geen vastgesteld organisatiedoel. ' + proposal.rationale + ' Oorspronkelijk doel in bronanalyse: ' + line.objective.text,
  };
}
