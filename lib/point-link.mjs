// Vaste link naar één toetspunt (besluit beheerder 23 november 2026, B-102).
// Het adres is opgebouwd uit de vaste ID van de bron en van het toetspunt en opent het toetspunt op Bronpassage.
// Zo kan iemand vanuit een export of een gedeelde link nagaan welke passage Omnibus als bron gebruikte.
// Het derde deel is een kenmerk van de passage op het moment dat de link werd gemaakt: is de tekst sindsdien
// gewijzigd, dan zegt de viewer dat erbij.
export const PUBLIC_ADDRESS = 'https://omnibus.rijksmap.nl/';
const PREFIX = '#toetspunt/';
const part = value => encodeURIComponent(String(value));

/** Het webadres van deze Omnibus; een lokale of offline versie verwijst naar de openbare, want alleen die is deelbaar. */
export function pointLinkBase(location = globalThis.location) {
  try {
    if (location && /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))
      return location.origin + '/';
  } catch { /* geen adres beschikbaar */ }
  return PUBLIC_ADDRESS;
}

export function pointLinkHash(sourceId, pointId, fingerprint = '') {
  if (!sourceId || !pointId) return '';
  return PREFIX + part(sourceId) + '/' + part(pointId) + (fingerprint ? '/' + part(fingerprint) : '');
}

export function pointLink(sourceId, pointId, fingerprint = '', base = pointLinkBase()) {
  const hash = pointLinkHash(sourceId, pointId, fingerprint);
  return hash ? base + hash : '';
}

/** Leest een adres terug. Geeft null voor alles wat geen toetspuntlink is. */
export function parsePointLink(hash) {
  if (typeof hash !== 'string' || !hash.startsWith(PREFIX)) return null;
  const parts = hash.slice(PREFIX.length).split('/');
  if (parts.length < 2 || parts.length > 3) return null;
  try {
    const [sourceId, pointId, fingerprint = ''] = parts.map(decodeURIComponent);
    if (!sourceId || !pointId || sourceId.length > 120 || pointId.length > 160 || !/^[a-z0-9]{0,16}$/.test(fingerprint)) return null;
    return {sourceId, pointId, fingerprint};
  } catch {
    return null;
  }
}
export const isPointLink = hash => parsePointLink(hash) !== null;

// Geen beveiliging, alleen herkennen of een tekst gelijk is gebleven (cyrb53).
function shortHash(text) {
  let a = 0xdeadbeef, b = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
}

/** De letterlijke passages waarop een toetspunt steunt, uit het toetspunt en zijn bronrecords. */
export function pointPassages(point, records) {
  const find = id => (records instanceof Map ? records.get(id) : (records || []).find(r => r.id === id));
  const quotes = [];
  for (const link of point?.source_links || []) {
    const record = find(link.record_id);
    for (const span of link.visible_spans || record?.source_spans || []) if (span?.quote) quotes.push(span.quote);
    if (record?.xml_evidence?.quote) quotes.push(record.xml_evidence.quote);
  }
  return quotes;
}

/** Kenmerk van de bronpassages van een toetspunt; leeg als er geen letterlijke passage is vastgelegd. */
export function passageFingerprint(point, records) {
  const quotes = pointPassages(point, records).map(q => String(q).replace(/\s+/gu, ' ').trim()).filter(Boolean).sort();
  return quotes.length ? shortHash(quotes.join('\n')) : '';
}

// De viewer van de bron leest het verzoek zodra hij opent, net als bij een sprong naar een norm.
// Lezen verandert niets: React kan een weergave opbouwen en weer weggooien, en dan moet het verzoek er nog zijn.
// De viewer meldt het verzoek af zodra hij echt in beeld staat.
let pending = null;
export function requestPointLink(link) { pending = link ? {...link, at: Date.now()} : null; }
/** Het openstaande verzoek voor deze bron, alleen als het vers is. */
export function peekPointLink(sourceId) {
  return pending && pending.sourceId === sourceId && Date.now() - pending.at < 30000 ? pending : null;
}
export function clearPointLink(link) { if (link && pending === link) pending = null; }

/** De link bij een gekozen bouwsteen in een export, of leeg als de bouwsteen geen toetspunt uit een wet of kader is. */
export function materialPointLink(material, base = pointLinkBase()) {
  if (!material?.foundationId) return '';
  const traced = material.topicalTrace || material.lawTrace || material.cioTrace;
  // Een norm uit een kader zonder aparte bronrecords (zoals BVA2021): de vaste ID van de norm, zonder passagekenmerk.
  if (!traced) {
    const id = material.sourceControlId;
    return id && !material.reportTrace && String(material.originKey || '').startsWith(material.foundationId + ':') ? pointLink(material.foundationId, id, '', base) : '';
  }
  if (!material.sourcePointId) return '';
  let trace = null;
  try { trace = JSON.parse(traced); } catch { /* geen leesbare herleiding */ }
  if (!trace?.point || trace.point.id !== material.sourcePointId) return '';
  return pointLink(material.foundationId, material.sourcePointId, passageFingerprint(trace.point, trace.records), base);
}
