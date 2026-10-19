export const kinds = {
  IMPLEMENTATION_STATUS: 'Uitvoeringsstatus', OBSERVED_EMPIRICAL_RESULT: 'Waarneming',
  REPORTED_PERCEPTION: 'Gerapporteerde ervaring', EVALUATIVE_VERDICT: 'Oordeel in de bron',
  REPORT_CAUSAL_INFERENCE: 'Causale duiding in de bron', ADOPTED_SYNTHESIS: 'Synthese in de bron',
  UNRESOLVED: 'Onopgelost',
};
export const limits = {
  STATUS_ONLY: 'Alleen de genoemde mijlpaal. Dit bewijst geen gebruik, verdere uitvoering of effectiviteit.',
  DESCRIPTIVE_ONLY: 'Gerapporteerde waarneming of berekening. Hieruit volgt op zichzelf geen causaal effect.',
  PERCEPTION_ONLY: 'Een gerapporteerde ervaring of overtuiging, geen onafhankelijk bewezen verklaring.',
  EVALUATION_ONLY: 'Het oordeel van de bron tegen haar maatstaf; geen aanvullende causale conclusie.',
  REPORT_ATTRIBUTED_CAUSAL_INFERENCE: 'Causale duiding door de bron, met haar beperkingen. Niet onafhankelijk geverifieerd.',
  SOURCE_BOUNDED_SYNTHESIS: 'Een synthese die niet sterker mag worden gelezen dan de bron ondersteunt.',
  UNRESOLVED: 'Geen vastgestelde bevinding. De bronpassage vraagt aanvullende beoordeling.',
};
export const ontologyLabels = { positive:'Positief', adverse_or_qualified:'Ongunstig / gekwalificeerd', absence:'Afwezigheid', neutral_descriptive:'Beschrijvend', unresolved:'Onopgelost' };
/** @param {string} value */
export function normalize(value) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('nl').replace(/\s+/g,' ').trim(); }
/** @param {{quote:string, reason:string, kind:string, pages:number[]}[]} records @param {string} query @param {string} kind @param {string} page */
export function filterFindings(records,query='',kind='all',page='all') {
  const terms=normalize(query).split(' ').filter(Boolean);
  return records.filter(r => (kind==='all'||r.kind===kind) && (page==='all'||r.pages.includes(Number(page))) && terms.every(t=>normalize(r.quote+' '+r.reason).includes(t)));
}
