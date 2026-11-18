import {topicFamilyOfSource} from './topic-families.mjs';
import {verwanteNormen} from './norea-verwant.mjs';

/** De norm waar een gekozen toetspunt bij hoort; staat in de bewaarde bronherleiding. */
function normOf(material) {
  if (!material?.topicalTrace) return '';
  try { const trace = JSON.parse(material.topicalTrace); return trace?.point?.criterion_id || trace?.criterion?.id || ''; } catch { return ''; }
}

/** Het onderwerp van een toetspunt binnen een familie met onderwerpen, of '' als het er bewust buiten valt. */
export function exportTopic(material) {
  const family = topicFamilyOfSource(material?.foundationId), norm = normOf(material), place = norm && family?.normTopic(norm);
  return place ? family.topicTitle(place.main, place.sub) : '';
}

/** Het onderwerp voorop in de kolom Categorie; de indeling van de bron zelf blijft eronder staan. */
export function exportCategory(material, own) {
  const topic = exportTopic(material);
  return topic && topic !== own ? [topic, own].filter(Boolean).join('\n') : own;
}

/** Het artikel uit de grondslag van een koppeling, als die er een noemt: kort genoeg voor een cel. */
function articleOf(grondslag) {
  // De regeling staat al in het label; hier alleen het artikel.
  const tail = String(grondslag || '').split(';').pop().trim().replace(/\.$/, '').replace(/^(RTS|ITS)( \d{4}\/\d+)? (?=artikel|bijlage)/i, '');
  return /\b(artikel|artikelen|bijlage)\b/i.test(tail) && tail.length <= 90 ? ' (' + tail + ')' : '';
}

/** Verwijzingen naar de verwante normen: bij een praktijkkader de wet met het artikel, bij de wet het praktijkkader. */
export function exportRelated(material) {
  const norm = normOf(material);
  if (!norm) return '';
  const practice = material.foundationId === 'NOREA-DORA-3-2';
  return verwanteNormen(material.foundationId, norm).map(r => (practice ? 'Wet: ' : 'Praktijk: ') + r.label + (practice ? articleOf(r.grondslag) : '')).join('\n');
}

/** Vindplaats met de verwijzingen eronder, in dezelfde cel. */
export const exportLocation = (material, location) => [location, exportRelated(material)].filter(Boolean).join('\n');
