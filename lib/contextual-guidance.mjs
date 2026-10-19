import {researchOf, questionLineIds, unassignedIds} from './research-plan.mjs';
import {collectionStart} from './collection-start.mjs';

// UI guidance only: no changes to project data, applicability or question wording.
export const GUIDE_SEEN_KEY = 'omnibus-wegwijzer-intro-seen';
export function claimGuideIntroduction(storage) {
  try {
    if (!storage || storage.getItem(GUIDE_SEEN_KEY)) return false;
    storage.setItem(GUIDE_SEEN_KEY, '1');
    return true;
  } catch { return false; } // Optional preference for the hint on manual opening.
}

const pages = {
  entry:['Kies je vertrekpunt','Begin bij een opdracht of verken eerst risico’s vanuit je organisatie. Beide routes gebruiken hetzelfde kader; wisselen wist niets.'],
  'risk-start':['Verken je onderwerp','Begin vanuit signalen bij een thema, proces, wet, kader of model. Open passende inhoud om doelen, risico’s, normen of modelbegrippen te bekijken. Kies wat past; historische risico’s zijn geen actuele vaststellingen over jouw organisatie.'],
  'model-workspace':['Werk met je geopende modellen','Wissel tussen modellen zonder je bewerkingen te verliezen. Kies passende vragen door ze aan te vinken: ze staan direct klaar in Bouw je kader. Een model sluiten verwijdert geen vragen of bewerkingen.'],
  'report-themes':['Oorspronkelijke rapportuitwerkingen','Hier blijven de oorspronkelijke indelingen en vraagvoorstellen beschikbaar. De bredere thema- en procesweergave combineert inhoud uit meerdere bronnen.'],
  start: ['Begin bij de opdrachtgever', 'Kies de onderzoeksrichting die past bij het inzicht dat de opdrachtgever nodig heeft. Omnibus gebruikt deze richting voor de vraagvoorstellen.'],
  foundations: ['Vind een passende bron', 'Verken wetten en kaders via de categorieën of het zoekveld. Open een bron in de viewer om gericht te kiezen, of gebruik ‘Selecteer alle normen’ waar deze knop beschikbaar is. Zoeken en openen selecteren niets.'],
  'foundation-workspace': ['Beoordeel wat je nodig hebt', 'Verken de groepen en normen. Open een norm om toetspunten, bronpassages en toetsaanpak te bekijken. Controleer de verplichting, onderbouwing en eventuele uitzonderingen voordat je selecteert.'],
  models: ['Verken met een model', 'Bekijk welke begrippen en indicatoren het model helpt onderzoeken. Voeg passende interviewvragen toe aan je kader, of maak een losse modelleidraad bij Exporteer. Modelvragen zijn geen wettelijke toetsnormen.'],
  catalogue: ['Verken thema’s en processen', 'Gebruik thema’s om bijbehorende bouwstenen en rapporten te vinden. Kies wat bij je opdracht past; je hoeft niet alle verzamelroutes te doorlopen.'],
  processes: ['Begin bij het proces', 'Zoek het proces dat je wilt onderzoeken en bekijk de bijbehorende bouwstenen. Combineer die zo nodig met wetten, kaders of modelvragen.'],
  topics: ['Kies binnen je open thema’s', 'Bekijk bouwstenen en hun herkomst. Een bevinding uit een ander onderzoek is niet vanzelf een norm voor jouw organisatie.'],
  reports: ['Lees de achterliggende rapporten', 'Rapporten geven context en voorbeelden. Controleer of de situatie uit het rapport vergelijkbaar is met jouw onderzoek.'],
  reader: ['Controleer de onderbouwing', 'Lees ook de context rond een aangehaalde passage. Beoordeel of deze de gekozen bouwsteen ondersteunt en of je de informatie voor jouw opdracht kunt gebruiken.'],
  framework: ['Verbind je vragen en bouwstenen', 'Gebruik een vraagvoorstel of schrijf zelf een centrale vraag. Deelvragen zijn optioneel. Je kunt losse bouwstenen of hele groepen slepen, of de koppelknoppen gebruiken.'],
  export: ['Controleer je werkdocument', 'Kies de werkvorm die bij je opdracht past: normtoetsing, een risico-controlmatrix of een interviewleidraad. Bekijk de inhoud en bronverantwoording voordat je downloadt.'],
};
const step = (id, title, text, label, page, target, reason) => ({id, title, text, label, page, target, reason});
const pageLabels = {entry:'Onderzoeksroute','risk-start':'Verken je onderwerp','report-themes':'Rapportuitwerkingen',start:'Onderzoeksrichting', foundations:'Wetten & kaders', 'foundation-workspace':'Open wetten & kaders',
  models:'Modellen', 'model-workspace':'Open modellen', catalogue:'Thema’s & processen', processes:'Processen', topics:'Open thema’s & processen',
  reports:'Rapporten', reader:'Bron lezen', framework:'Bouw je kader', export:'Exporteer'};

export function contextualGuidance({page = 'start', draft = {included: []}, ready = true,
  pendingQuestion = false, storageBlocked = false, exportStatus = null, hasModel = false, hasOpenModel = false} = {}) {
  const [title, explanation] = pages[page] || pages.start;
  const result = next => ({title, explanation, next, pageLabel: pageLabels[page] || 'Start'});
  if (!ready) return result(null);
  if (pendingQuestion && page === 'framework') return result(step('pending', 'Je vraag is nog niet vastgelegd',
    'Controleer de formulering en bevestig je vraagopzet met de knop onderaan het formulier.',
    'Verder met deze vraag', 'framework', 'central-question-input', 'Een ingevuld voorstel is nog geen opgeslagen onderzoeksvraag.'));
  if (storageBlocked) return result(step('storage', 'Bewaar je werk ook als projectbestand',
    'Browseropslag is nu niet beschikbaar. Bekijk de opslaginformatie en gebruik ‘Bewaar project’ voor een heropenbaar bestand.',
    'Bekijk opslaginformatie', 'storage'));
  if(page==='entry')return result(null);
  if(page==='risk-start')return result(step('choose','Verken je onderwerp','Begin bij een thema of proces, of verken een wet, kader of model. Open passende inhoud om toetspunten of interviewvragen te kiezen. Onderzoeksvragen werk je daarna uit.','Bekijk de inhoud','risk-start'));
  if(page==='model-workspace'&&!hasOpenModel)return result(step('open-model','Open een model om vragen te kiezen','Verken eerst een model dat bij je onderwerp past. Openen kiest nog geen vragen; je selecteert ze zelf in de viewer.','Verken modellen','models'));
  const {questions} = researchOf(draft);
  const roots = questions.filter(q => q.parent_id === null);
  const selected = draft.included?.length || 0;
  if (page === 'start') {
    const goal = draft.investigation?.goal || {};
    if (!goal.direction || !goal.subject?.trim() || !goal.intendedUse?.trim()) return result(step('goal',
      'Wat heeft je opdrachtgever nodig?', 'Beschrijf welk inzicht de opdrachtgever nodig heeft en waarvoor die de uitkomst wil gebruiken. Kies de onderzoeksrichting die daarbij past.',
      'Doelstelling bekijken', 'start', 'workflow-page-title', 'Een doel helpt straks beoordelen of een vraag en de gekozen bouwstenen bij de opdracht passen.'));
    const landing=collectionStart(goal.direction);
    return result(step('collect', 'Verken passende bronnen', `${landing.reason} Andere bronsoorten blijven beschikbaar.`, 'Naar '+landing.label, 'collect'));
  }
  if (page === 'export') {
    if (!exportStatus) return result(null);
    if (exportStatus.missing) return result(step('export-input', exportStatus.missing.label,
      'Deze informatie is nodig om je gekozen werkdocument te maken.', 'Ga naar deze instelling', 'export', exportStatus.missing.id));
    if (exportStatus.validation) return result(step('export-check', 'Controleer de exportinstellingen', exportStatus.validation,
      'Bekijk de exportcontrole', 'export', 'guide-export-check'));
    return result(step('export-review', 'Controleer je werkdocument',
      'Bekijk of de vragen, bouwstenen en bronnen bij je opdracht passen. Je blijft zelf beoordelen of het kader voldoende is.',
      'Bekijk het exportvoorbeeld', 'export', 'guide-export-preview', 'Een technisch exporteerbaar bestand zegt niet dat het onderzoek inhoudelijk volledig of juist is.'));
  }
  if (page === 'framework') {
    if (!roots.length) return result(step('question', 'Begin met een centrale vraag',
      'Kies een voorstel of schrijf je eigen vraag. Controleer of die de opdrachtgever het benodigde inzicht kan geven.',
      'Naar de onderzoeksvragen', 'framework', 'guide-research-builder'));
    if (!selected) return result(step('empty', 'Verzamel passende bouwstenen',
      'Je hebt onderzoeksvragen toegevoegd. Kies normen of modelvragen die helpen om ze te beantwoorden.',
      'Verken wetten en kaders', 'foundations'));
    if (questions.some(q => !q.text.trim())) return result(step('wording', 'Werk je lege vraag uit',
      'Geef de vraag een duidelijke formulering of verwijder haar via Vraagopties als je haar niet nodig hebt.',
      'Bekijk de onderzoeksvragen', 'framework', 'guide-research-builder'));
    const unlinked = questions.filter(q => !questionLineIds(draft, q.id, q.parent_id === null).length);
    if (unlinked.length) return result(step('link', 'Koppel passende bouwstenen',
      `${unlinked.length === 1 ? 'Eén vraag heeft' : `${unlinked.length} vragen hebben`} nog geen bouwstenen. Kies normen of modelvragen die helpen om ${unlinked.length === 1 ? 'deze vraag' : 'deze vragen'} te beantwoorden.`,
      'Bekijk vragen en koppelingen', 'framework', 'guide-research-builder', 'Bouwstenen bij een deelvraag tellen ook mee bij de centrale vraag. Een koppeling is geen bewijs dat de vraag al is beantwoord.'));
    const free = unassignedIds(draft).length;
    if (free) return result(step('unassigned', 'Bekijk je losse bouwstenen',
      `${free === 1 ? 'Eén gekozen bouwsteen is' : `${free} gekozen bouwstenen zijn`} nog niet gekoppeld. Koppel alleen wat past; niet alles hoeft mee in de export.`,
      'Bekijk gekozen bouwstenen', 'framework', 'guide-building-blocks'));
    return result(step('review', 'Beoordeel of je kader bij de opdracht past',
      'Er zijn koppelingen, maar leveren deze ook de juiste informatie op? Controleer vraagformulering, bron en afbakening voordat je exporteert.',
      'Bekijk de export', 'export', undefined, 'De Wegwijzer controleert je werkstappen, niet de inhoudelijke kwaliteit of volledigheid van je onderzoek.'));
  }
  if (page === 'models' && hasModel && !selected) return result(step('model', 'Kies hoe je het model wilt gebruiken',
    'Vink de gewenste vragen aan in de modelviewer: ze staan direct klaar in Bouw je kader. Voor een losse modelleidraad kun je ook rechtstreeks naar Exporteer.',
    'Stel een modelleidraad samen', 'export'));
  if (selected) return result(step('build', 'Breng je selectie samen',
    'Je hebt bouwstenen gekozen. Bekijk nu welke onderzoeksvragen daarbij passen; je kunt later verder verzamelen.', 'Bouw je kader', 'framework'));
  if(page==='model-workspace')return result(null);
  if (['foundations', 'foundation-workspace', 'models', 'catalogue', 'processes', 'topics'].includes(page)) return result(step('choose', 'Kies wat bij je opdracht past',
    'Bekijk eerst de inhoud en herkomst. Je kunt klein beginnen en later je selectie uitbreiden.', 'Verder op deze pagina', page, 'workflow-page-title'));
  return result(step('sources', 'Verbind de context met je onderzoek',
    'Ga terug naar de bronnen om passende bouwstenen te kiezen. Je hoeft niet elk rapport of elke bron te gebruiken.', 'Verken bronnen', 'foundations'));
}
