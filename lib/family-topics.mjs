// Kiezen per onderwerp: het regime voor een familie die uit meer onderdelen bestaat (B-073). Een hoofdwet met
// uitvoeringsregelingen, richtsnoeren en eventueel een praktijkkader krijgt één indeling in onderwerpen. Elke norm heeft
// één hoofdonderwerp (of staat bewust buiten de onderwerpen), hoogstens twee verwante onderwerpen, en optioneel een kader
// (volledig of vereenvoudigd) en een sectorvlag. Een eenvoudig kader dat uit één stuk bestaat, heeft dit niet nodig.
//
// Dit bestand is de algemene logica. Een familie levert alleen gegevens aan: onderwerpen, bronnen, de indeling per norm en
// de teksten van haar opties. Zie lib/dora-onderwerpen.mjs voor de eerste familie en lib/topic-families.mjs voor de lijst.
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
 * @param {Array} definition.topics onderwerpen: {id,title,includes,excludes,subs?:[{id,title}]}
 * @param {Array} definition.sources bronnen met normen in de onderwerpen: {id,soort,laag:'wet'|'praktijk'}
 * @param {Array} definition.outside bronnen van de familie zonder onderwerp: {id,reason}
 * @param {object} definition.index {review, norms:{normId:[sourceId, main, sub, also[], regime, sector]}}
 * @param {object} definition.labels teksten van de opties en de lagen; een optie zonder tekst bestaat niet voor de familie
 */
export function createTopicFamily(definition) {
  const {id: familyId, topics, sources, outside, index, labels} = definition;
  const entries = Object.entries(index.norms).map(([id, [sourceId, main, sub, also, regime, sector]]) => ({id, sourceId, main, sub, also, regime, sector}));
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
    return {topic, sub: found.subs?.some(s => s.id === sub) ? sub : '', regime: regime === 'v' && labels.regime ? 'vereenvoudigd' : 'volledig',
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

  return {id: familyId, listFamily: definition.listFamily, category: definition.category || '', tone: definition.tone || '', topics, sources, outside, review: index.review, labels,
    // Eén vraagplan per onderwerp en per deelonderwerp (B-076). De vragen zelf komen als beoordeeld plan uit de database;
    // hier staat alleen de vaste identiteit, zodat een bewaard project het plan terugvindt.
    questionPlans: topics.flatMap(topic => [{id: `TOPIC-${familyId}-${topic.id}`, family: familyId, topic: topic.id, sub: '', title: topic.title},
      ...(topic.subs ?? []).map(sub => ({id: `TOPIC-${familyId}-${topic.id}-${sub.id}`, family: familyId, topic: topic.id, sub: sub.id, title: sub.title}))]),
    isSource: id => sourceIds.has(id), owns: value => Boolean(decode(value)), normTopic: normId => byNorm.get(normId) ?? null, topicTitle, encode, decode, normIds, matches, label,
    choiceSources, counts, otherRegimeNormIds, coverage,
    /** De laag waarvoor "kies alles" geldt: de wet, of het praktijkkader als de keuze dat zegt. */
    basis: value => (asChoice(value)?.practice ? 'praktijk' : 'wet'),
    sourceHasRegimes: sourceId => Boolean(labels.regime) && entries.some(entry => entry.sourceId === sourceId && entry.regime),
    topicHasRelated: topicId => entries.some(entry => entry.also.includes(topicId)),
    topicHasSector: (topicId, sourceId = '') => Boolean(labels.sector) && entries.some(entry => entry.sector && (!sourceId || entry.sourceId === sourceId) && (entry.main === topicId || entry.also.includes(topicId))),
    sourceTopicIds: sourceId => topics.filter(topic => entries.some(entry => entry.sourceId === sourceId && entry.main === topic.id)).map(topic => topic.id),
    unassigned: entries.filter(entry => entry.main === 'buiten').map(entry => entry.id),
    /** Eén zin bij een groep van een bron, als de groepsnaam een kader noemt; anders ''. */
    groupNote: title => (labels.groupNotes || []).find(note => note.pattern.test(title))?.text ?? ''};
}
