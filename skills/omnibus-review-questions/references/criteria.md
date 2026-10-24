# Criteria voor een goede vraag

Lees dit bestand volledig voordat je vragen beoordeelt. Elk criterium heeft een goed en
een slecht voorbeeld uit Omnibus. ‘Afgeleid’ betekent: een bestaande Omnibus-vraag, met
opzet fout gemaakt om het criterium te laten zien.

De vormregels met een **regel-ID** controleert `lib/question-quality.mjs` al automatisch
(`npm run check:questions`). De overige criteria beoordeel jij.

## 1. Interviewvraag

Een vraag die de auditor hardop stelt aan één geïnterviewde.

| Criterium | Goed | Slecht |
| --- | --- | --- |
| **Eén vraag tegelijk** (`meer-vragen`, `samengesteld`) | ‘Hoe houdt u zicht op de uitvoerbaarheidstoetsen waarvoor u verantwoordelijk bent?’ (IENW26-K09) | ‘Hoe organiseert u als bestuur contact met medewerkers en hoe reageert u op wat zij inbrengen?’ (SC003-Q03, strategisch niveau) |
| **Open** (`gesloten`): de geïnterviewde vertelt, en zegt niet alleen ja of nee | ‘Kunt u beschrijven hoe u een ruimte of middel gebruikte dat afnemers konden zien…?’ (SQ-TANGIBLES-Q01) | Afgeleid: ‘Gebruikt u een ruimte of middel dat afnemers kunnen zien?’ |
| **Neutraal** (`sturend`): geen mening, geen veronderstelde fout, geen voorbeeldantwoord | ‘Hoe komen jullie tot een gezamenlijke richting voor het werk dat jullie samen doen?’ (LVVN26-K01) | Afgeleid: ‘Waarom ontbreekt een gezamenlijke richting voor het werk?’ |
| **Concreet en eigen ervaring**: vraagt naar een situatie die de geïnterviewde zelf kent | ‘Kunt u beschrijven wat uw leidinggevende zelf deed bij een recente beslissing over {{onderwerp}}?’ (AI02) | De vraag die Omnibus vroeger zelf maakte: ‘Hoe krijgt het toetspunt ‘…’ in de praktijk vorm? Wat is uw eigen rol? …’ |
| **Begrijpelijk voor de geïnterviewde**: gewone woorden, actieve zin, geen ID's of toetstermen (`technisch`, `te-lang`) | ‘Hoe herkennen en bespreken jullie klachten die met de uitbetaling te maken hebben?’ (TOES26-K09) | Afgeleid: ‘Hoe is C26-P-005-04 belegd?’ |
| **Past bij het niveau**: operationeel vraagt naar eigen werk, management naar sturing, strategisch naar afwegingen | ‘Kunt u beschrijven hoe u als leidinggevende een keuze maakte over de voor afnemers zichtbare fysieke omgeving of middelen bij {{onderwerp}}?’ (SQ-TANGIBLES-Q01, management) | Dezelfde zin op elk niveau, met alleen een ander zinnetje erachter |

Een doorvraag mag uit meer korte vragen bestaan, maar elke vraag apart blijft kort en open.

## 2. Toetsvraag en toetsinstructie voor opzet, bestaan en werking

De **toetsvraag** is de vraag die de auditor wil beantwoorden. De **toetsinstructie** zegt
wat de auditor doet om die vraag te beantwoorden; die is een opdracht, geen vraag.

| Criterium | Goed | Slecht |
| --- | --- | --- |
| **Vraag en opdracht apart** (`opdracht`) | Toetsvraag: ‘Hoe vertaalt OCW haar reductieambitie en externe afhankelijkheden naar keuzes over eigen maatregelen?’ (OCWCO224-K10) | Afgeleid: ‘Beoordeel of OCW haar reductieambitie vertaalt naar maatregelen?’ |
| **Open, zonder conclusie vooraf** | ‘Hoe worden de voorzieningen, kennis en nog lopende werkzaamheden bij de overgang na PROO voortgezet?’ (PROO26) — de reden in de database zegt erbij: ‘veronderstelt geen feitelijk verlies’ | Afgeleid: ‘Waarom gaan kennis en lopende werkzaamheden bij de overgang verloren?’ |
| **Eén onderwerp**; twee delen alleen als ze samen één beheersvraag vormen (`samengesteld` geeft HOLD) | ‘Bij welke dienstonderdelen is een BVC-functie ingericht en hoe is dat bepaald?’ (BVA2021-027): één onderwerp | ‘Hoe worden maatregelen bij Skal onderbouwd en beoordeeld en hoe blijven hersteltermijnen en beëindigingsbesluiten in beeld?’ (SKAL25-K11): twee onderwerpen |
| **Opzet** gaat over het ontwerp: is de maatregel passend bedacht? | ‘Beoordeel of de afgesproken totstandkoming en vaststelling van het toekomstbeeld de relevante partijen, uitgangspunten en open keuzes omvat.’ (VIM25-K03/TP01) | Een opzetinstructie die vraagt of de maatregel ‘werkt’ |
| **Bestaan** gaat over een concreet geval op een peildatum | ‘Volg een gemelde opvolging van aanbeveling naar het werkelijk vastgestelde contract- of uitvoeringsbesluit en de dragende stukken.’ (BSA2324-K01/TP02) | Een bestaansinstructie zonder concreet geval of vastlegging, alleen op basis van een gesprek |
| **Werking** gaat over een periode, een populatie en een onderbouwde selectie | De standaardinstructie in Omnibus: ‘Leg periode, gecontroleerde populatie en onderbouwde selectie of toetsmethode vast.’ | ‘Geen afwijkingen gemeld, dus het werkt’: geen voorkomens betekent niet automatisch werking |

Een interview alleen bewijst geen bestaan of werking. Een toetsvraag die als interviewvraag
wordt gebruikt, moet ook aan de criteria voor een interviewvraag voldoen.

## 3. Onderzoeksvraag en deelvraag

| Criterium | Goed | Slecht |
| --- | --- | --- |
| **Eén afgebakend onderwerp**, met een duidelijke eenheid van onderzoek | ‘Hoe wordt de dienstverlening bij {{onderwerp}} uitgevoerd en bijgestuurd op basis van beschikbare afnemersinformatie?’ (SERVQUAL) | Afgeleid: ‘Hoe staat het met de dienstverlening?’ |
| **Beantwoordbaar** met de bronnen en methoden die het onderzoek heeft | ‘Hoe wordt bij {{onderwerp}} omgegaan met de zichtbare fysieke dienstomgeving en de daarover beschikbare afnemerssignalen?’ (SQ-RQ01) | Afgeleid: ‘Wat vinden alle burgers van de dienstverlening?’ in een onderzoek zonder burgerenquête |
| **Neutraal**: de gewenste uitkomst schemert niet door | ‘Hoe reageert de organisatie op zorgvuldig en onzorgvuldig gedrag?’ (SC008) | Afgeleid: ‘Waarom reageert de organisatie niet op onzorgvuldig gedrag?’ |
| **Alleen bekende invulplekken** (`technisch`): `{{onderwerp}}` mag, andere niet | ‘… bij {{onderwerp}} …’ | ‘Hoe wordt ${topic} bestuurd?’ |
| **Deelvragen dekken samen de centrale vraag**, zonder overlap | Vijf deelvragen, één per brongebied (SERVQUAL) | Een deelvraag die de centrale vraag herhaalt |

## 4. Operationalisatie

Een indicator maakt een begrip waarneembaar. De vraag bij een indicator vraagt naar wat
iemand zag, deed of besloot, niet naar een oordeel over het begrip zelf.

| Criterium | Goed | Slecht |
| --- | --- | --- |
| **Waarneembaar** | ‘Kunt u vertellen wat collega’s meekrijgen van uw dagelijkse werk bij {{onderwerp}}?’ (AI05, indicator zichtbaarheid) | Afgeleid: ‘Hoe integer is uw afdeling?’ |
| **Herleidbaar** naar een indicator en een bron | Elke modelvraag heeft `indicatorId` en `sourceIds` | Een vraag zonder koppeling: die verdwijnt |

## Uitkomst per vraag

| Uitkomst | Wanneer |
| --- | --- |
| **behouden** | Voldoet aan alle criteria voor zijn soort. |
| **herschrijven** | Het onderwerp is goed, de vorm niet. Geef een voorstel dat zelf ook aan alle criteria voldoet. |
| **schrappen** | Geen zinnige vraag te maken: geen bron, geen onderwerp, of de vraag hoort hier niet. Liever geen vraag dan een slechte vraag. |
| **HOLD** | Je twijfelt, of je kunt het niet beoordelen zonder de bron. Nooit stilletjes goedkeuren. |

## Bronnen

- Rijksuniversiteit Groningen, Taalcentrum: [Interviewen: vragen](https://www.rug.nl/language-centre/develop-yourself/academic/spreken/interviewen/vragen?lang=nl). Eén vraag tegelijk, neutraal, geen voorbeeldantwoorden, geen sociaal wenselijke antwoorden, actieve vorm, concreet, afgestemd op de geïnterviewde.
- PCAOB, [AS 2201](https://pcaobus.org/oversight/standards/auditing-standards/details/AS2201), paragrafen 42–45: toetsen van opzet (design effectiveness) en werking (operating effectiveness). Omnibus houdt bestaan apart; zie `lib/testing-aspects.mjs`.
- The IIA, Global Internal Audit Standards (2024), domein V, standaard 14.1: informatie verzamelen die relevant, betrouwbaar en voldoende is. Een interview alleen is meestal niet voldoende.
- P. Verschuren en H. Doorewaard, *Het ontwerpen van een onderzoek*: een onderzoeksvraag is afgebakend, beantwoordbaar en sluit aan op het doel.
