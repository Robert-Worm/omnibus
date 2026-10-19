export function fixture(keys, profile = 'testing') {
  return {
    title: 'AI-proef — informatiebeveiliging', direction: 'evaluative',
    intake: {object: 'Informatiebeveiliging bij de onderzochte organisatie',
      purpose: 'Beoordelen hoe verantwoordelijkheden en beheersmaatregelen zijn ingericht.',
      scope: 'Proefselectie voor technische controle; geen inhoudelijk onderzoeksadvies.',
      period: 'Nog te bepalen', roles: ['CIO', 'Uitvoering'], assumptions: ['Toepasselijkheid nog te beoordelen']},
    selections: keys.map(key => ({key, reason: 'Technische proef van selectie, bronbehoud en vraagkoppeling.'})),
    questions: [{key: 'central', text: 'Hoe is de informatiebeveiliging ingericht en onderbouwd?', selections: keys.slice(0, 1)},
      {key: 'sub', parent: 'central', text: 'Hoe zijn taken en maatregelen vastgelegd en in de praktijk herkenbaar?', selections: keys}],
    export: {profile, meta: {author: 'Test', team: 'Proef', scope: ''},
      interview: {levels: ['operational', 'management'], starr: false, triangulation: true}},
  };
}
