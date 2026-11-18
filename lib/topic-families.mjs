// De families met een indeling in onderwerpen (B-073). Een nieuwe familie komt hier bij; lijst, viewer en tegels vragen
// alleen aan dit bestand welke familie bij een bron, een keuze of een lijstfilter hoort.
import {doraTopicFamily} from './dora-onderwerpen.mjs';

export const topicFamilies = [doraTopicFamily];
/** De familie die een bron indeelt, of null. */
export const topicFamilyOfSource = sourceId => topicFamilies.find(family => family.isSource(sourceId)) ?? null;
/** De familie waartoe een keuze hoort. Een keuze zonder voorvoegsel (eerdere versie) hoort bij de eerste familie die haar kent. */
export const topicFamilyOfChoice = value => (value ? topicFamilies.find(family => family.owns(value)) ?? null : null);
/** De familie waarvoor het lijstfilter Onderwerp verschijnt bij deze filters (Familie, of de categorie van de familie). */
export const topicFamilyOfFilters = (filters, categoryTitle = () => '') => topicFamilies.find(family =>
  filters.family === family.listFamily || (family.category && filters.category === categoryTitle(family.category))) ?? null;

// Eén openstaand filter per bron: de lijst of de onderwerpweergave zet het, de viewer neemt het bij openen over.
const pending = new Map();
export const requestViewerTopic = (sourceId, value) => { pending.set(sourceId, value); };
export const takeViewerTopic = sourceId => { const value = pending.get(sourceId); pending.delete(sourceId); return value; };
// De viewer onthoudt het laatst gekozen onderwerp, zodat de lijst het bij terugkeren overneemt ('' = gewist).
let listTopic;
export const rememberListTopic = (value, family) => { listTopic = {value, family: family?.id ?? ''}; };
export const takeListTopic = () => { const taken = listTopic; listTopic = undefined; return taken; };
