// Presentation only. Never apply this to norm text, quotations, source pages,
// evidence offsets or stored project data.
const phrases = [
 ['De gekoppelde Wwke-bepaling draagt de beschreven wettelijke taak, bevoegdheid of voorwaardelijke uitvoeringsnorm. De exacte bijdrage staat in supported_clause en explanation; deze relatie geeft geen wettelijke status aan de afzonderlijke audit- of beheersvoorstellen.', 'Deze wetsbepaling onderbouwt de hierboven beschreven taak, bevoegdheid of verplichting. De uitleg bij dit toetspunt laat zien welk deel op deze bepaling berust. De voorgestelde beheersmaatregelen en toetsaanpak zijn daarmee niet zelf wettelijk voorgeschreven.'],
 ['De eigen normclausule is in gewone taal weergegeven; het precieze citaat blijft afzonderlijk DIRECT_SOURCE.', 'Het toetspunt is in eigen woorden beschreven. Het letterlijke citaat uit de bron blijft apart beschikbaar.'],
 ['Deze bronrelatie draagt alleen de benoemde clausule of contextbijdrage. De zelfstandige puntstatus en eventuele externe verificatiegrens blijven bepalend.', 'Deze bron onderbouwt alleen het hierboven beschreven onderdeel. Of je het toetspunt kunt selecteren en welke aanvullende bronnen je moet controleren, staat bij de voorwaarden en open bronvragen.'],
];
const terms = {
 supported_clause:'het onderbouwde onderdeel', explanation:'de uitleg bij de bron',
 DIRECT_SOURCE:'letterlijk uit de bron', EXPLANATORY_CONTEXT:'toelichting bij de bron',
 CONTEXT_ONLY:'alleen achtergrondinformatie', XML_ONLY:'alleen beschikbaar in de geconsolideerde tekst',
 HOLD:'nog niet selecteerbaar vanwege een open bronvraag',
};
export function lawReaderText(text='') {
 let result=text;
 for(const [original,readable] of phrases)result=result.replaceAll(original,readable);
 return result.replace(/\b(supported_clause|explanation|DIRECT_SOURCE|EXPLANATORY_CONTEXT|CONTEXT_ONLY|XML_ONLY|HOLD)\b/g,term=>terms[term]);
}
export function lawBasisLabel(code) {
 return ({W:'Wettelijke grondslag',A:'Afgeleid uit de bron'})[code]||`Grondslag ${code}`;
}
