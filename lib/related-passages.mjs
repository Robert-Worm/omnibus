// Bepalingen uit een ander kader bij een toetspunt (besluit beheerder 11 november 2026).
// Een toetspunt kan verwijzen naar passages die in een ander kader staan, bijvoorbeeld de meldtermijnen van
// RTS 2025/301 bij het meldproces van ITS 2025/302. De passage blijft in haar eigen kader; hier wordt ze opgezocht.
import {topicalPrimarySpans,topicalSpanPage,zonderAfbreking} from './topical-document-identity.mjs';
import {leesbareVindplaats} from './vindplaats.mjs';

// De kaderpakketten melden zich hier aan (lib/topical-content.mjs), zodat dit bestand ze niet zelf hoeft te laden.
let zoekKader = () => undefined;
export function registerRelatedLookup(lookup) { zoekKader = lookup; }

/** De kaders waarnaar een toetspunt verwijst; nodig om ze te laden voordat de passages worden getoond. */
export function relatedSourceIds(point) {
  return [...new Set((point?.related_passages ?? []).map(entry => entry.source_id).filter(Boolean))];
}

/** Per verwezen kader de passages, in de volgorde van het toetspunt. Een kader dat niet geladen is, levert niets op. */
export function relatedPassages(point) {
  return (point?.related_passages ?? []).flatMap(entry => {
    const bundle = zoekKader(entry.source_id), records = bundle?.bank?.records;
    if (!records) return [];
    const passages = (entry.record_ids ?? []).flatMap(id => {
      const record = records.find(r => r.id === id);
      if (!record) return [];
      const spans = topicalPrimarySpans(bundle.manifest.documents, record.source_spans);
      const pages = [...new Set(spans.map(span => topicalSpanPage(bundle.manifest.documents, span)))];
      // De omschrijving achter de vindplaats is hier gelijk aan de titel van de kaart; die staat er dan één keer.
      const location = leesbareVindplaats(record).replace(' · ' + record.title, '');
      return [{id, title: record.title, location, pages, text: spans.map(span => zonderAfbreking(span.quote)).join('\n[…]\n')}];
    });
    return passages.length ? [{sourceId: bundle.id, sourceTitle: bundle.context.title, url: bundle.status.official_url, passages}] : [];
  });
}

/** De sleutels van de kaders die een opgeslagen toetspunt nodig heeft om zijn verwezen passages te tonen. */
export function relatedFoundationKeys(serialized) {
  if (typeof serialized !== 'string' || !serialized.includes('"related_passages"')) return [];
  try { return [...new Set((JSON.parse(serialized).point?.related_passages ?? []).map(entry => entry.source_id).filter(Boolean))].map(id => 'foundation:' + id); }
  catch { return []; }
}
