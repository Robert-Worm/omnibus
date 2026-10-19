// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/wwke-readable-criteria.mjs";
// Editorial formulations, kept separate from the frozen source extraction.
// They restate existing criteria/points; exact quotations, conditions and HOLD
// decisions remain in the reviewed package and in saved source snapshots.
export const wwkeReadableCriteria=data.wwkeReadableCriteria;
export function readableWwkeCriterion(criterion,audience){
 const parts=wwkeReadableCriteria[criterion.id];
 if(!parts)return criterion.text;
 return parts.filter(p=>!audience||!p.audiences||p.audiences.includes(audience)).map(p=>p.text).join('\n\n')||criterion.text;
}
