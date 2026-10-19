// Presentation only. Do not rewrite the stored title or its source/export scope.
export function buildingBlockHeading(line) {
  const full = line.title || '';
  if (line.materialKind !== 'model-question') return {title:full, context:''};
  const parts = full.split(' · ');
  if (parts.length < 3 || !['Operationeel','Tactisch / Management','Strategisch / Boardroom'].includes(parts.at(-1)))
    return {title:full, context:''};
  return {title:parts.slice(1,-1).join(' · '),context:[parts[0],parts.at(-1)].join(' · ')};
}

// Navigation hints based only on group names, never a completeness/applicability filter.
const processWords = {
  PR01:/wijzig|release|ontwikkel/iu, PR02:/toegang|autorisatie|identiteit/iu,
  PR03:/persoonsgegeven|verwerk|privacy/iu, PR05:/inkoop|contract|leverancier|aanbeste/iu,
  PR06:/duurzaam|rapportage/iu, PR07:/energie|gebouw|verduurz/iu,
  PR08:/cloud|leverancier|continu|herstel|exit/iu, PR09:/algoritme|kunstmatige|ai\b|model/iu,
};
export function processGroupHints(groups, processId) {
  const pattern=processWords[processId];
  return pattern ? groups.filter(group=>pattern.test(group.title)) : [];
}

// Keep source-specific groups separate even when their displayed titles match.
export function groupBuildingBlocks(lines) {
  const groups = new Map();
  for (const line of lines) {
    const group = line.collectionGroup || {id:'other',title:'Overige bouwstenen',sourceTitle:''};
    if (!groups.has(group.id)) groups.set(group.id,{...group,lines:[]});
    groups.get(group.id).lines.push(line);
  }
  return [...groups.values()];
}
