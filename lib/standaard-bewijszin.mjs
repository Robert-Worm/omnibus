// Alleen weergave in de export (panelronde 3, punt 10). In de toetsen van DORA staat bij
// ruim duizend toetsen dezelfde algemene zin over bewijs. In elke cel herhaald verdringt hij
// de inhoud. De export laat hem per cel weg en zegt het één keer in de toelichting.
// De bron en de opgeslagen projecten veranderen niet.
const ZINNEN = [
  'Geen verplicht apart bewijsdocument, vaste steekproef of fictieve toetsperiode.',
  'Geen verplicht apart bewijsdocument, vaste steekproef of bewijs van duurzame werking.',
];
export const STANDAARD_BEWIJS_TOELICHTING = 'Bewijsvoorbeelden zijn voorbeelden. Er is geen verplicht apart bewijsdocument, vaste steekproef of vaste toetsperiode, tenzij de toets dat zelf noemt.';
export function zonderStandaardBewijszin(text = '') {
  let result = String(text ?? '');
  for (const zin of ZINNEN) result = result.split(zin).join('');
  return result.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').trim();
}
