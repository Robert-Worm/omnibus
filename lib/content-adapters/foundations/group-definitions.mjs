// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/group-definitions.mjs";
// Editorial navigation descriptions, not additional requirements.
export const cioGroupDescriptions = data.cioGroupDescriptions;

const topicalDescriptions = data.topicalDescriptions;
export function topicalGroup(item) {
  const labels = {
    'TR-CYBER':['Governance: bestuur, beleid en verantwoordelijkheden','Risicomanagement: cyberrisico’s en incidenten beheersen','Beheersprocessen: systemen, gegevens en communicatie beveiligen'],
    'TR-THIRD':['Governance: externe relaties besturen en toezicht houden','Risicomanagement: risico’s van externe partijen beheersen','Beheersprocessen: externe partijen kiezen, volgen en afscheid nemen'],
    'TR-BEHAV':['Governance: richting en verantwoordelijkheid voor gedrag','Risicomanagement: gedragsrisico’s en verbeteringen volgen','Beheersing: gewenst gedrag in het werk ondersteunen'],
    'TR-RESIL':['Governance: richting en verantwoordelijkheid voor weerbaarheid','Risicomanagement: weerbaarheidsrisico’s beoordelen en aanpakken','Beheersing: voorbereiden, herstellen en aanpassen'],
  }[item.sourceId];
  // Topic tags are editorial and can cross official domains; group by source identity.
  const domain = item.id.slice(item.sourceId.length + 1).split("-")[0];
  const index = {GOV:0, GOVERNANCE:0, RM:1, RISICOMANAGEMENT:1, BEH:2, BEHEERSING:2}[domain] ?? -1;
  if (!topicalDescriptions[item.sourceId] || !labels || index < 0) return {};
  return { groupId: `${item.sourceId}-GROUP-${index + 1}`, groupTitle: labels[index],
    groupDescription: topicalDescriptions[item.sourceId][index] };
}
