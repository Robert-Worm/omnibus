// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/control-objectives.mjs";
import reportObjectives from "@/app/report-objectives.json" with {type:'json'};
import additions from "@/app/report-additions.json" with {type:'json'};
import {reviewedControlObjectiveFor} from "@/lib/organizational-goals.mjs";
// Authored proposals, separate from the immutable source extraction. Registry IDs
// identify an outcome, not a shared keyword or an asserted cross-report finding.
export const controlObjectives = data.controlObjectives;
export const objectiveAssignments = data.objectiveAssignments;
export function controlObjectiveFor(line) {
  if (line.controlObjective) return line.controlObjective;
  const reviewed = reviewedControlObjectiveFor(line);
  if (reviewed) return reviewed;
  const objective = controlObjectives[objectiveAssignments[line.id]] || reportObjectives[line.id];
  return {
    text: objective?.text || "",
    basis: objective ? "PROPOSED" : "NOT_ESTABLISHED",
    evidence_ids: objective
      ? [...new Set([...(line.risk?.evidence_ids || []), ...(line.criterion?.evidence_ids || [])])]
      : [],
    reason: objective
      ? objective.reason || "Voorgestelde beheersdoelstelling, afgeleid van risico en criterium. Het oorspronkelijke doel en de beheersmaatregel zijn ongewijzigd; geen vastgestelde algemene verplichting."
      : "Nog geen afzonderlijke beheersdoelstelling beoordeeld. Het bronveld Doel is niet automatisch hernoemd.",
  };
}
export function objectiveGroupFor(line) {
  const added=additions.control_objectives.find(g=>g.legacy_line_ids.includes(line.id));
  if(added)return {id:added.id,title:added.title,text:line.controlObjective?.text??added.text};
  const id = objectiveAssignments[line.id],
    objective = controlObjectives[id];
  if(objective)return { id, title: objective.title, text: line.controlObjective?.text??objective.text };
  const proposal=reportObjectives[line.id];
  return proposal ? {id:proposal.id,title:proposal.title,text:line.controlObjective?.text??(reviewedControlObjectiveFor(line)?.text || proposal.text)} : null;
}

// A substantive edit must not silently remain under a now-inaccurate shared
// objective. Preserve the selection and links; only its presentation changes.
export function objectiveGroupsForDraft(lines, draft) {
  return lines.map(line => {
    const edited=draft.overrides[line.id]?.controlObjective;
    if(!line.collectionGroup?.id.startsWith('control-objective:') || edited===undefined || edited===controlObjectiveFor(line).text)return line;
    return {...line,collectionGroup:{id:'own-control-objective:'+line.id,title:edited.trim() ? 'Eigen beheersdoelstelling · '+edited : 'Beheersdoelstelling nog te bepalen',sourceTitle:'Groepering opnieuw beoordelen'}};
  });
}
