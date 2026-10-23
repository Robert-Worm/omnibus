import {wwkeCatalogue,wwkePoints,wwkePointContext,wwkeMatches} from './wwke-law-data.mjs';
import {wwkeBrowseInventory,wwkeBrowseRows} from './wwke-browse-core.mjs';
import {readableWwkeCriterion} from './wwke-readable-criteria.mjs';

export const lawBrowserColumns=[{id:'objective',title:'Doel'},{id:'risk',title:'Risico'},{id:'controlObjective',title:'Beheersdoelstelling'},{id:'control',title:'Beheersmaatregel'}];
// Reading groups describe work, not legal applicability or a transfer of duties.
// Chapters remain source locators; the original addressed roles stay on each point.
export const wwkeBrowserGroups=[
 {id:'weerbaarheid',title:'Weerbaarheid en continuïteit',description:'Risicobeoordeling, zorgplicht, incidentmelding en contact rond kritieke entiteiten.',criteria:[6,7,9,10]},
 {id:'aanwijzing',title:'Aanwijzing en ondersteuning',description:'Aanwijzing, sectorale risico-informatie en ondersteuning door vakministers en bevoegde autoriteiten.',criteria:[2,3,4]},
 {id:'coordinatie',title:'Coördinatie en informatie-uitwisseling',description:'Nationale coördinatie, samenwerking, gegevensroutes en vertrouwelijkheid.',criteria:[5,11,12]},
 {id:'toezicht',title:'Toezicht en handhaving',description:'Toezicht, opgelegd onderzoek, aanwijzingen, bestuursdwang en boetes.',criteria:[13,14]},
 {id:'regelgeving',title:'Regelgeving en verantwoording',description:'Uitvoeringsregels, voorhang, verslaglegging en evaluatie.',criteria:[15,16]},
 {id:'broncontext',title:'Begrippen en wettelijke reikwijdte',description:'Leeswijzer bij de bron; geen zelfstandige uitvoeringsnormen.',criteria:[1]},
 {id:'leveranciers',title:'Leveranciers en nationale veiligheid',description:'Open bronvragen over leveranciersinterventies en alternatievenbeoordeling.',criteria:[8]},
].map(g=>({...g,criteria:g.criteria.map(n=>'WWA-C-'+String(n).padStart(4,'0'))}));
const source={points:wwkePoints,criteria:wwkeCatalogue.criteria,contextFor:wwkePointContext,matches:wwkeMatches,criterionText:readableWwkeCriterion};
export function wwkeBrowserInventory(filters={},selectedIds=[]){
 return wwkeBrowseInventory(source,filters,selectedIds);
}
// A browse projection only: never rewrite parent criteria, point text, source
// relationships or the immutable reviewed package. Filtering narrows children
// and their context together; it never determines legal applicability.
export function wwkeBrowserRows(filters={},selectedIds=[]){
 return wwkeBrowseRows(source,wwkeBrowserGroups,filters,selectedIds);
}
