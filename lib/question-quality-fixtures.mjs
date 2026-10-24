// Vaste set slechte vragen: deze moeten altijd worden afgekeurd (nooit 'door').
// De eerste is de vraag die Omnibus vroeger zelf maakte voor een toetspunt zonder vraag.
/** @type {Array<[string, string, string[]]>} */
export const SLECHTE_VRAGEN = [
  ["interview", "Hoe krijgt het toetspunt ‘Overdracht van voorzieningen’ in de praktijk vorm? Wat is uw eigen rol? Beschrijf een concrete situatie en wat daarin wel of niet lukte.", ["meer-vragen", "technisch"]],
  ["interview", "Hoe zijn de verantwoordelijkheden verdeeld en hoe volgt u de uitvoering en eventuele bijsturing?", ["samengesteld"]],
  ["interview", "Vraag nog uit te werken", ["leeg"]],
  ["interview", "", ["leeg"]],
  ["interview", "Wordt het informatiebeveiligingsbeleid jaarlijks geëvalueerd?", ["gesloten"]],
  ["interview", "Heeft u een overzicht van alle verwerkingen?", ["gesloten"]],
  ["interview", "Bent u het ermee eens dat de sturing op het programma tekortschiet?", ["sturend"]],
  ["interview", "Waarom ontbreekt een actueel risicoregister?", ["sturend"]],
  ["interview", "Hoe goed werkt de samenwerking met de CISO?", ["sturend"]],
  ["toetsvraag", "Beoordeel of de CISO formeel is aangesteld.", ["opdracht"]],
  ["toetsvraag", "Controleer of het register volledig is?", ["opdracht"]],
  ["toetsvraag", "Hoe is C26-P-014 belegd in de organisatie?", ["technisch"]],
  ["onderzoeksvraag", "Hoe wordt ${topic} bestuurd?", ["technisch"]],
  ["onderzoeksvraag", "Hoe wordt {{organisatie}} bestuurd?", ["technisch"]],
  ["interview", "Kunt u beschrijven hoe de afdeling in de afgelopen twee jaar, mede gelet op de reorganisatie, de nieuwe werkwijze en de verwachtingen van het bestuur, de risico’s rond informatiebeheer heeft herkend, besproken en opgevolgd?", ["te-lang"]],
];
