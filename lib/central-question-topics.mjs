// Een centrale vraag die meerdere onderwerpen opsomt, noemt in het voorstel alleen de onderwerpen waarvan
// toetspunten zijn gekozen (panel 10 november 2026: bij alleen incidenten noemde de vraag ook tests, externe
// ICT-diensten en dreigingsuitwisseling). De beoordeelde vraagtekst in de catalogus blijft gelijk; dit is het
// voorstel dat de gebruiker daarna zelf kan aanpassen. Zonder gekozen toetspunten blijft de volledige opsomming staan.
const TOPICS = {
  'DORA-2022-2554': [{
    phrase: 'incidenten, tests, externe ICT-diensten of cyberdreigingsuitwisseling',
    topics: [
      ['incidenten', /^DORA-Q-M-S(0[1-5]|20)$/u],
      ['tests', /^DORA-Q-M-S(0[6-9]|1[01]|19)$/u],
      ['externe ICT-diensten', /^DORA-Q-M-S(1[2-7]|2[1-3])$/u],
      ['cyberdreigingsuitwisseling', /^DORA-Q-M-S18$/u],
    ],
  }],
};

const opsomming = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' of ' + names.at(-1);

/** `subquestions`: [{key, ids}] zoals in een voorstel; `ids` zijn de gekozen bouwstenen bij die deelvraag. */
export function focusedCentral(sourceId, text, subquestions = []) {
  let result = String(text ?? '');
  for (const {phrase, topics} of TOPICS[sourceId] ?? []) {
    if (!result.includes(phrase)) continue;
    const chosen = topics.filter(([, pattern]) => subquestions.some(q =>
      pattern.test(String(q.key ?? '').split(':').pop()) && (q.ids?.length ?? 0) > 0)).map(([name]) => name);
    if (chosen.length && chosen.length < topics.length) result = result.replace(phrase, opsomming(chosen));
  }
  // "aanvullende" verwees naar de indeling van de makers en zegt de lezer niets (panel 11 november 2026).
  if (TOPICS[sourceId]) result = result.replace('geselecteerde aanvullende DORA-eisen', 'geselecteerde DORA-eisen');
  return result;
}
