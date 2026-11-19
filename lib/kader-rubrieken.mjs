// Uitleg per kader in de Excel-export (panel 19 november 2026, B-082). De kaderbrede alinea's in de broncontext hebben
// koppen die plaatsen in de bron zijn, geen vaste rubrieken; daardoor zag elk kader er anders uit. Deze tabel deelt elke
// bekende kop in bij een van vier vaste rubrieken, met een leesbare kop. Een nieuwe kop valt in het vangnet en laat de
// test falen, zodat de redactie er bewust een plek voor kiest. De brondata veranderen niet.

export const RUBRIEKEN = [['wie', 'Voor wie en wanneer'], ['zelf', 'Wat je zelf vaststelt'], ['open', 'Niet uitgewerkt of eigen uitleg'], ['bron', 'Bron, versie en rechten']];

/** Bestaande kop → [rubriek, nieuwe kop ('' = geen subkop), soort]. Soort bij rubriek open: niet | uitleg; bij voorstellen: voorstel. */
export const INDELING = new Map([
  ["Wat staat in een ander kader",["wie","Andere kaders in Omnibus"]],
  ["Editie en ingang",["wie","Ingangsdatum"]],
  ["Beroepskader, geen afzonderlijke wet",["wie","Beroepsregel, geen wet"]],
  ["Beroepsvereiste, geen zelfstandige wet",["wie","Beroepsregel, geen wet"]],
  ["Geen algemene leverancierswet",["wie","Geen wet voor leveranciers"]],
  ["Scope is relationeel",["wie","Welke relaties eronder vallen"]],
  ["Uitzonderingen op aanwijzing en groepen",["wie","Uitzonderingen en groepen"]],
  ["Onderdelen niet door elkaar gebruiken",["wie","Onderdelen staan los van elkaar"]],
  ["Geen extra bevoegdheden",["wie","Geen extra bevoegdheden"]],
  ["Wettelijke termijnen gaan voor",["wie","Wettelijke termijnen gaan voor"]],
  ["Uitbesteding en auditrechten",["wie","Uitbesteding en auditrechten"]],
  ["Per onderzoek vast te stellen",["zelf",""]],
  ["Vast te stellen vóór toepassing",["zelf",""]],
  ["Niet vastgesteld in dit kader",["zelf","NIS 2, feestdagen en besluiten"]],
  ["Groepen en andere regels",["zelf","Groep en andere regels"]],
  ["Andere regels en gegevens van het geval",["zelf","Andere regels en gegevens van het geval"]],
  ["Nationale omzetting niet vastgesteld",["zelf","Nationale omzetting"]],
  ["Criteria uit andere regelingen",["zelf","Criteria uit andere regels"]],
  ["Aanvullende normen kunnen nodig zijn",["zelf","Aanvullende normen"]],
  ["Categorie, bevoegde autoriteit en ASI-score",["zelf","Categorie, autoriteit en ASI-score"]],
  ["Verwijzingen naar sectorregels",["zelf","Sectorregels"]],
  ["Werking over een periode",["zelf","Werking over een periode"]],
  ["Bewijs en oordeel",["zelf","Bewijs en oordeel"]],
  ["Toetsaanpak en bewijs",["zelf","Bewijs en oordeel"]],
  ["Geen automatisch oordeel over conformiteit",["zelf","Geen automatisch oordeel"]],
  ["Contractvoorbeelden zijn niet allemaal verplicht",["zelf","Voorbeelden zijn geen plicht"]],
  ["ISO-verwijzingen en testvoorbeelden",["zelf","Voorbeelden zijn geen plicht"]],
  ["COSO-verwijzing",["zelf","COSO-overzicht is geen bewijs"]],
  ["Niet uitgewerkte bepalingen",["open","Artikel 12, lid 2, onder b, en artikel 21, tweede alinea","niet"]],
  ["Aanvullende mogelijkheid in artikel 10",["open","Artikel 10, laatste zin","niet"]],
  ["Percentages en aantallen: bron niet eenduidig",["open","Velden 3.5, 3.7 en 3.10","niet"]],
  ["Wanneer en hoe een veld wordt ingevuld",["open","Velden 3.34, 4.10 en 4.11 en bijlage IV, veld 3","niet"]],
  ["Actualisering van de risicobeoordeling",["open","Artikel 9, lid 3","niet"]],
  ["Groep, uitbesteding en moederonderneming",["open","Model B_01.02 en veld B_01.02.0060","niet"]],
  ["Valuta en identificatiecodes",["open","Valuta, LEI en EUID","niet"]],
  ["Bijlage VIII, onderdeel a, vi, punt 2",["open","Bijlage VIII, onderdeel a, vi, punt 2","niet"]],
  ["Onderdelen die niet zijn uitgewerkt",["open","Artikel 2, lid 4, artikel 5, leden 3 en 4, en de ASI-score","niet"]],
  ["Termijnen en data die niet zijn uitgewerkt",["open","Artikel 31, lid 5, en artikel 43, lid 2","niet"]],
  ["Verwijzingen en andere onduidelijke plaatsen",["open","Artikelen 35, 36, 38 en 41","niet"]],
  ["Terugvalregels voor de omzet",["open","Omzet: drie terugvalregels","niet"]],
  ["Termijnen en rente",["open","Betaaltermijn en rente","niet"]],
  ["Artikel 1, onder i",["open","Artikel 1, onder i","niet"]],
  ["Verwijzing in artikel 3, lid 1",["open","Artikel 3, lid 1","niet"]],
  ["Bijlagevelden 6 en 7 en diensttypen",["open","Bijlage, velden 6 en 7","niet"]],
  ["Drie taken niet uitgewerkt",["open","Drie taken van het team","niet"]],
  ["Regelingen in artikel 5, lid 4",["open","Artikel 5, lid 4","niet"]],
  ["Onderdelen waar de bron niet eenduidig is",["open","Nalevingsmelding, voetnoot 6 en ontwerp-RTS","niet"]],
  ["Groepsherstel en groepsafwikkeling",["open","Groepsherstel en groepsafwikkeling","niet"]],
  ["Wat niet is onderzocht",["open","Doelgroep, definities en classificatie","niet"]],
  ["Wat niet is opgenomen",["open","Niet opgenomen documenten","niet"]],
  ["Onduidelijke passages in de bron",["open","Controls met een regel ‘Let op’","niet"]],
  ["Bekende fout in twee casussen",["open","Bijlage B, beheersing G","niet"]],
  ["Afwijkende herhalingen",["open","Herhalingen die afwijken van de hoofdtekst","niet"]],
  ["Wie informatie verstrekt onder artikel 30, lid 3, onder e, punt iv",["open","Artikel 30, lid 3, onder e, iv","niet"]],
  ["Opleiding en testprogramma bij het vereenvoudigde kader",["open","Artikel 16 en 24: opleiding en testen","uitleg"]],
  ["Verwijzing naar EMIR bij transactieregisters",["open","Artikel 46, onder h: verwijzing naar EMIR","uitleg"]],
  ["Verwijzing in artikel 8, lid 2, onder c",["open","Artikel 8, lid 2, onder c","uitleg"]],
  ["Verwijzing naar de classificatieregels",["open","Verwijzing naar de classificatie","uitleg"]],
  ["Gegevens over de entiteit in artikel 6",["open","Artikel 6: gegevens over de entiteit","niet"]],
  ["Verwijzingen naar DORA en andere regelingen",["open","Verwijzingen naar DORA","uitleg"]],
  ["Frequentie van rapportage",["open","Frequentie van rapportage","uitleg"]],
  ["Contractpartij in artikel 4, lid 1, onder h",["open","Artikel 4, lid 1, onder h","uitleg"]],
  ["Wijzigingen in de regelingen (artikelen 5 en 6)",["open","Artikel 5, lid 3, en artikel 6, onder b","uitleg"]],
  ["Onvolkomenheden in de Nederlandse tekst",["open","Fouten in de Nederlandse tekst","uitleg"]],
  ["Artikel 6, lid 2",["open","Artikel 6, lid 2","uitleg"]],
  ["Scenarioselectie",["open","Scenarioselectie","uitleg"]],
  ["Aan welk jaar kosten worden toegerekend",["open","Punt 5: aan welk jaar je kosten toerekent","uitleg"]],
  ["Eerdere incidenten, correcties en terugvorderingen",["open","Eerdere incidenten, correcties en terugvorderingen","uitleg"]],
  ["Bedragen en valuta",["open","Bedragen en valuta","uitleg"]],
  ["Geconsolideerde tekst niet opnieuw gecontroleerd",["bron","Nieuwste versie niet gecontroleerd"]],
  ["Inwerkingtreding en latere wijzigingen",["bron","Latere wijzigingen niet gecontroleerd"]],
  ["Oorspronkelijke publicatie",["bron","Latere wijzigingen niet gecontroleerd"]],
  ["Actualiteit van de tekst",["bron","Latere wijzigingen niet gecontroleerd"]],
  ["Franse rectificatie",["bron","Franse rectificatie niet verwerkt"]],
  ["Nederlandse vertaling",["bron","Vertaling"]],
  ["Nederlandse vertaling en rechten",["bron","Vertaling en rechten"]],
  ["Rechten en broneditie",["bron","Rechten"]],
  ["Auteursrecht",["bron","Rechten"]],
  ["Weergave van het werkboek",["bron","Hoe het werkboek is overgenomen"]],
  ["Review",["bron","Hoe de uitwerking is gecontroleerd"]],
  ["Voorstellen van Omnibus",["zelf","","voorstel"]],
  ["Voorstellen van Omnibus en bewijs",["zelf","","voorstel"]],
  ["Eigen toetsuitwerking",["zelf","","voorstel"]],
  ["Eigen praktische uitwerking",["zelf","","voorstel"]],
  ["Eigen uitwerking, geen officiële tekst",["zelf","","voorstel"]],
  ["Voorstellen van Omnibus en verhouding tot de wet",["zelf","Verhouding tot de wet","voorstel"]],
]);

// Zinnen die de vaste regel "Over de uitwerking" al zegt. Ze vallen weg uit de alinea's; blijft er niets over, dan vervalt de alinea.
export const STANDAARDZINNEN = [
  /Doelen, risico[’']s, beheersmaatregelen, toetsaanpak en vragen zijn voorstellen van Omnibus[^.]*\./gu,
  /Een toetspunt kiezen betekent niet dat de regel op jouw organisatie van toepassing is; dat stel je zelf per onderzoek vast\./gu,
  /Een selectie bevestigt niet dat de regels? gelden[^.]*\./gu,
  /Stel zelf vast of de regels op je organisatie van toepassing zijn\./gu,
];
// Een zin die naar een weggevallen standaardzin terugwees, krijgt een eigen onderwerp.
const rest = tekst => STANDAARDZINNEN.reduce((t, zin) => t.replace(zin, ''), tekst).replace(/\s{2,}/gu, ' ').trim()
  .replace(/^Dat geldt ook voor de vraag (.+)$/u, 'Stel ook zelf vast $1');

/** Is deze kop bekend? Zo niet, dan valt hij in het vangnet. */
export const bekendeKop = titel => INDELING.has(titel);

/** Eén regel in het blok: "Kop (niet uitgewerkt): tekst", of alleen de tekst als er geen kop is. */
export const regelTekst = ({kop, tekst, soort}) => kop ? `${kop}${soort === 'niet' ? ' (niet uitgewerkt)' : soort === 'uitleg' ? ' (uitleg van Omnibus)' : ''}: ${tekst}` : tekst;

/** Eén kaderbrede alinea → {rubriek, kop, tekst, soort?}, of null als er na het weghalen van standaardzinnen niets overblijft. */
export function deel(titel, tekst) {
  const vast = INDELING.get(titel);
  // Vangnet: een plaats in de bron of "niet uitgewerkt" hoort bij rubriek open, de rest bij zelf. De kop blijft staan.
  const [rubriek, kop, soort] = vast ?? [/\b(artikel|lid|veld|bijlage)\b|niet uitgewerkt|eenduidig/iu.test(titel) ? 'open' : 'zelf', titel, ''];
  let inhoud = soort === 'voorstel' ? rest(tekst) : String(tekst).trim();
  if (!inhoud) return null;
  return {rubriek, kop, tekst: inhoud, ...(soort === 'niet' || soort === 'uitleg' ? {soort} : {})};
}

/** De vaste regel die altijd onder de versietabel staat als er kaders met kaderbrede uitleg zijn gekozen. */
export const VASTE_REGEL = 'Omnibus stelde de doelen, risico’s, beheersmaatregelen, toetsaanpak en vragen op uit de bron. AI heeft ze beoordeeld; er is geen menselijke goedkeuring. Of een regel voor de organisatie geldt, stel je zelf vast.';
