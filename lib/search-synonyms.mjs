// Zoektermen die auditors gebruiken, ook als de bron andere woorden kiest (testronde 20-11, B4): "MFA" vindt sterke
// authenticatie, "versleuteling" vindt encryptie en cryptografie. Alleen een zoekhulp: de brontekst verandert niet.
// Alles in de vorm van searchText (kleine letters, zonder accenten, streepje wordt spatie); het zijn woordbegins.
const GROUPS = [
  ['mfa', '2fa', 'multifactor', 'multi factor', 'meerfactor', 'tweefactor', 'sterke authenticatie', 'authenticatiemechanism'],
  ['wachtwoord', 'password', 'authenticatie', 'inloggegevens'],
  ['versleutel', 'encryptie', 'encryption', 'cryptografi', 'sleutelbeheer'],
  ['logging', 'logboek', 'logbestand', 'audit trail', 'registratie van gebeurtenissen'],
  ['back up', 'backup', 'reservekopie'],
  ['pentest', 'penetratietest', 'tlpt'],
  ['patch', 'beveiligingsupdate', 'software update'],
  ['outsourcing', 'uitbested', 'ict dienstverlener'],
  ['bcp', 'bedrijfscontinuiteit', 'continuiteitsplan', 'continuiteitsbeleid'],
  ['sla', 'service level', 'dienstverleningsniveau'],
  ['exit', 'exitstrateg', 'exitplan', 'beeindiging'],
  ['phishing', 'social engineering'],
  ['malware', 'kwaadaardige', 'schadelijke code'],
];

/** De woorden waarop een zoekterm ook mag treffen (de term zelf voorop). */
export function searchAlternatives(term) {
  const t = String(term ?? '').trim();
  if (t.length < 3) return [t];
  const group = GROUPS.find(words => words.some(word => t === word || (t.length >= 4 && (t.startsWith(word) || word.startsWith(t)))));
  return group ? [t, ...group.filter(word => word !== t)] : [t];
}
/** Bevat de tekst de term of een van zijn alternatieven? */
export const matchesTerm = (text, term) => searchAlternatives(term).some(word => text.includes(word));
