# AI-koppeling (`agent-tools/`)

> **In het kort:** de lokale koppeling waarmee een AI-assistent in Omnibus kan zoeken en een onderzoeksopzet kan voorbereiden. Deze pagina is de technische uitleg; de gebruikershandleiding staat in [je eigen AI-assistent koppelen](../docs/gebruiken/ai-koppeling.md).

## Belangrijkste bestanden

| Bestand | Wat het doet |
| --- | --- |
| `server.mjs` | De MCP-server met zes tools, via STDIO (geen netwerkpoort) |
| `service.mjs` | Bewaakt invoer en schrijft uitvoer naar aparte bestanden |
| `workflow.mjs` | Hergebruikt de selectie-, vraag- en exportlogica uit [`lib/`](../lib/README.md) |
| `index-store.mjs` | De afgeleide zoekindex |

## Wat de koppeling doet

Deze koppeling laat een eigen AI-client de bestaande Omnibus-werkwijze gebruiken. Omnibus voert zelf geen AI-model uit en bewaart geen AI-abonnement of API-sleutel. De eigen AI interpreteert het onderwerp of de intake, vergelijkt bouwstenen en formuleert vragen. Omnibus controleert de structuur, bewaart brongegevens en maakt het project en de Excel.

## Wat werkt nu?

- De actieve rapporten, wetten en modellen doorzoeken; geen ingetrokken of uitsluitend voor oude projecten bewaarde bronnen.
- Norm, doel, risico, beheersing, toetspunt, bronpassage, beperkingen en toetsaanpak opvragen. Lange brongegevens worden zonder verlies in delen aangeboden.
- Een apart concept samenstellen met selectieredenen, centrale vragen, deelvragen, vraagkoppelingen en eigen interviewvragen per respondentniveau. Beoordeelde modelvragen blijven intact.
- Normtoetsing, Risico-controlmatrix en Interviewleidraad maken met de bestaande Excel-generator, kleuren, lettertype, werkfasen, auteur/team en respondentniveaus.
- Het gegenereerde project via **Open project** in Omnibus openen en verder bewerken. De huidige browserselectie wordt nooit automatisch vervangen.

Dit is een **lokale MCP-verbinding via STDIO**, geen online koppeling. De knop **AI koppelen**, naast de weergave- en opslagknoppen, toont de werkwijze en kopieerbare lokale instellingen. De website kan niet vaststellen of een AI-client daadwerkelijk verbonden is en toont daarom geen onbevestigde verbindingsstatus. Een geschikte AI-client start het proces zelf. Cloudclients die uitsluitend een publieke URL ondersteunen kunnen hier nog niet rechtstreeks mee verbinden. Ondersteuning hangt af van de gekozen client en de organisatie-instellingen; een AI-abonnement alleen garandeert geen connectorondersteuning.

## Verbinden op deze computer

Bereid eerst de agent-build voor zoals hieronder beschreven. `agent-build/current.json` wijst daarna naar de gecontroleerde lokale kopie. Gebruik in de MCP-instellingen van de eigen AI-client:

- Naam: `Omnibus`
- Verbinding: `STDIO` / lokaal proces
- Programma: het absolute pad naar je Node-installatie
- Argument: het absolute pad naar `agent-tools/server.mjs` in deze checkout

De knop **AI koppelen** toont de absolute paden van de geopende build. Bestaande clientregistraties worden door het bouwen niet gewijzigd en kunnen nog naar de oorspronkelijke checkout verwijzen. Vul bij een configuratievoorbeeld altijd de paden van deze installatie in. Behoud bevestiging voor schrijfacties; clientregistratie blijft een afzonderlijke handeling. Zie voor Codex de [officiële MCP-instellingen](https://developers.openai.com/codex/mcp).

Laat de AI beginnen met `get_workflow_guide`. Een passende opdracht is: “Gebruik Omnibus om voor dit onderwerp een onderzoeksconcept te maken. Bespreek eerst de afbakening, lees de bronbeperkingen, motiveer je selectie en stel centrale vragen en deelvragen voor. Vraag mijn akkoord voordat je het project en de Excel opslaat.”

De koppeling leest geen intakebestand rechtstreeks van schijf. Je eigen AI-client verwerkt het document waarvoor je toestemming geeft en stuurt alleen de benodigde samenvatting. Deel geen vertrouwelijke informatie met een AI-aanbieder zonder de daarvoor vereiste toestemming. De gekozen aanbieder verwerkt ontvangen bronfragmenten en onderzoeksgegevens volgens diens eigen afspraken.

## Grenzen en bescherming

- De broncatalogus wordt tijdens gebruik uitsluitend gelezen, via een vastgepinde databasekopie. De koppeling heeft geen SQL-, bronwijzigings-, script-, netwerk- of willekeurige bestandsleesfunctie.
- Alleen expliciet gekozen, beschikbare punten worden overgenomen. HOLD-punten en ongeldige sectorselecties worden geweigerd. Selecteren bevestigt geen juridische toepasselijkheid.
- AI-vragen worden als voorstel opgeslagen, niet als broncitaten. Selectieredenen staan in projectnotities. Een apart `ai-concept.json` bewaart intake, aannames, vraag- en selectiemapping en de gebruikte bronrelease.
- Iedere gekozen bouwsteen moet aan een onderzoeksvraag zijn gekoppeld. Er worden geen punten stilzwijgend uit de export weggelaten. Dezelfde bouwsteen kan bij meerdere vragen horen zonder dubbel te worden geselecteerd.
- Projecten en exports worden alleen als nieuwe bestanden opgeslagen onder `agent-output/<unieke-code>/`. Geen upload, e-mail, publicatie of overschrijven. Bestaande bestanden blijven staan totdat de gebruiker ze verwijdert; dit is geen cloudopslag, versleutelde kluis of organisatiebreed auditlog.
- Beide schrijftools vereisen `consent: true`, uitsluitend nadat de gebruiker akkoord gaf voor de betreffende handeling. De gebruiker mag projectopslag en Excel samen toestaan. Dit veld is een expliciete clientbevestiging, geen onafhankelijk bewijs van menselijke toestemming en geen vervanging voor bevestigingen in de AI-client. Ontbrekend of onjuist akkoord geeft een fout zonder bestanden; bespreek het akkoord en probeer daarna opnieuw.
- De lokale computergebruiker blijft de vertrouwensgrens. Een AI-client met aanvullende bestands- of terminalrechten kan méér dan deze koppeling; die rechten worden niet door Omnibus beheerd.
- Maximaal 250 expliciete bouwstenen per concept, 200 vragen en 40 zoekresultaten per pagina. Zoekresultaten zijn lexicale kandidaten, geen garantie dat de AI alles relevants heeft gevonden. De inhoudelijke kwaliteit en toepasselijkheid blijven te beoordelen.

De uitvoermap moet een gewone lokale map zijn: geen symlink of Windows-junction,
ook niet in het bovenliggende pad. Conceptmappen mogen niet vervangen of omgeleid
worden terwijl de service werkt. Opgeslagen conceptbestanden moeten gewone bestanden
zijn met één hardlink. De service controleert de mapidentiteit opnieuw na het
voorbereiden van een export. Namen bestaan uitsluitend uit een gegenereerde UUID,
vaste projectnamen en één van de drie bestaande werkvormcodes. Bestaande namen
worden ook bij een toevallige UUID-botsing geweigerd.

Project en `ai-concept.json` mogen ieder maximaal 24.000.000 UTF-8-bytes zijn, zowel
bij opslaan als bij teruglezen. De gedeelde projectcodec behoudt zijn eigen
uitpakgrens. Lezen gebruikt een begrensde buffer en weigert bestanden die tijdens
het lezen groeien. Beschadigde JSON geeft een fout zonder opgeslagen tekstfragmenten.
Dit zijn bestands- en veldgrenzen; de lokale STDIO-wachtrij, ruwe transportbytes,
Exceluitvoer en totale schijfruimte hebben hiermee geen nieuw afzonderlijk budget.

Een concept-ID wordt pas teruggegeven nadat beide bestanden volledig zijn geschreven.
Bij een gewone schrijffout probeert de service uitsluitend de zelf aangemaakte
onvolledige bestanden en de eigen lege map op te ruimen. Zij wist nooit recursief
een uitvoermap en laat een bestaand, vervangen of niet meer herkenbaar bestand
staan. Een nieuwe poging kan daarna nieuwe uitvoer maken. Bij procesuitval,
geweigerde opruiming of gelijktijdige wijzigingen kunnen resten blijven staan;
dit is geen crashbestendige transactie of bescherming tegen een kwaadwillende
lokale gebruiker met dezelfde bestandsrechten. Een onvolledig project/conceptpaar
kan niet worden geëxporteerd. Oude `.pending-*`-mappen worden niet automatisch gewist.

## Technische opbouw en opnieuw voorbereiden

De voorbereidingsstap maakt een consistente SQLite-kopie met `node:sqlite.backup`, leest dezelfde vastgepinde runtimepublicatie als de website en bouwt een afgeleide FTS-zoekindex. De bestaande selectiemodules leveren de brongebonden gegevens. Tijdens gebruik worden alleen geselecteerde bronmodules geladen; de volledige rapportcollectie wordt niet per zoekvraag ingelezen. De index bevat gepubliceerde toetspunten en modelvragen per niveau, geen alternatieve bronextractie. Oorspronkelijke bronarchieven worden niet door deze agent-build geïmporteerd.

`workflow.mjs` hergebruikt projectvalidatie, bronadapters, vraagkoppelingen, compressie en de bestaande Excel-generator. `service.mjs` bewaakt invoer en aparte uitvoerbestanden. `server.mjs` biedt zes MCP-tools met het officiële SDK. Er wordt geen HTTP-poort geopend. Beide transporten — website en agent — delen de catalogusprojectie; de standaard webtransportkeuze is ongewijzigd.

Zonder private database of agent-build zijn deze gerichte controles uitvoerbaar:

```powershell
node --test --test-timeout=30000 agent-tools/input-contract.test.mjs agent-tools/output-safety.test.mjs
```

De uitvoergrenstest maakt uitsluitend eigen synthetische fixtures onder
`work/mcp-output-safety/` en ruimt alleen die nieuwe fixtures op. Hij gebruikt de
echte service, alleen-lezen index en projectcodec. De domeinworkflow levert vaste
testbytes: dit test bestandsafhandeling voor alle drie werkvormcodes, geen echte
Excelinhoud of bronselectie. Daarvoor blijft de onderstaande bestaande protocolproef
leidend. De linkproeven moeten echte symlinks/junctions en hardlinks kunnen maken;
een beperkte runner die dat weigert geeft een fout, geen stille skip. Beide
testbestanden zijn opgenomen in `test:agent:input` en daarmee in `npm test`.
Dit vereist geen extra dependency, bronpublicatie of wijziging van MCP-registratie.

Uitvoeren vanuit deze repositorymap, met Node 24.17.0 en de private instellingen uit de [README](../docs/gebruiken/installeren.md):

```powershell
npm ci --ignore-scripts
npm run build:agent -- --settings C:/private/omnibus/local-build.json
node --test agent-tools/input-contract.test.mjs
node --test agent-tools/local-protocol.test.mjs
```

Vervang het instellingenpad door het afzonderlijk aangeleverde bestand met exact `database`, `release` en `publication`. Een relatief databasepad daarin wordt ten opzichte van dat instellingenbestand opgelost. Gebruik voor een proef een afzonderlijke checkout: build en tests schrijven alleen in de eigen genegeerde `agent-build/` en `agent-output/`. De protocoltest vereist een voorbereide collectie met rapporten, CIO, WWKE en modellen; ontbrekende voorwaarden geven een fout, geen stilzwijgend overgeslagen test. Dit is een integratieproef met fictieve onderzoeksgegevens, geen volledig synthetische broncollectie of algemene CI-test zonder private data.

Een bronwijziging vraagt een nieuwe gecontroleerde release en een nieuwe agent-build. De pointer wijzigt pas na een volledig geslaagde build. Eerdere buildmappen blijven beschikbaar voor herstel; verwijder oude afgeleide builds pas wanneer geen client ze gebruikt. De originele database wordt door deze voorbereiding niet gewijzigd. De desktop/browserapp hoeft niet opnieuw gebouwd te worden voor deze koppeling. Vergelijk vóór een demo `release` én `publication` van `get_workflow_guide` met de gekozen webbuild. De leesruntime registreert zichzelf niet bij een AI-client.

## Herhaalbare lokale demonstratie

`local-protocol.test.mjs` start deze checkout als tijdelijk STDIO-proces met de bestaande MCP-SDK. De test doorloopt de zes tools, leest bronsecties met paginering, gebruikt `test-fixture.mjs` voor fictieve intakegegevens, maakt expliciete selecties met centrale/deelvragen en controleert opgeslagen bronherleiding, vraagkoppelingen en de drie bestaande Excel-werkvormen. Alle gemaakte bestanden blijven in de afzonderlijke uitvoermappen. Broninhoud, transcripties, intake en Excel horen niet in Git.

Negatieve gevallen omvatten ontbrekend akkoord, onbekende IDs, invoerlimieten, dubbele/ontbrekende vraagkoppelingen, HOLD en sectoruitsluiting, gewijzigde concepten en nieuwe uitvoer bij herhaalde export. De test controleert ook de alleen-lezen index en ongewijzigde hash van de gebouwde database. Vergelijk daarnaast bij een bronbuild de oorspronkelijke database vóór en na; de protocoltest kent alleen de geïsoleerde kopie. Een geslaagde proef bewijst geen menselijke bronreview, juridische toepasselijkheid, Excel-herberekening in de desktopapp of visuele browserbediening.

Open voor de gezamenlijke acceptatie een gemaakt `omnibus-project.json` met **Open project** in een afzonderlijk browserprofiel. Controleer selectie, vragen, bronmarkeringen en herladen; open de Excel en controleer de vraagselector en herberekening. De website toont terecht geen bevestigde verbindingsstatus: alleen de AI-client kan de lokale verbinding controleren. Historische privé-demo's en de oude `test:agent`-suite zijn geen uitvoerbaar bewijs in deze codekopie.

## Bestaande clients en herstel

Serverversie 0.2.0 voegt het verplichte veld `consent` toe aan `prepare_research_draft` en `export_research_draft`. Herstart de lokale verbinding zodat de client de tools opnieuw opvraagt. Voeg het veld alleen na akkoord toe aan bestaande aanvraagbestanden voor `scripts/call-omnibus-mcp.mjs`; die brug geeft aanvragen ongewijzigd door en verzint geen toestemming. `test-fixture.mjs` levert bewust alleen het concept; tests voegen hun expliciet toegestane fictieve schrijfhandeling zelf toe. Eerder opgeslagen concepten zonder dit veld blijven exporteerbaar, met nieuw akkoord op de exportaanroep. De leesaanroepen en bestandsformaten blijven gelijk.

Voor codeherstel kan de integrator de betreffende commits terugdraaien en de lokale client herstarten. Dat verandert geen bronrelease of browserproject. Een vorige agent-build kan via de bestaande lokale pointer worden teruggekozen nadat de beheerder release/publicatie heeft gecontroleerd; deze proef wijzigt geen globale registratie. De huidige opdracht bevat geen publiek MCP-endpoint, tunnel, login, accountbeheer of online opslag.

## Verder lezen

[AI-koppeling voor gebruikers](../docs/gebruiken/ai-koppeling.md) · [Architectuur](../docs/bijdragen/architectuur.md)
