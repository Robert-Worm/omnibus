// Herkomst van een export (panel 23 november 2026, B-103): de versie van Omnibus en, per bron, de datum waarop de
// status van die bron is nagegaan. De gegevens komen uit de gekozen bouwstenen zelf, niet uit de huidige database.
import {PRODUCT_VERSION} from './product-release.mjs';
import {datumVoluit} from './audit-reading.mjs';

const datum = tekst => /^\d{4}-\d{2}-\d{2}/.test(String(tekst || '')) ? datumVoluit(String(tekst).slice(0, 10)) : '';

/** De regels voor het blad Versiebeheer. */
export function exportOrigin(records = []) {
  const bronnen = new Map();
  for (const record of records) {
    const m = record?.material, titel = String(m?.sourceTitle || '').trim(), peil = datum(m?.statusAsOf);
    if (!titel || !peil) continue;
    if (!bronnen.has(titel)) bronnen.set(titel, new Set());
    bronnen.get(titel).add(peil);
  }
  const regels = [`Gemaakt met Project Omnibus versie ${PRODUCT_VERSION}. De datum en tijd van de export staan in de tabel hierboven.`];
  if (bronnen.size) regels.push('Peildatum per bron, de datum waarop de status van de bron is nagegaan: '
    + [...bronnen].map(([titel, data]) => `${titel}: ${[...data].join(' en ')}`).join(' · ') + '.');
  return regels;
}
