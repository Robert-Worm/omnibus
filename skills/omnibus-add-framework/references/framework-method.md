# Kaders: inhoud en kwaliteitsgrenzen

Deze werkinstructie maakt de CIO-contractbasis overdraagbaar. Frozen contracten,
reviewbestanden en ontvangsten blijven ongewijzigd. CIO/WWKE zijn voorbeelden
voor de adapter en viewer, geen bewijs voor de inhoud van een nieuwe bron.

## Bronbank

Lees de volledige tekst en alle beelden, tabellen, bijlagen en toelichting.
Bronlezers A/B zien vóór bevriezing geen elkaars resultaten of bestaande
praktische catalogus. De reconciliator leest zelf de volledige bron, verantwoordt
ieder eerste record en zoekt gezamenlijke omissies. Log daadwerkelijke lezingen.

Bronrecords behouden stabiele ID, locator, titel, normative_kind, exacte spans,
actors met rol/voorwaarde, getrouwe assertion, conditions, exceptions,
cross_references, bronstatus en interpretatie-notities. Gebruik de bestaande
broncontractwaarden; hernoem ze niet om zichtbare productlabels gelijk te trekken.
Leg brondekking vast ook waar geen selecteerbaar toetspunt volgt.

Een bronspan heeft exacte pagina, start/eind en quote. Leg coördinatenstelsel
vast: codepoints, nulgebaseerd, eind exclusief; pagina-lokaal of documentbreed.
Bewaar SHA-256 van de exacte teksteditie. `lawReaderPassages` controleert de
omzetting. Geen Unicode-normalisatie, OCR-herstel of latere consolidatie onder
dezelfde bronhash. XML-passages krijgen geen verzonnen PDF-markering.

Onderscheid hoofdtekst en toelichting, normadressaat en uitvoerende taakdrager,
kan en moet, optionele en verplichte rollen, inwerkingtreding en publicatiedatum.
Bevoegdheden zijn geen plichten. Definities/voorwaarden kunnen nodig zijn voor
de betekenis zonder zelf een selecteerbare norm te worden. Controleer betekenis
van verwijzingen; repareer een bronintern probleem niet stilzwijgend.

## Praktische catalogus

Behoud de bestaande doelen/doelstellingen/normen/toetspuntenstructuur. Per punt:
oudernorm, titel/tekst, basis, doelrelaties, adressaten, scope, voorwaarden,
uitzonderingen, interpretatiestatus, selectiestatus en concrete herleiding.
Iedere bronrelatie vermeldt ondersteunde clausule en bijdrage: primary,
definition, scope, condition, exception, qualification of explanation.
Bronparafrase, synthese en eigen toetsuitwerking zijn verschillend.

Gebruik `SELECTABLE`, `CONTEXT_ONLY` of `HOLD` met reden. Een beperkte norm met
expliciete externe afhankelijkheid kan beoordeeld worden; ontbrekende
betekenisdragende onderbouwing wordt niet aangevuld met een verzonnen eis.
Doel-/risico-/maatregelvoorstellen worden als analytische toevoeging bewaard.
Groepen volgen begrijpelijke inhoud/rollen/beheersdoelen, niet uitsluitend
hoofdstuknummers. Meerdere groepen of vraagrelaties dupliceren geen toetspunt.

Maak Over dit kader specifiek: waarvoor het kader bruikbaar is, voor welke
organisaties/rollen, hoe het ontstond, officiële broneditie, scope en bruikbare
bronbeperkingen. Filters zijn navigatiehulp, geen toepasselijkheidsbesluit.
Opzet en bestaan hebben zelfstandige instructies en passend bewijs. Werking
krijgt geen verzonnen periode/populatie/steekproef of fictieve conclusie.

### Complete beheersketen

Voor iedere selecteerbare norm zijn doel, risico, beheersdoelstelling en
beheersmaatregel verplicht. Dit is een eis aan de praktische Omnibus-uitwerking,
niet een claim dat de bron die vier velden letterlijk bevat. Context-only
definities en afbakeningen worden niet kunstmatig tot normen gemaakt.

1. Lees norm, bronpassage en toepassingscontext. Gebruik het relevante risico
   uit de bron of een gemotiveerde risicoafleiding; kopieer niet automatisch een
   historisch rapportprobleem naar iedere onderzochte organisatie.
2. Formuleer het **doel** als het beoogde resultaat. Formuleer de
   **beheersdoelstelling** als de gewenste toestand die de oorzaak of het gevolg
   van dat risico begrenst. Die mag worden gegenereerd op basis van het risico,
   ook als de bron geen afzonderlijke beheersdoelstelling noemt.
3. Formuleer de **beheersmaatregel** als een concrete, proportionele interventie
   waarmee die toestand wordt bereikt of bewaakt. Behoud de juiste actor,
   aanleiding, voorwaarden en bevoegdheidsgrenzen. Voeg geen onbevestigde
   termijn, systeemkeuze, vaste frequentie of documentplicht toe.
4. Bewaar eigen doel-/risico-/beheersuitwerkingen als `ANALYST_PROPOSAL` met
   bron-/normverwijzing en een korte reden waarom de afleiding het risico
   adresseert. Toon ze als voorstel, niet als citaat, geldende verplichting of
   bewijs dat een organisatie de maatregel al uitvoert. De norm blijft ongewijzigd.
5. Beoordeel met OAK-1.0 brontrouw, doel, risico, beheersdoelstelling,
   beheersmaatregel en hun samenhang met norm en toetsen. Het beheersdoel is
   geen handeling; de maatregel is geen herhaling van de gewenste toestand.
   Geen lege waarden, placeholders, louter omgekeerd risico of generieke
   'zorg voor goede beheersing'. Bij onvoldoende onderbouwing: herstel/HOLD,
   nooit stilzwijgend toelaten met een leeg veld.

Fictief voorbeeld: risico 'onbevoegd verstrekte toegang maakt vertrouwelijke
informatie toegankelijk voor derden'; beheersdoel 'toegang is beperkt tot
personen met een goedgekeurde taakgebonden behoefte'; maatregelvoorstel 'laat
de verantwoordelijke rol toegangsaanvragen beoordelen op de taakbehoefte en
pas verleende rechten aan wanneer die behoefte vervalt'. Dit is een ontwerp-
voorbeeld, geen extra wettelijke eis of vaste inrichting voor ieder kader.

Controleer bij de overdracht per selecteerbare norm de volledige keten en
dezelfde waarden in viewer, selectie/opgeslagen project en export. Een adapter
mag aangeleverde velden niet op leeg zetten. Bij de flat-adapter heten ze
`objective`, `risk`, `controlObjective` en `control`; scope blijft `sourceContext`,
niet het doel. Voer `validateFlatFoundationChain` uit vóór toelating/publicatie;
de structuurcontrole vervangt geen bron-, kader- of praktische beoordeling.
Een beperkt historisch herstelbesluit zonder beoordeling van de beheersketen
is geen volledige toelating. Behoud bevroren oude contracten en reviewbesluiten;
leg de aanvullende ketenreview vast op de nieuwe exacte inhoudsbasis.

### Lessen uit de tekstgerichte CIO-review

Controleer gedeelde doelen, beheersdoelstellingen en overkoepelende normen tegen ieder gekoppeld
taaktype. Een incidentvoorwaarde past niet automatisch bij algemene aanwijzingen
of escalatieadvies. Laat het afgeleide resultaat en de beheersvoorwaarde de hele
groep dekken, maar behoud voorwaarden en bevoegdheden per toetspunt. Beoordeel
bij een gedeelde correctie ook de doorwerking op eerder beoordeelde ketens.
Een WWKE-keten over aanwijzingen kan bijvoorbeeld ook lijstbeheer en ontheffingen
bevatten; laat die bestaande taken niet buiten de ouderbeschrijving vallen.

Behoud ook in de toetsactie de juridische verhouding uit de bron: rechtstreeks
ressorteren is niet zonder meer hetzelfde als rechtstreeks rapporteren. Een
rapportageroute kan bewijs bijdragen, maar vervangt de vereiste positionering niet.

Behoud bij samengevoegde bepalingen de koppeling tussen handeling en object.
Ontwikkeling en coördinatie van beleid zijn bijvoorbeeld niet hetzelfde als
ontwikkeling en beheer van ICT-voorzieningen. Laat een handeling niet verdwijnen
uit de toetsactie doordat de bewijsvoorbeelden haar nog wel noemen; pas ook niet
automatisch alle werkwoorden op alle objecten toe.

Laat betekenisdragende werkwoorden ook terugkomen in de actuele herleiding.
Als het toetspunt spreekt van bijdragen aan een resultaat, mag de ondersteunde
clausule niet alsnog volledige resultaatverantwoordelijkheid suggereren.
Behoud ook de concrete handeling waaraan wordt bijgedragen: bijdragen aan het
opstellen van beleid is specifieker dan bijdragen aan beleid.
Corrigeer de afgeleide clausuletekst, niet het oorspronkelijke bronrecord of citaat.

Verbind een voorwaardelijke keuze aan de feitelijke invulling. Toets bijvoorbeeld
alleen bij een gebruikte Chief-titel of aard en belang van de rol die aanduiding
rechtvaardigen. Een bewijssoort noemen is nog geen instructie om die voorwaarde
te beoordelen; facultatieve invulling blijft facultatief.

Maak de juridische maatstaf niet smaller door een mogelijk bewijsstuk tot eis
te verheffen. Deel uitmaken van de hoogste ambtelijke leiding is de maatstaf;
een ledenlijst kan dat aantonen, maar maakt een collegiaal ledenorgaan niet verplicht.

Behoud bij beoordeling voor leren en eventuele aanpassing zowel het leerdoel
als het eventuele karakter. Vraag niet vanzelf om een afzonderlijk gemotiveerd
besluit tot aanpassen of niet-aanpassen als de bron dat niet voorschrijft.

Laat een externe maatstaf ook in de toetsactie doorwerken, niet alleen in een
algemene bronbeperking. Vergelijk bijvoorbeeld het gevoerde overleg met de
afzonderlijk vastgestelde toepasselijke bepaling; vul ontbrekende externe
vereisten niet zelf in. Een toepasselijkheidsoverzicht selecteert de normbasis,
maar vervangt niet de inhoudelijke vergelijking met die basis. Als de bron
samenhang eist, vergelijk beleid en processen ook onderling, zonder hiervoor
een nieuw verplicht bewijsdocument te introduceren.

Verbind bij toezicht met rapportage de beoordeling aan de toegepaste maatstaf
en aan de gerapporteerde uitkomst. Alleen vaststellen dat een beoordeling en
een rapportage aanwezig zijn, toetst die samenhang niet. Verzin daarbij geen
inhoud voor een externe maatstaf en geen extra documentplicht.

### Lessen uit de tekstgerichte WWKE-review

Toets het voorgeschreven handelen, niet alleen de beschikbaarheid van een aanbod.
Als ondersteuning, samenwerking en uitwisseling van informatie én beste praktijken
zijn voorgeschreven, onderzoek die in een concreet geval. Een kennisaanbod alleen
toont de uitwisseling niet aan; een concreet geval bewijst geen duurzame werking.

Behoud het verschil tussen alternatieven identificeren, ermee rekening houden
en ze beschikbaar hebben. Bij herstelmaatregelen kunnen aanwezige voorzieningen
en de identificatie/afweging van alternatieve toeleveringsketens verschillende
toetsobjecten zijn. Maak van die laatste geen algemene beschikbaarheids- of
contracteis.

Bewaar de sterkte van tijdsbepalingen in iedere tekstlaag, ook in een analytische
beheersmaatregel: zonder onnodige vertraging is niet hetzelfde als onmiddellijk.
Koppel een specifieke beschermingsclausule aan de informatieroute waarop zij
betrekking heeft. Een waarborg dat informatie vertrouwelijk kan worden gehouden
wordt niet automatisch een algemene geheimhoudingsplicht voor alle routes.

Behoud zelfstandige besluiten ook in verkorte doelgroepteksten. Een opdracht
tot onderzoek en een opdracht tot resultaatverstrekking hebben ieder hun eigen
trigger; “als ook” kan ten onrechte een voorafgaand onderzoeksbesluit suggereren.
Bevat de keten zowel rechtmatig gebruik van een bevoegdheid als uitvoering van
het opgelegde besluit, laat risico en beheersdoelstelling beide kanten dragen.

Bewaar de wettelijke eindhandeling: evalueren is niet hetzelfde als het verslag
aan de voorgeschreven ontvanger zenden. Voorbereiding kan vóór de termijn
relevant bestaansbewijs zijn, maar vervangt na die termijn het vereiste resultaat
en de verzending niet. Actie en verwacht bewijs moeten dezelfde tijdsgrens volgen.
Maak ook van “tweemaal per jaar” niet ongemerkt “ieder halfjaar”.

Beschrijft een keten verplichte én facultatieve regelstelling, onderscheid dan
ontbrekende verplichte uitwerking van onrechtmatig gebruik van een bevoegdheid.
Neem beide in risico en beheerstoestand mee, zonder de facultatieve grondslagen
tot een vaststellingsplicht te maken.

## Review, reparatie en handoff

Bewaar concept en hersteloverzicht. Bron-, juridisch/kader- en praktische
eindreview zijn drie werkelijk onafhankelijke reviewerrollen; geen auteur keurt
eigen praktische reparaties goed. Bronreviewer is ook geen oorspronkelijke
bronlezer/reconciliator. Bind reviews aan dezelfde exacte eindbestanden en alle
afhankelijkheden. Beoordeel ieder punt, iedere norm/doelstelling, relevante
relaties, volledige brondekking en gemotiveerde uitsluitingen. Generic APPROVE
of een score vervangt geen objectgebonden inhoudelijke redenen.

Negatieve gevallen: minister versus functionaris; kan versus moet; definitie
versus plicht; optionele rol; voorwaardelijke taak; afwijkingsroute; verloren
uitzondering; toelichting als nieuwe plicht; verkeerde broneditie; ongefundeerde
combinatie of splitsing. Test ook partial selection, bronnenwissel, exact gemarkeerde
passages, oude projecten en exports na adapterconversie.

Materiële fouten blokkeren. Accepteer een werkelijke bronbeperking alleen met
zichtbare reikwijdte en specifieke reden, niet als heretikettering van een fout.
Het handoff bevat manifest/status, bronbank, reconciliatie, catalogus, migratie,
issues, reviewbasis en receipts. `PASS_FOR_TOOL_INTEGRATION_REVIEW` is niet
hetzelfde als menselijke goedkeuring of een vrijgegeven webversie.
