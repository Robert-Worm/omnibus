// Risico-controlmatrix: toetsaanpak en bewijs per fase gelabeld, bewijs niet dubbel (expertpanel 8 november 2026).
// Alleen als de cel nog de standaardtekst uit de bron is; eigen tekst van de gebruiker blijft letterlijk.
const BEWIJS = /\n\nVerwacht bewijs: ([\s\S]*)$/u;
const splits = (tekst = '') => { const m = String(tekst).match(BEWIJS); return m ? {aanpak: tekst.slice(0, m.index).trim(), bewijs: m[1].trim()} : {aanpak: String(tekst).trim(), bewijs: ''}; };
const fasen = material => [['Opzet', material?.testDesign], ['Bestaan', material?.testExistence]].filter(([, t]) => t);
const standaard = material => [...new Set(fasen(material).map(([, t]) => t))].join('\n\n');

/** Toetsaanpak met fasekoppen, zonder het verwachte bewijs (dat staat in de kolom ernaast). */
export function rcmToetsaanpak(material, value) {
  if (!fasen(material).length || value !== standaard(material)) return value;
  return fasen(material).map(([fase, t]) => `${fase}: ${splits(t).aanpak}`).join('\n\n');
}
/** Documenten / verificatie met fasekoppen, als de cel het verwachte bewijs van de fasen is. */
export function rcmBewijs(material, value) {
  const f = fasen(material);
  if (!f.length) return value;
  const bewijs = f.map(([fase, t]) => [fase, splits(t).bewijs]).filter(([, b]) => b);
  if (String(value ?? '').trim() !== [...new Set(bewijs.map(([, b]) => b))].join('\n\n')) return value;
  return bewijs.map(([fase, b]) => `${fase}: ${b}`).join('\n\n');
}
