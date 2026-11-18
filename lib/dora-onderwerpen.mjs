// DORA per onderwerp (B-068). Een onderwerp bundelt normen uit de verordening, de uitvoeringsregelingen en de
// richtsnoeren, en toont het praktijkkader NOREA als aparte laag. Het is een selectiehulp bovenop de bestaande
// bronnen: er verandert geen norm, toetspunt of bronpassage. De indeling per norm staat in
// dora-onderwerpen-indeling.mjs en is door twee onafhankelijke AI-rollen (jurist en IT-auditor) nagekeken.
import {doraOnderwerpIndeling} from './dora-onderwerpen-indeling.mjs';

export const doraTopics = [
  {id: 'T1', title: 'Bestuur en ICT-risicobeheer',
    includes: 'Verantwoordelijkheid van het bestuur, strategie, het ICT-risicobeheerkader, risico’s beoordelen, interne audit en evaluatie van het kader.',
    excludes: 'Concrete maatregelen voor beveiliging, beheer of continuïteit; die staan bij hun eigen onderwerp.'},
  {id: 'T2', title: 'ICT-middelen, beheer en wijzigingen',
    includes: 'ICT-systemen en -activa in beeld, levenscyclus, operatie en capaciteit, kwetsbaarheden en patches, wijzigingen, projecten, aanschaf en ontwikkeling.',
    excludes: 'Toegang (onderwerp 3) en beveiliging van netwerk en gegevens (onderwerp 4).'},
  {id: 'T3', title: 'Toegang en identiteit',
    includes: 'Identiteiten, toegangsrechten, authenticatie, bijzondere rechten en fysieke toegang.',
    excludes: 'Netwerkbeveiliging en versleuteling (onderwerp 4).'},
  {id: 'T4', title: 'Beveiliging van gegevens en netwerk',
    includes: 'Beveiligingsbeleid, versleuteling en sleutels, netwerk, gegevens in rust, gebruik en doorvoer, fysieke beveiliging en bewustwording van personeel.',
    excludes: 'Toegang (onderwerp 3) en detectie (onderwerp 5).'},
  {id: 'T5', title: 'Detectie, incidenten en melden',
    includes: 'Afwijkingen detecteren en loggen, incidenten afhandelen, classificeren en ervan leren, en incidenten en dreigingen melden, met formulieren, termijnen en jaarlijkse kosten.',
    excludes: 'Continuïteit en herstel na een verstoring (onderwerp 6).',
    subs: [{id: '5a', title: 'Detecteren en loggen'}, {id: '5b', title: 'Afhandelen, classificeren en leren'}, {id: '5c', title: 'Melden'}]},
  {id: 'T6', title: 'Continuïteit, back-up en herstel',
    includes: 'Continuïteitsbeleid, bedrijfsimpactanalyse, respons- en herstelplannen, back-up en terugzetten, crisiscommunicatie en continuïteitstests.',
    excludes: 'Registratie en melding van incidenten (onderwerp 5).'},
  {id: 'T7', title: 'Weerbaarheid testen en TLPT',
    includes: 'Het testprogramma voor digitale operationele weerbaarheid, testvormen, eisen aan testers en dreigingsgestuurde penetratietests.',
    excludes: 'Continuïteitstests (onderwerp 6) en testen bij wijzigingen (onderwerp 2).'},
  {id: 'T8', title: 'ICT-dienstverleners en uitbesteding',
    includes: 'Beleid voor derden, vooronderzoek, contracteisen, informatieregister, concentratierisico, onderaanneming, monitoring en exit.',
    excludes: 'Het toezicht van autoriteiten op kritieke dienstverleners; die bronnen staan in de bronnenlijst.'},
];

// Vaste volgorde van de bronnen. `laag`: wet (bindende regels en richtsnoeren) of praktijk (NOREA).
export const doraTopicSources = [
  {id: 'DORA-2022-2554', soort: 'Verordening', laag: 'wet'},
  {id: 'DORA-2024-1774', soort: 'Gedelegeerde verordening (RTS)', laag: 'wet'},
  {id: 'DORA-2024-1772', soort: 'Gedelegeerde verordening (RTS)', laag: 'wet'},
  {id: 'DORA-2025-301', soort: 'Gedelegeerde verordening (RTS)', laag: 'wet'},
  {id: 'DORA-2025-302', soort: 'Uitvoeringsverordening (ITS)', laag: 'wet'},
  {id: 'DORA-INCIDENT-COSTS-GL34', soort: 'Richtsnoeren', laag: 'wet'},
  {id: 'DORA-2025-1190', soort: 'Gedelegeerde verordening (RTS)', laag: 'wet'},
  {id: 'DORA-2024-1773', soort: 'Gedelegeerde verordening (RTS)', laag: 'wet'},
  {id: 'DORA-2024-2956', soort: 'Uitvoeringsverordening (ITS)', laag: 'wet'},
  {id: 'DORA-2025-532', soort: 'Gedelegeerde verordening (RTS)', laag: 'wet'},
  {id: 'NOREA-DORA-3-2', soort: 'Praktijkkader, geen wettelijke norm', laag: 'praktijk'},
];
// DORA-bronnen die niet in de onderwerpen zitten, met de reden. Ze blijven via de bronnenlijst te kiezen.
export const doraOutsideSources = [
  {id: 'DORA-OVERSIGHT-31-44', reason: 'gaat over het toezicht van autoriteiten op kritieke ICT-dienstverleners'},
  {id: 'DORA-2024-1502', reason: 'gaat over het aanwijzen van kritieke ICT-dienstverleners door de toezichthouders'},
  {id: 'DORA-OVERSIGHT-295', reason: 'gaat over informatie die kritieke dienstverleners aan de toezichthouder geven'},
  {id: 'DORA-OVERSIGHT-FEES-1505', reason: 'gaat over toezichtvergoedingen'},
  {id: 'DORA-JOINT-TEAMS-420', reason: 'gaat over gezamenlijke onderzoeksteams van toezichthouders'},
  {id: 'DORA-COOPERATION-GL36', reason: 'gaat over samenwerking tussen toezichthouders'},
  {id: 'DORA-SECTOR-2022-2556', reason: 'wijzigt sectorrichtlijnen en richt zich tot lidstaten'},
];
export const doraTopicReview = doraOnderwerpIndeling.review;

const entries = Object.entries(doraOnderwerpIndeling.norms).map(([id, [sourceId, main, sub, also, regime, sector]]) => ({id, sourceId, main, sub, also, regime, sector}));
const byNorm = new Map(entries.map(entry => [entry.id, entry]));
const sourceIds = new Set(doraTopicSources.map(source => source.id));

export const isDoraTopicSource = id => sourceIds.has(id);
export const doraNormTopic = normId => byNorm.get(normId) ?? null;
export const doraTopicTitle = (topicId, sub) => {
  const topic = doraTopics.find(t => t.id === topicId);
  return topic ? (sub ? topic.subs?.find(s => s.id === sub)?.title ?? topic.title : topic.title) : '';
};

// Een keuze is: één onderwerp, eventueel een deelonderwerp, het ICT-risicobeheerkader (volledig, artikelen 5–15, of
// vereenvoudigd, artikel 16) en of verwante normen meetellen. Dezelfde keuze, als korte tekst, is het filter in de lijst
// van bronnen én in de viewer van een bron. Daardoor tellen en kiezen lijst en viewer altijd hetzelfde.
//   "T5"  "T5|5c"  "T5||v" (vereenvoudigd kader)  "T5|||r" (met verwante normen)
export const encodeDoraChoice = ({topic, sub = '', regime = 'volledig', related = false}) =>
  [topic, sub, regime === 'vereenvoudigd' ? 'v' : '', related ? 'r' : ''].join('|').replace(/\|+$/u, '');
export function decodeDoraChoice(value) {
  const [topic = '', sub = '', regime = '', related = ''] = String(value || '').split('|');
  const found = doraTopics.find(t => t.id === topic);
  if (!found) return null;
  return {topic, sub: found.subs?.some(s => s.id === sub) ? sub : '', regime: regime === 'v' ? 'vereenvoudigd' : 'volledig', related: related === 'r'};
}
// In de indeling heet het volledige kader 'gewoon'. Normen zonder kader gelden onder beide.
const regimeFits = (entry, regime) => !entry.regime || entry.regime === (regime === 'vereenvoudigd' ? 'vereenvoudigd' : 'gewoon');
const inChoice = (entry, choice) => regimeFits(entry, choice.regime) && (
  (entry.main === choice.topic && (!choice.sub || entry.sub === choice.sub)) ||
  (choice.related && !choice.sub && entry.also.includes(choice.topic)));
const asChoice = value => (typeof value === 'string' ? decodeDoraChoice(value) : value);

/** De normen van één bron die bij de keuze horen. */
export function doraChoiceNormIds(sourceId, value) {
  const choice = asChoice(value);
  return choice ? entries.filter(entry => entry.sourceId === sourceId && inChoice(entry, choice)).map(entry => entry.id) : [];
}
/** Hoort deze norm bij de keuze? Zonder geldige keuze hoort alles erbij (geen filter). */
export function doraChoiceMatches(normId, value) {
  const choice = asChoice(value), entry = byNorm.get(normId);
  return choice ? Boolean(entry) && inChoice(entry, choice) : true;
}
/** Naam van de keuze: "Melden", met het kader en verwante normen erbij als die afwijken van de standaard. */
export function doraChoiceLabel(value) {
  const choice = asChoice(value);
  if (!choice) return '';
  return doraTopicTitle(choice.topic, choice.sub) + (choice.regime === 'vereenvoudigd' ? ' · vereenvoudigd kader' : '') + (choice.related ? ' · met verwante normen' : '');
}
/** De bronnen met normen voor de keuze, in vaste volgorde. `laag`: wet of praktijk (NOREA). */
export function doraChoiceSources(value) {
  const choice = asChoice(value);
  if (!choice) return [];
  return doraTopicSources.map(source => ({...source, normIds: doraChoiceNormIds(source.id, choice)})).filter(source => source.normIds.length);
}
/** Normen en bronnen in de wetslaag voor de keuze. NOREA telt apart: het is een praktijkkader. */
export function doraChoiceCounts(value) {
  const sources = doraChoiceSources(value), wet = sources.filter(source => source.laag === 'wet');
  return {normen: wet.reduce((sum, source) => sum + source.normIds.length, 0), bronnen: wet.length,
    praktijk: sources.filter(source => source.laag === 'praktijk').reduce((sum, source) => sum + source.normIds.length, 0)};
}
/** Heeft deze bron normen die alleen onder het volledige of alleen onder het vereenvoudigde kader gelden? */
export const doraSourceHasRegimes = sourceId => entries.some(entry => entry.sourceId === sourceId && entry.regime);
/** Zijn er verwante normen voor dit onderwerp (normen met een ander hoofdonderwerp die dit onderwerp ook raken)? */
export const doraTopicHasRelated = topicId => entries.some(entry => entry.also.includes(topicId));
/** De onderwerpen die in één bron voorkomen, voor het filter in de viewer. */
export function doraSourceFilterOptions(sourceId) {
  if (!sourceIds.has(sourceId)) return [];
  const options = [];
  for (const topic of doraTopics) {
    const all = entries.filter(entry => entry.sourceId === sourceId && entry.main === topic.id);
    if (!all.length) continue;
    options.push({value: topic.id, label: topic.title});
    for (const sub of topic.subs ?? []) {
      const value = encodeDoraChoice({topic: topic.id, sub: sub.id}), count = doraChoiceNormIds(sourceId, value).length;
      if (count) options.push({value, label: `– ${sub.title}`});
    }
  }
  return options;
}
/** De onderwerpen waarvoor deze bron normen heeft (als hoofdonderwerp), onder welk kader dan ook. */
export const doraSourceTopicIds = sourceId => doraTopics.filter(topic => entries.some(entry => entry.sourceId === sourceId && entry.main === topic.id)).map(topic => topic.id);
export const doraUnassigned = entries.filter(entry => entry.main === 'buiten').map(entry => entry.id);

// Eén openstaand filter per bron: de lijst zet het, de viewer neemt het bij openen over.
const pending = new Map();
export const requestDoraViewerFilter = (sourceId, value) => { pending.set(sourceId, value); };
export const takeDoraViewerFilter = sourceId => { const value = pending.get(sourceId); pending.delete(sourceId); return value; };

// De bron noemt haar groepen "Gewoon raamwerk · …" en "Vereenvoudigd raamwerk · …". Eén zin zegt wat dat is en waar het staat.
/** Toelichting bij een groep van een DORA-bron, of '' als de groepsnaam geen kader noemt. */
export function doraGroupNote(title) {
  if (/^Gewoon raamwerk\b/u.test(title)) return 'Volledig ICT-risicobeheerkader: geldt voor instellingen die onder de artikelen 5 tot en met 15 van DORA vallen.';
  if (/^Vereenvoudigd raamwerk\b/u.test(title)) return 'Vereenvoudigd ICT-risicobeheerkader: geldt alleen voor de kleine instellingen uit artikel 16, lid 1, van DORA, in plaats van het volledige kader.';
  return '';
}
