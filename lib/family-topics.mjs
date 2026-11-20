// Kiezen per onderwerp: het regime voor een familie die uit meer onderdelen bestaat (B-073). Een hoofdwet met
// uitvoeringsregelingen, richtsnoeren en eventueel een praktijkkader krijgt één indeling in onderwerpen. Elke norm heeft
// één hoofdonderwerp (of staat bewust buiten de onderwerpen), hoogstens twee verwante onderwerpen, en optioneel een kader
// (volledig of vereenvoudigd) en een sectorvlag. Een eenvoudig kader dat uit één stuk bestaat, heeft dit niet nodig.
//
// Dit bestand is de algemene logica. Een familie levert alleen gegevens aan: onderwerpen, bronnen, de indeling per norm en
// de teksten van haar opties. Die gegevens staan in de database (B-079): een onderwerppakket wordt met
// `npm run content:topics` gecontroleerd en toegevoegd; lib/topic-families.mjs maakt er de families van.
//
// Een keuze is: één onderwerp, eventueel een deelonderwerp, het kader, of verwante en sectorspecifieke normen meetellen en
// of het praktijkkader de toetsgrondslag is in plaats van de wet. Dezelfde keuze, als korte tekst met de familie ervoor,
// is het filter in de lijst van bronnen én in de viewer van een bron: daardoor tellen en kiezen beide altijd hetzelfde.
//   "dora:T5"  "dora:T5|5c"  "dora:T5||v" (vereenvoudigd kader)  "dora:T5|||r" (met verwante normen)
//   "dora:T6||||s" (met sectorspecifieke normen)  "dora:T5|||||n" (praktijkkader in plaats van de wet)
// Een keuze zonder familie ("T5", bewaard door een eerdere versie) hoort bij de familie die haar leest.

/**
 * @param {object} definition
 * @param {string} definition.id korte naam van de familie, ook het voorvoegsel van een keuze ("dora")
 * @param {string} definition.listFamily de waarde van het lijstfilter Familie waarbij het filter Onderwerp verschijnt
 * @param {string} [definition.category] de categorie van de catalogus waarin de onderwerptegels staan
 * @param {Array} definition.topics onderwerpen: {id,title,includes,excludes,about?:string[],notIn?:[{text}],subs?:[{id,title,description?}]}
 * @param {object} [definition.combination] {template, phrases:{T1:'…'}, join?:'en'|'en aan', review:{reviewer, reviewDate, textHash}}: de beoordeelde centrale vraag
 *   voor twee of meer onderwerpen samen; {onderwerpen} wordt de opsomming van de frasen van de gekozen onderwerpen (B-081)
 * @param {object} [definition.about] teksten voor Over dit onderwerp: {method?,choose?:string[],sourcesIntro?,practiceLaw?,practicePractice?}; [[T1]] verwijst naar een onderwerp
 * @param {Array} definition.sources bronnen met normen in de onderwerpen: {id,soort,laag:'wet'|'praktijk'}
 * @param {Array} definition.outside bronnen van de familie zonder onderwerp: {id,reason}
 * @param {object} definition.index {review, norms:{normId:[sourceId, main, sub, also[], regime, sector]}}
 * @param {object} definition.labels teksten van de opties en de lagen; een optie zonder tekst bestaat niet voor de familie
 */
export function createTopicFamily(definition) {
  const {id: familyId, topics, sources, outside, index} = definition;
  // Een groepsnotitie komt als tekst uit de database ({pattern, flags, text}); een RegExp mag ook.
  const labels = {...definition.labels, groupNotes: (definition.labels.groupNotes || []).map(note =>
    ({text: note.text, pattern: note.pattern instanceof RegExp ? note.pattern : new RegExp(note.pattern, note.flags ?? 'u')}))};
  // De sectorvlag geldt voor de hele norm (true/1), of alleen voor genoemde toetspunten van een gemengde norm (een lijst),
  // zoals DORA art. 11: lid 9 alleen voor centrale effectenbewaarinstellingen, lid 10 voor iedereen (testronde 20-11).
  const entries = Object.entries(index.norms).map(([id, [sourceId, main, sub, also, regime, sector]]) => ({id, sourceId, main, sub, also, regime,
    sector: Array.isArray(sector) ? false : Boolean(sector), sectorPoints: Array.isArray(sector) ? sector : []}));
  const sectorPoint = new Map(entries.flatMap(entry => entry.sectorPoints.map(pointId => [pointId, entry])));
  const byNorm = new Map(entries.map(entry => [entry.id, entry]));
  const sourceIds = new Set(sources.map(source => source.id));
  const prefix = familyId + ':';

  const topicTitle = (topicId, sub) => {
    const topic = topics.find(t => t.id === topicId);
    return topic ? (sub ? topic.subs?.find(s => s.id === sub)?.title ?? topic.title : topic.title) : '';
  };
  const encode = ({topic, sub = '', regime = 'volledig', related = false, sector = false, practice = false}) =>
    (topic ? prefix : '') + [topic, sub, regime === 'vereenvoudigd' ? 'v' : '', related ? 'r' : '', sector ? 's' : '', practice ? 'n' : ''].join('|').replace(/\|+$/u, '');
  function decode(value) {
    let text = String(value || '');
    const colon = text.indexOf(':');
    if (colon > 0 && !text.slice(0, colon).includes('|')) { if (text.slice(0, colon) !== familyId) return null; text = text.slice(colon + 1); }
    const [topic = '', sub = '', regime = '', related = '', sector = '', practice = ''] = text.split('|');
    const found = topics.find(t => t.id === topic);
    if (!found) return null;
    // Met het praktijkkader geldt het vereenvoudigde kader niet: NOREA kent het niet (testronde 19 november 2026).
    return {topic, sub: found.subs?.some(s => s.id === sub) ? sub : '', regime: regime === 'v' && labels.regime && !(practice === 'n' && labels.practice) ? 'vereenvoudigd' : 'volledig',
      related: related === 'r', sector: sector === 's' && Boolean(labels.sector), practice: practice === 'n' && Boolean(labels.practice)};
  }
  // In de indeling heet het volledige kader 'gewoon'. Normen zonder kader gelden onder beide.
  const regimeFits = (entry, regime) => !entry.regime || entry.regime === (regime === 'vereenvoudigd' ? 'vereenvoudigd' : 'gewoon');
  // Sectorspecifiek: normen voor één soort organisatie. Ze tellen alleen mee als de keuze dat zegt.
  const inChoice = (entry, choice) => regimeFits(entry, choice.regime) && (!entry.sector || !labels.sector || Boolean(choice.sector)) && (
    (entry.main === choice.topic && (!choice.sub || entry.sub === choice.sub)) ||
    (choice.related && !choice.sub && entry.also.includes(choice.topic)));
  const asChoice = value => (typeof value === 'string' ? decode(value) : value);

  /** De normen van één bron die bij de keuze horen. */
  const normIds = (sourceId, value) => { const choice = asChoice(value); return choice ? entries.filter(entry => entry.sourceId === sourceId && inChoice(entry, choice)).map(entry => entry.id) : []; };
  /** Hoort deze norm bij de keuze? Zonder geldige keuze hoort alles erbij (geen filter). */
  const matches = (normId, value) => { const choice = asChoice(value), entry = byNorm.get(normId); return choice ? Boolean(entry) && inChoice(entry, choice) : true; };
  /** Naam van de keuze: het onderwerp, met de opties erbij als die afwijken van de standaard. */
  const label = value => { const choice = asChoice(value); if (!choice) return '';
    return topicTitle(choice.topic, choice.sub) + (choice.regime === 'vereenvoudigd' ? ' · ' + labels.regime.short : '') + (choice.related ? ' · met verwante normen' : '') +
      (choice.sector ? ' · met sectorspecifieke normen' : '') + (choice.practice ? ' · ' + labels.practice.label : ''); };
  /** De bronnen met normen voor de keuze, in vaste volgorde. `laag`: wet of praktijk. */
  const choiceSources = value => { const choice = asChoice(value); return choice ? sources.map(source => ({...source, normIds: normIds(source.id, choice)})).filter(source => source.normIds.length) : []; };
  /** Normen en bronnen in de wetslaag voor de keuze. Het praktijkkader telt apart. */
  const counts = value => { const found = choiceSources(value), wet = found.filter(source => source.laag === 'wet');
    return {normen: wet.reduce((sum, source) => sum + source.normIds.length, 0), bronnen: wet.length,
      praktijk: found.filter(source => source.laag === 'praktijk').reduce((sum, source) => sum + source.normIds.length, 0)}; };
  /** De normen van deze bron voor hetzelfde onderwerp die alleen onder het ANDERE kader gelden. Kaders sluiten elkaar uit. */
  const otherRegimeNormIds = (sourceId, value) => { const choice = asChoice(value); if (!choice) return [];
    const other = {...choice, regime: choice.regime === 'vereenvoudigd' ? 'volledig' : 'vereenvoudigd'};
    return entries.filter(entry => entry.sourceId === sourceId && entry.regime && inChoice(entry, other)).map(entry => entry.id); };
  /**
   * Heeft alles een plek? Vergelijkt de indeling met de normen die de database voor de bronnen heeft.
   * Een norm hoeft niet in een onderwerp te passen: 'buiten' is ook een plek. Wat niet mag, is een norm zonder regel
   * (zij valt dan stil uit elk onderwerp) of een regel zonder norm (de indeling loopt achter).
   * @param {Record<string,string[]>} databaseNorms per bron de norm-id's uit de database
   */
  const coverage = databaseNorms => { const missing = [], stale = [], unknownSources = [];
    for (const source of sources) { const known = databaseNorms[source.id]; if (!known) { unknownSources.push(source.id); continue; }
      const present = new Set(known);
      for (const normId of known) if (!byNorm.has(normId)) missing.push(normId);
      for (const entry of entries) if (entry.sourceId === source.id && !present.has(entry.id)) stale.push(entry.id); }
    return {ok: !missing.length && !stale.length && !unknownSources.length, missing, stale, unknownSources}; };

  return {id: familyId, listFamily: definition.listFamily, category: definition.category || '', tone: definition.tone || '', topics, sources, outside, review: index.review, labels, about: definition.about ?? {},
    // Alleen een beoordeelde overkoepelende vraag wordt voorgesteld.
    combination: definition.combination?.template && definition.combination.review?.textHash ? {template: definition.combination.template, phrases: definition.combination.phrases,
      join: definition.combination.join === 'en aan' ? 'en aan' : 'en'} : null,
    // Eén vraagplan per onderwerp en per deelonderwerp (B-076). De vragen zelf komen als beoordeeld plan uit de database;
    // hier staat alleen de vaste identiteit, zodat een bewaard project het plan terugvindt.
    questionPlans: topics.flatMap(topic => [{id: `TOPIC-${familyId}-${topic.id}`, family: familyId, topic: topic.id, sub: '', title: topic.title},
      ...(topic.subs ?? []).map(sub => ({id: `TOPIC-${familyId}-${topic.id}-${sub.id}`, family: familyId, topic: topic.id, sub: sub.id, title: sub.title}))]),
    isSource: id => sourceIds.has(id), owns: value => Boolean(decode(value)), normTopic: normId => byNorm.get(normId) ?? null, topicTitle, encode, decode, normIds, matches, label,
    choiceSources, counts, otherRegimeNormIds, coverage,
    /** Hoort dit toetspunt bij de keuze? Alleen een sectorspecifiek toetspunt van een gemengde norm valt weg zonder sectoroptie. */
    pointFits: (pointId, value) => { const choice = asChoice(value); return !choice || !labels.sector || choice.sector || !sectorPoint.has(pointId); },
    /** Toetspunten en normen van deze bron en dit onderwerp die alleen met de sectoroptie meetellen. */
    sectorOnly: (sourceId, value) => { const choice = asChoice(value); if (!choice || !labels.sector) return {normIds: [], pointIds: []};
      const withSector = entries.filter(entry => entry.sourceId === sourceId && inChoice(entry, {...choice, sector: true}));
      return {normIds: withSector.filter(entry => entry.sector).map(entry => entry.id), pointIds: withSector.flatMap(entry => entry.sectorPoints)}; },
    /** Alle bronnen met normen van dit onderwerp die alleen onder het ANDERE kader gelden, ook bronnen die onder het gekozen
     * kader niets hebben (zoals de TLPT-RTS). Kiezen onder het ene kader laat die los (testronde 19 november 2026). */
    otherRegimeSourceIds: value => sources.map(source => source.id).filter(id => otherRegimeNormIds(id, value).length > 0),
    /** De laag waarvoor "kies alles" geldt: de wet, of het praktijkkader als de keuze dat zegt. */
    basis: value => (asChoice(value)?.practice ? 'praktijk' : 'wet'),
    sourceHasRegimes: sourceId => Boolean(labels.regime) && entries.some(entry => entry.sourceId === sourceId && entry.regime),
    topicHasRelated: topicId => entries.some(entry => entry.also.includes(topicId)),
    topicHasSector: (topicId, sourceId = '') => Boolean(labels.sector) && entries.some(entry => (entry.sector || entry.sectorPoints.length) && (!sourceId || entry.sourceId === sourceId) && (entry.main === topicId || entry.also.includes(topicId))),
    sourceTopicIds: sourceId => topics.filter(topic => entries.some(entry => entry.sourceId === sourceId && entry.main === topic.id)).map(topic => topic.id),
    unassigned: entries.filter(entry => entry.main === 'buiten').map(entry => entry.id),
    /** Eén zin bij een groep van een bron, als de groepsnaam een kader noemt; anders ''. */
    groupNote: title => (labels.groupNotes || []).find(note => note.pattern.test(title))?.text ?? ''};
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const text = (value, max = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const option = value => value === undefined || (value && text(value.label, 120) && typeof value.title === 'string');
/**
 * Klopt de vorm van een familie? Voor de publicatie (een pakket met fouten gaat niet in de database) en voor de app
 * (een onleesbare familie wordt overgeslagen). Geeft een lijst met problemen; leeg is goed.
 * @param {any} definition
 * @returns {string[]}
 */
const paragraphs = value => Array.isArray(value) && value.length > 0 && value.every(item => text(item, 1200));

/** De centrale vraag voor een combinatie: het kader met de frasen van de onderwerpen ("A en B", "A, B en C"). */
export function combinationQuestion(combination, topicIds) {
  if (!combination || topicIds.length < 2) return '';
  const phrases = topicIds.map(id => combination.phrases?.[id]);
  if (phrases.some(item => !item)) return '';
  const link = combination.join === 'en aan' ? ' en aan ' : ' en ';
  const listed = phrases.length === 2 ? phrases.join(link) : phrases.slice(0, -1).join(', ') + link + phrases.at(-1);
  return combination.template.replace('{onderwerpen}', listed);
}

export function validateTopicDefinition(definition) {
  const problems = [], say = message => problems.push(message);
  if (!definition || typeof definition !== 'object') return ['De familie ontbreekt.'];
  const {id, listFamily, topics, sources, outside, labels, index} = definition;
  if (!/^[a-z][a-z0-9-]{1,31}$/u.test(id || '')) say('id: kleine letters, cijfers en streepjes, 2 tot 32 tekens.');
  if (!text(listFamily, 120)) say('listFamily ontbreekt.');
  if (!Array.isArray(topics) || !topics.length) say('Er zijn geen onderwerpen.');
  const topicIds = new Set();
  for (const topic of Array.isArray(topics) ? topics : []) {
    if (!ID.test(topic?.id || '') || topic.id === 'buiten' || topicIds.has(topic.id)) say(`Onderwerp met ongeldige of dubbele id: ${topic?.id}`);
    topicIds.add(topic?.id);
    if (!text(topic?.title, 120) || !text(topic?.includes) || typeof topic?.excludes !== 'string') say(`Onderwerp ${topic?.id}: titel, includes en excludes zijn nodig.`);
    const subs = new Set();
    for (const sub of topic?.subs ?? []) { if (!ID.test(sub?.id || '') || subs.has(sub.id) || !text(sub?.title, 120) || (sub.description !== undefined && !text(sub.description, 400))) say(`Deelonderwerp van ${topic.id} ongeldig: ${sub?.id}`); subs.add(sub?.id); }
    if (topic?.about !== undefined && !paragraphs(topic.about)) say(`Onderwerp ${topic?.id}: about moet een lijst alinea's zijn.`);
    if (topic?.notIn !== undefined && (!Array.isArray(topic.notIn) || topic.notIn.some(item => !text(item?.text, 600)))) say(`Onderwerp ${topic?.id}: notIn moet een lijst {text} zijn.`);
  }
  const about = definition.about;
  if (about !== undefined) {
    if (!about || typeof about !== 'object') say('about moet een object zijn.');
    else { for (const key of ['method', 'choose']) if (about[key] !== undefined && !paragraphs(about[key])) say(`about.${key} moet een lijst alinea's zijn.`);
      for (const key of ['sourcesIntro', 'practiceLaw', 'practicePractice']) if (about[key] !== undefined && !text(about[key], 600)) say(`about.${key} is geen korte tekst.`); }
  }
  const combination = definition.combination;
  if (combination !== undefined) {
    if (!combination || !text(combination.template, 400) || !combination.template.includes('{onderwerpen}')) say('combination.template moet {onderwerpen} bevatten.');
    else if (!combination.phrases || (Array.isArray(topics) ? topics : []).some(topic => !text(combination.phrases[topic?.id], 160))) say('combination.phrases: elk onderwerp heeft een korte frase nodig.');
    if (combination && combination.join !== undefined && !['en', 'en aan'].includes(combination.join)) say("combination.join moet 'en' of 'en aan' zijn.");
    if (combination && (!text(combination.review?.reviewer, 160) || !text(combination.review?.reviewDate, 10) || !text(combination.review?.textHash, 128))) say('combination.review: reviewer, reviewDate en textHash zijn nodig.');
  }
  // Verwijzingen [[T1]] in de teksten moeten naar een bestaand onderwerp wijzen.
  const texts = [...(Array.isArray(topics) ? topics : []).flatMap(topic => [...(topic?.about ?? []), ...(topic?.notIn ?? []).map(item => item?.text)]),
    ...(about?.method ?? []), ...(about?.choose ?? [])].filter(item => typeof item === 'string');
  for (const item of texts) for (const [, ref] of item.matchAll(/\[\[([^\]]+)\]\]/gu)) if (!topicIds.has(ref)) say(`Verwijzing naar onbekend onderwerp: [[${ref}]]`);
  const sourceIds = new Set();
  for (const source of Array.isArray(sources) ? sources : []) {
    if (!text(source?.id, 160) || sourceIds.has(source.id)) say(`Bron met ongeldige of dubbele id: ${source?.id}`);
    sourceIds.add(source?.id);
    if (!['wet', 'praktijk'].includes(source?.laag) || !text(source?.soort, 120)) say(`Bron ${source?.id}: laag (wet of praktijk) en soort zijn nodig.`);
  }
  if (!sourceIds.size) say('Er zijn geen bronnen.');
  for (const item of Array.isArray(outside) ? outside : []) if (!text(item?.id, 160) || !text(item?.reason, 400) || sourceIds.has(item.id)) say(`Bron buiten de onderwerpen ongeldig: ${item?.id}`);
  if (!labels || !Array.isArray(labels.lawNoun) || labels.lawNoun.length !== 2 || !text(labels.law, 80) || !option(labels.related)) say('labels: lawNoun, law en related zijn nodig.');
  else for (const key of ['regime', 'sector', 'practice']) if (!option(labels[key])) say(`labels.${key} is onvolledig.`);
  if (labels?.facet !== undefined && !text(labels.facet, 40)) say('labels.facet is geen korte tekst.');
  if (labels?.regime?.practiceNote !== undefined && !text(labels.regime.practiceNote, 300)) say('labels.regime.practiceNote is geen korte tekst.');
  for (const note of labels?.groupNotes ?? []) { try { new RegExp(note.pattern, note.flags ?? 'u'); } catch { say(`Groepsnotitie met ongeldig patroon: ${note?.pattern}`); } if (!text(note?.text, 400)) say('Groepsnotitie zonder tekst.'); }
  if (!index || typeof index !== 'object' || !index.norms || typeof index.norms !== 'object') return [...problems, 'De indeling per norm ontbreekt.'];
  if (!index.review || !text(index.review.note) || !text(index.review.date, 10)) say('De indeling heeft geen reviewverantwoording (review.note en review.date).');
  for (const [normId, entry] of Object.entries(index.norms)) {
    const [sourceId, main, sub, also, regime, sector] = Array.isArray(entry) ? entry : [];
    const topic = Array.isArray(topics) ? topics.find(item => item.id === main) : null;
    if (!sourceIds.has(sourceId)) say(`${normId}: onbekende bron ${sourceId}`);
    if (main !== 'buiten' && !topic) say(`${normId}: onbekend hoofdonderwerp ${main}`);
    if (sub && !topic?.subs?.some(item => item.id === sub)) say(`${normId}: onbekend deelonderwerp ${sub}`);
    if (!Array.isArray(also) || also.length > 2 || also.some(item => !topicIds.has(item) || item === main)) say(`${normId}: hoogstens twee andere, bestaande verwante onderwerpen`);
    if (!['', 'gewoon', 'vereenvoudigd'].includes(regime)) say(`${normId}: kader moet leeg, gewoon of vereenvoudigd zijn`);
    if (Array.isArray(sector)) { if (!sector.length || sector.length > 20 || sector.some(pointId => typeof pointId !== 'string' || !pointId.startsWith(normId + '-P') || !ID.test(pointId)) || new Set(sector).size !== sector.length) say(`${normId}: sectorspecifieke toetspunten moeten toetspunten van deze norm zijn`); }
    else if (![0, 1, true, false].includes(sector)) say(`${normId}: sectorvlag moet 0, 1 of een lijst toetspunten zijn`);
  }
  if (index.review && Number.isInteger(index.review.normen) && index.review.normen !== Object.keys(index.norms).length) say('review.normen klopt niet met het aantal normen in de indeling.');
  return problems;
}
