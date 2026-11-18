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

// Volgorde = volgorde op de onderwerppagina. `laag`: wet (bindende regels en richtsnoeren) of praktijk (NOREA).
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

/** Eén filter als tekst, zodat het in de opgeslagen weergave van een viewer past: "T5", "T5|5c" of "T5|5c|gewoon". */
export const encodeDoraFilter = ({topic, sub = '', regime = ''}) => [topic, sub, regime].join('|').replace(/\|+$/u, '');
export function decodeDoraFilter(value) {
  const [topic = '', sub = '', regime = ''] = String(value || '').split('|');
  return doraTopics.some(t => t.id === topic) ? {topic, sub, regime} : null;
}
const regimeFits = (entry, regime) => !regime || !entry.regime || entry.regime === regime;
/** Hoort de norm als hoofdonderwerp bij dit filter? "Raakt ook" telt hier niet mee. */
export function doraFilterMatches(normId, value) {
  const filter = decodeDoraFilter(value), entry = byNorm.get(normId);
  if (!filter) return true;
  return Boolean(entry) && entry.main === filter.topic && (!filter.sub || entry.sub === filter.sub) && regimeFits(entry, filter.regime);
}
/** Leesbare naam van een filter, ook als het een raamwerk noemt: "Melden · gewoon raamwerk". */
export function doraFilterLabel(value) {
  const filter = decodeDoraFilter(value);
  if (!filter) return '';
  return doraTopicTitle(filter.topic, filter.sub) + (filter.regime ? ` · ${filter.regime} raamwerk` : '');
}
/** De onderwerpen die in één bron voorkomen, voor het filter in de viewer. */
export function doraSourceFilterOptions(sourceId) {
  if (!sourceIds.has(sourceId)) return [];
  const mine = entries.filter(entry => entry.sourceId === sourceId), options = [];
  for (const topic of doraTopics) {
    const count = mine.filter(entry => entry.main === topic.id).length;
    if (!count) continue;
    options.push({value: topic.id, label: `${topic.title} (${count})`});
    for (const sub of topic.subs ?? []) {
      const subCount = mine.filter(entry => entry.main === topic.id && entry.sub === sub.id).length;
      if (subCount) options.push({value: encodeDoraFilter({topic: topic.id, sub: sub.id}), label: `– ${sub.title} (${subCount})`});
    }
  }
  return options;
}

/** De normen van een onderwerp, per bron. `kern` = hoofdonderwerp; `raakt` = normen met dit onderwerp als nevenonderwerp.
 * `vereenvoudigd`: het vereenvoudigde raamwerk (artikel 16) in plaats van het gewone. `sector`: normen voor één soort
 * entiteit tellen altijd mee en zijn apart geteld, zodat de pagina ze kan noemen. */
export function doraTopicSelection(topicId, {sub = '', norea = false, vereenvoudigd = false, raaktOok = false} = {}) {
  const regime = vereenvoudigd ? 'vereenvoudigd' : 'gewoon';
  return doraTopicSources.filter(source => norea || source.laag === 'wet').map(source => {
    const own = entries.filter(entry => entry.sourceId === source.id), split = own.some(entry => entry.regime);
    const mine = own.filter(entry => regimeFits(entry, regime));
    const kern = mine.filter(entry => entry.main === topicId && (!sub || entry.sub === sub));
    const raakt = sub ? [] : mine.filter(entry => entry.also.includes(topicId));
    const chosen = raaktOok ? [...kern, ...raakt] : kern;
    return {...source, kern: kern.map(e => e.id), raakt: raakt.map(e => e.id), normIds: chosen.map(e => e.id),
      sector: chosen.filter(e => e.sector).length, filter: encodeDoraFilter({topic: topicId, sub, regime: split ? regime : ''})};
  }).filter(row => row.kern.length || row.raakt.length);
}
/** Tellingen voor de onderwerptegels: normen in de wetslaag onder het gewone raamwerk, en in NOREA. */
export function doraTopicCounts(topicId) {
  const rows = doraTopicSelection(topicId, {norea: true});
  const count = laag => rows.filter(row => row.laag === laag).reduce((sum, row) => sum + row.kern.length, 0);
  return {wet: count('wet'), praktijk: count('praktijk'), bronnen: rows.filter(row => row.laag === 'wet' && row.kern.length).length};
}
export const doraUnassigned = entries.filter(entry => entry.main === 'buiten').map(entry => entry.id);

// Eén openstaand filter per bron: de onderwerppagina zet het, de viewer neemt het bij openen over.
const pending = new Map();
export const requestDoraViewerFilter = (sourceId, value) => { pending.set(sourceId, value); };
export const takeDoraViewerFilter = sourceId => { const value = pending.get(sourceId); pending.delete(sourceId); return value; };

// Lijst van bronnen: het vervolgfilter "Onderwerp" bij Familie: DORA. De naam begint met het nummer, zodat de keuzelijst
// de volgorde van de onderwerpen houdt.
const topicLabel = topic => `${doraTopics.indexOf(topic) + 1}. ${topic.title}`;
/** De onderwerpen waarvoor deze bron normen heeft (hoofdonderwerp), als namen voor het lijstfilter. */
export const doraSourceTopicLabels = sourceId => doraTopics.filter(topic => entries.some(entry => entry.sourceId === sourceId && entry.main === topic.id)).map(topicLabel);
export const doraTopicFromLabel = label => doraTopics.find(topic => topicLabel(topic) === label)?.id ?? '';
/** De normen van één bron met dit hoofdonderwerp (elk raamwerk): wat het lijstfilter en het viewerfilter "Onderwerp" tonen. */
export const doraTopicNormIds = (sourceId, topicId) => entries.filter(entry => entry.sourceId === sourceId && entry.main === topicId).map(entry => entry.id);
