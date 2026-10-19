// Status is a reviewed source snapshot, not a live legal feed. Passing a date
// never silently turns a future provision into an applicable obligation.
export function provisionStatusLabel(item={}) {
  if(item.effectiveStatus==='optional') return 'Geldende optionele publicatievorm';
  if(item.effectiveStatus==='conditional') return 'Afhankelijk van aanwijzing';
  if(item.effectiveStatus==='future') return item.effectiveFrom
    ? `Voorbereiding · ${/^(uiterlijk|vóór)\s/u.test(item.effectiveFrom) ? item.effectiveFrom : `vanaf ${item.effectiveFrom}`}`
    : 'Voorbereiding · ingangsdatum niet bevestigd';
  if(item.effectiveStatus==='draft') return 'Concept · geen geldende verplichting';
  if(item.effectiveStatus==='unknown') return 'Inwerkingtreding niet vastgesteld';
  return '';
}
export function provisionStatusText(item={}) {
  return [provisionStatusLabel(item), item.statusAsOf && `Bronpeildatum: ${item.statusAsOf}`,
    item.statusNote, item.statusSource].filter(Boolean).join('\n');
}
export function documentHashes(reference={}) {
  if(!reference.sourceDocumentHashes)return {};
  try {
    const parsed=JSON.parse(reference.sourceDocumentHashes);
    if(!parsed || Array.isArray(parsed) || typeof parsed!=='object')return {};
    const entries=Object.entries(parsed);
    if(entries.some(([id,hash])=>!(/^[A-Za-z0-9-]+$/.test(id)&&typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash))))return {};
    return Object.fromEntries(entries);
  } catch { return {}; }
}
