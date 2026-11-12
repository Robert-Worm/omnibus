// Samenhang met andere kaders, kort en met de reden erbij (besluit beheerder 12 november 2026).
// Voor "Over dit kader" > "Toepassing in je onderzoek". De verwijzingen per norm staan onder "Verwant".
import {doraUitwerkingen, uitgewerktVanuit} from './dora-uitwerkingen.mjs';
import {noreaVerwant} from './norea-verwant.mjs';

const NOREA = 'NOREA-DORA-3-2';
const opsomming = delen => delen.length < 2 ? delen.join('') : delen.slice(0, -1).join(', ') + ' en ' + delen.at(-1);

/** Per verwant kader één regel: {id, label, reason}. */
export function frameworkRelations(sourceId) {
  const uit = [];
  // Van DORA naar de regelingen die een groep uitwerken.
  const perRegeling = new Map();
  for (const [groep, lijst] of Object.entries(doraUitwerkingen[sourceId] ?? {}))
    for (const u of lijst) {
      if (!perRegeling.has(u.id)) perRegeling.set(u.id, {label: u.label, groepen: [], grondslagen: new Set()});
      perRegeling.get(u.id).groepen.push(groep); perRegeling.get(u.id).grondslagen.add(u.grondslag);
    }
  for (const [id, r] of perRegeling)
    uit.push({id, label: r.label, reason: `Werkt ${r.groepen.length === 1 ? `de groep ‘${r.groepen[0]}’` : `${r.groepen.length} groepen`} verder uit (${opsomming([...r.grondslagen])}). Gebruik dit kader als je de eis in detail wilt toetsen.`});
  // Andersom: de groepen van DORA die dit kader uitwerkt.
  const vanuit = uitgewerktVanuit(sourceId);
  if (vanuit.length)
    uit.push({id: vanuit[0].sourceId, label: 'DORA: digitale operationele weerbaarheid',
      reason: `Dit kader werkt ${vanuit.length === 1 ? `de groep ‘${vanuit[0].groep}’` : `${vanuit.length} groepen`} van DORA verder uit (${opsomming([...new Set(vanuit.map(v => v.grondslag))])}). De verplichting zelf staat in DORA.`});
  // NOREA en de regelingen met normen over hetzelfde onderwerp.
  if (sourceId === NOREA) {
    const per = new Map();
    for (const r of noreaVerwant) { if (!per.has(r[2])) per.set(r[2], {label: r[3], n: new Set()}); per.get(r[2]).n.add(r[0]); }
    for (const [id, r] of per) uit.push({id, label: r.label, reason: `${r.n.size} ${r.n.size === 1 ? 'control gaat' : 'controls gaan'} over hetzelfde onderwerp als een norm in deze regeling. De regeling is de wettelijke bron; NOREA is een uitwerking daarvan.`});
  } else {
    const n = new Set(noreaVerwant.filter(r => r[2] === sourceId).map(r => r[4])).size;
    if (n) uit.push({id: NOREA, label: 'NOREA DORA in Control', reason: `Bij ${n} ${n === 1 ? 'norm' : 'normen'} is er een NOREA-control over hetzelfde onderwerp. Handig als je een beheersmaatregel zoekt bij de wettelijke eis.`});
  }
  return uit;
}
