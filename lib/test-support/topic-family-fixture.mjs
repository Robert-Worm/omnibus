// Een verzonnen familie voor tests (B-079): dezelfde vormen als een echte familie, zonder echte inhoud.
// Twee wetten en een praktijkkader, drie onderwerpen (één met deelonderwerpen), twee kaders, een sectornorm,
// verwante normen, een norm buiten de onderwerpen en een groepsnotitie.
export const fixtureDefinition = () => ({
  id: 'proef', listFamily: 'Proef', category: 'proefcategorie', tone: 'proef',
  topics: [
    {id: 'A', title: 'Bestuur', includes: 'Rollen en beleid.', excludes: 'Uitvoering.'},
    {id: 'B', title: 'Incidenten', includes: 'Detecteren en melden.', excludes: 'Herstel.', subs: [{id: 'b1', title: 'Detecteren'}, {id: 'b2', title: 'Melden'}]},
    {id: 'C', title: 'Herstel', includes: 'Plannen en testen.', excludes: ''},
  ],
  sources: [{id: 'WET', soort: 'Wet', laag: 'wet'}, {id: 'REG', soort: 'Regeling', laag: 'wet'}, {id: 'PRAKTIJK', soort: 'Praktijkkader', laag: 'praktijk'}],
  outside: [{id: 'TOEZICHT', reason: 'gaat over het toezicht'}],
  labels: {facet: 'Onderwerp', lawNoun: ['wet', 'wetten'], law: 'de wet', related: {label: 'Ook verwante normen', title: 'Normen van een ander onderwerp.'},
    regime: {label: 'Vereenvoudigd kader', short: 'vereenvoudigd kader', title: 'Voor kleine instellingen.'},
    sector: {label: 'Ook sectorspecifieke normen', title: 'Voor één soort instelling.'},
    practice: {label: 'Praktijk in plaats van de wet', name: 'Praktijk', full: 'Praktijkkader', title: 'Geen wet.', toPractice: 'naar praktijk', toLaw: 'naar wet'},
    groupNotes: [{pattern: '^Gewoon\\b', flags: 'u', text: 'Volledig kader.'}]},
  index: {review: {status: 'proef', date: '2026-11-19', normen: 10, note: 'Verzonnen indeling voor tests.'},
    norms: {
      'WET-N1': ['WET', 'A', '', [], '', 0], 'WET-N2': ['WET', 'B', 'b1', ['C'], '', 0], 'WET-N3': ['WET', 'B', 'b2', [], 'gewoon', 0],
      'WET-N4': ['WET', 'B', 'b2', [], 'vereenvoudigd', 0], 'WET-N5': ['WET', 'buiten', '', [], '', 0],
      'REG-N1': ['REG', 'C', '', ['A'], '', 0], 'REG-N2': ['REG', 'C', '', [], '', 1], 'REG-N3': ['REG', 'A', '', [], '', 0],
      'PRAKTIJK-N1': ['PRAKTIJK', 'B', 'b1', [], '', 0], 'PRAKTIJK-N2': ['PRAKTIJK', 'C', '', [], '', 0]}},
});
