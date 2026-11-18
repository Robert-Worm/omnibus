// DORA per onderwerp (B-068). De eerste familie onder het regime "kiezen per onderwerp" (lib/family-topics.mjs).
// Dit bestand bevat alleen wat van DORA is: de acht onderwerpen, de bronnen, de bronnen zonder onderwerp en de teksten van
// de opties. De indeling per norm staat in dora-onderwerpen-indeling.mjs en is door twee onafhankelijke AI-rollen (jurist
// en IT-auditor) nagekeken. Het is een selectiehulp bovenop de bestaande bronnen: er verandert geen norm of toetspunt.
import {doraOnderwerpIndeling} from './dora-onderwerpen-indeling.mjs';
import {createTopicFamily} from './family-topics.mjs';

const topics = [
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
const sources = [
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
const outside = [
  {id: 'DORA-OVERSIGHT-31-44', reason: 'gaat over het toezicht van autoriteiten op kritieke ICT-dienstverleners'},
  {id: 'DORA-2024-1502', reason: 'gaat over het aanwijzen van kritieke ICT-dienstverleners door de toezichthouders'},
  {id: 'DORA-OVERSIGHT-295', reason: 'gaat over informatie die kritieke dienstverleners aan de toezichthouder geven'},
  {id: 'DORA-OVERSIGHT-FEES-1505', reason: 'gaat over toezichtvergoedingen'},
  {id: 'DORA-JOINT-TEAMS-420', reason: 'gaat over gezamenlijke onderzoeksteams van toezichthouders'},
  {id: 'DORA-COOPERATION-GL36', reason: 'gaat over samenwerking tussen toezichthouders'},
  {id: 'DORA-SECTOR-2022-2556', reason: 'wijzigt sectorrichtlijnen en richt zich tot lidstaten'},
];

export const doraTopicFamily = createTopicFamily({
  id: 'dora', listFamily: 'DORA', category: 'financial', tone: 'dora', topics, sources, outside, index: doraOnderwerpIndeling,
  labels: {
    lawNoun: ['wet of regeling', 'wetten en regelingen'], law: 'de wet',
    regime: {label: 'Vereenvoudigd kader (art. 16)', short: 'vereenvoudigd kader',
      title: 'Voor de kleine instellingen uit artikel 16 van DORA. Vervangt de normen van het volledige kader (artikelen 5 tot en met 15).'},
    related: {label: 'Ook verwante normen', title: 'Normen die bij een ander onderwerp horen maar ook over dit onderwerp gaan.'},
    sector: {label: 'Ook sectorspecifieke normen', title: 'Normen voor één soort instelling, zoals een centrale tegenpartij, effectenbewaarinstelling of handelsplatform.'},
    practice: {label: 'NOREA in plaats van de wet', name: 'NOREA', full: 'NOREA DORA in Control (praktijkkader)',
      title: 'NOREA DORA in Control beschrijft dezelfde eisen als beheersmaatregelen. Het is een praktijkkader, geen wet. Beide kiezen geeft dubbele toetspunten.',
      toPractice: 'NOREA beschrijft dezelfde eisen als beheersmaatregelen', toLaw: 'De wet stelt dezelfde eisen als NOREA beschrijft'},
    // De bron noemt haar groepen "Gewoon raamwerk · …" en "Vereenvoudigd raamwerk · …". Eén zin zegt wat dat is.
    groupNotes: [
      {pattern: /^Gewoon raamwerk\b/u, text: 'Volledig ICT-risicobeheerkader: geldt voor instellingen die onder de artikelen 5 tot en met 15 van DORA vallen.'},
      {pattern: /^Vereenvoudigd raamwerk\b/u, text: 'Vereenvoudigd ICT-risicobeheerkader: geldt alleen voor de kleine instellingen uit artikel 16, lid 1, van DORA, in plaats van het volledige kader.'}],
  },
});
