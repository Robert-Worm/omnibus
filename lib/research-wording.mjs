// Editorial question headings, not abbreviated norms. Original criteria and
// source mappings remain authoritative; these topics describe the reviewed groups.
const topics = {
  AIA: ['AI-toepassingen, eigen rollen, risico’s en toepasselijke eisen', 'de inrichting en het verantwoorde gebruik van AI-toepassingen', 'modelontwikkeling, proeven, beoordeling en opvolging binnen de eigen rol'],
  AIRMF: ['doel, gebruikscontext en de inrichting van de AI-risicoaanpak', 'de beoordeling van prestaties en gevolgen in de relevante levensfase en gebruiksomgeving', 'de behandeling van AI-risico’s, besluiten, ingrijpen en verbetering'],
  WOO: ['de vindbaarheid, kwaliteit en toegankelijkheid van informatie', 'actieve openbaarmaking en voorbereiding op toekomstige categorieën', 'Woo-verzoeken, uitzonderingen en klachten'],
  NIS2: ['toepasselijkheid, registratie en bestuurlijke verantwoordelijkheid', 'risicogerichte beveiliging, leveranciersbeheersing en herstel', 'incidenten, informatie-uitwisseling en bijzondere verplichtingen'],
  DEVOPS: ['behoeften, rollen, ontwerpen en externe componenten', 'versiebeheer, veilige ontwikkeling, ontwikkeltests en review', 'bouw-, integratie-, beveiligings- en acceptatietests', 'productiegang, herstel, monitoring en verbetering'],
  AVG: ['doel, grondslag, informatie en rechten bij gegevensverwerking', 'verantwoordelijkheden, privacyvriendelijke inrichting, beveiliging en doorgiften', 'privacyrisico’s, datalekken en toepasselijke bijzondere verplichtingen'],
  AW: ['de opdracht, waardebepaling, procedure, eisen en toegang voor leveranciers', 'de beoordeling van leveranciers en aanbiedingen, gunning en verantwoording', 'contractuitvoering, vervolgopdrachten, bijzondere procedures en contractwijzigingen'],
  ARCHIEF2026: ['de voorbereiding van verantwoordelijkheden, beheerregels en toezicht voor documenten', 'de voorbereiding van bewaring, vernietiging en overbrenging', 'de voorbereiding van openbaarheid, beperkingen en toegang met behoud van bestaande rechten'],
  ISO27002: ['afspraken, verantwoordelijkheden en externe afhankelijkheden voor informatiebeveiliging', 'beveiligingsmaatregelen in werkprocessen, gebouwen en systemen', 'het herkennen en opvolgen van problemen, continuïteit en herstel'],
  GIAS: ['deskundigheid, objectiviteit en zorgvuldig omgaan met informatie', 'aansturing, middelen en kwaliteitsbewaking van de auditfunctie', 'onderbouwing van opdrachtresultaten en opvolging'],
  CLOUD2026: ['cloudkeuzes, risicoafwegingen, verantwoordelijkheden en afspraken', 'continuïteit, beveiliging, gegevensbescherming en openbaarheid bij cloudgebruik', 'inzicht in cloudgebruik, uitzonderingen en verantwoording'],
};

export function researchTopicQuestion(topic, direction) {
  const wording = {
    signaling: topic => `Welke knelpunten zijn er bij ${topic}?`,
    diagnostic: topic => `Waardoor ontstaan knelpunten bij ${topic}?`,
    design: topic => `Kan het voorstel knelpunten bij ${topic} oplossen?`,
    change: topic => `Hoe verloopt de invoering van veranderingen in ${topic}?`,
    evaluative: topic => `Welke beoogde verbeteringen zijn bereikt bij ${topic}?`,
  }[direction];
  return wording ? wording(topic) : `Hoe wordt in de praktijk invulling gegeven aan ${topic}?`;
}
export function directedSourceQuestions(sourceId, questions, direction) {
  const subjects = topics[sourceId];
  if (!direction || !subjects || questions.length < subjects.length) return questions;
  return questions.map((q,i) => {
    if (!subjects[i]) return q;
    // A small partial selection can be named exactly, without guessing which
    // elements of the broader source heading still apply. Retain full titles.
    const names=[...new Set(q.selectedTitles || [])];
    const selectedScope=names.map(title=>`“${title}”`).join(' en ');
    if(q.scopeNote && names.length && names.length<=3 && selectedScope.length<=180) {
      const text={
        signaling:`Welke knelpunten blijken bij de gekozen onderdelen ${selectedScope}?`,
        diagnostic:`Wat verklaart knelpunten bij de gekozen onderdelen ${selectedScope}?`,
        design:`In hoeverre past het voorstel bij de gekozen normen ${selectedScope}?`,
        change:`Hoe verloopt de invoering van de gekozen onderdelen ${selectedScope}?`,
        evaluative:`Welke beoogde verbeteringen zijn bereikt op de gekozen punten ${selectedScope}?`,
      }[direction];
      if(text)return {...q,text,scopeNote:'Beperkt tot de gekozen normen; hiermee is het volledige brononderwerp niet onderzocht.'};
    }
    return {...q,text:researchTopicQuestion(subjects[i],direction)};
  });
}

// Do not infer a shorter substantive scope or truncate a user's topic. Long or
// repeated phrases use a deictic reference; the complete topic stays in context.
export function interviewSubject(value, template = '') {
  const subject = value?.trim() || '';
  if (!subject) return 'uw werk';
  const words = subject.split(/\s+/);
  const repeated = words.find(w => w.length >= 7 && new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'iu').test(template.replaceAll('{{onderwerp}}','')));
  return subject.length > 80 || words.length > 12 || /[\n;?]/.test(subject) || repeated ? 'dit onderwerp' : subject;
}
