// Count distinct norms, not their repeated appearances under different roles.
export function lawViewCounts(rows) {
 return {groups:new Set(rows.map(r=>r.groupId)).size,norms:new Set(rows.map(r=>r.criterionId)).size};
}
export function lawCountText(rows) {
 const {groups,norms}=lawViewCounts(rows);
 return `${groups} ${groups===1?'groep':'groepen'} · ${norms} ${norms===1?'norm':'normen'}`;
}
