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

- De actieve rapporten, wetten, kaders, modellen en thema’s doorzoeken; geen ingetrokken of uitsluitend voor oude projecten bewaarde bronnen. De uitbreiding volgt de bestaande broncatalogus, inclusief Topical Requirements en andere toegelaten kaders.
- Norm, doel, risico, beheersing, toetspunt, bronpassage, beperkingen en toetsaanpak opvragen. Lange brongegevens worden zonder verlies in delen aangeboden.
- Een apart concept samenstellen met selectieredenen, centrale vragen, deelvragen, vraagkoppelingen en eigen interviewvragen per respondentniveau. Beoordeelde modelvragen blijven intact.
- Normtoetsing, Risico-controlmatrix en Interviewleidraad maken met de bestaande Excel-generator, kleuren, lettertype, werkfasen, auteur/team en respondentniveaus.
- Het gegenereerde project via **Open project** in Omnibus openen en verder bewerken. De huidige browserselectie wordt nooit automatisch vervangen.

## De zes hulpmiddelen

| Hulpmiddel | Wat het doet | Invoer → uitvoer | Grenzen |
| --- | --- | --- | --- |
| `get_workflow_guide` | Geeft werkwijze, bronregels, vraagkwaliteit, privacy en limieten | Niets → werkwijze, release, publicatie en sectoren | Alleen tekst; controleert niets |
| `list_sources` | Toont de actieve leesbare bronnen en thema’s | Niets → bron, soort, leesbare/selecteerbare/HOLD/context-aantallen | Alleen wat in de zoekindex staat; selecteerbaar verwijst naar de applicatie |
| `search_building_blocks` | Zoekt op woorden in toetspunten, modelvragen, broncontext en thema’s | Zoekterm, bron, soort, pagina → kandidaten met fragment en selectiegrens | Hooguit 40 per pagina; woordovereenkomst, geen inhoudelijke relevantie |
| `get_building_block` | Leest één bouwsteen: overzicht, broncontext, brontekst en herleiding | Sleutel en sectie → tekst in delen tot `nextOffset` leeg is | Hooguit 12.000 tekens per deel; weigert een gewijzigde bouwsteen |
| `prepare_research_draft` | Maakt een nieuw lokaal project met selecties, redenen en vragen | Concept en `consent: true` → concept-ID en bestandspaden | Hooguit 250 bouwstenen en 200 vragen; elke bouwsteen aan een vraag |
| `export_research_draft` | Maakt een Excel van een eerder concept | Concept-ID en `consent: true` → pad, grootte en hash | Altijd een nieuw bestand; nooit overschrijven of uploaden |

**Tests met fictieve gegevens.** De vier leestools staan in `read-tools.test.mjs`, met de bronprojecties en catalogusroute in de daarin opgenomen `catalogue-coverage.test.mjs`. De twee schrijftools staan in `output-safety.test.mjs` en `input-contract.test.mjs`. Ze draaien zonder private database in `npm run test:agent:input`. De integratieproef `local-protocol.test.mjs` doorloopt alle zes met de echte collectie.

**Lezen van alle brontypen (#146).** `kind` ondersteunt `report`, `law`, `framework`, `model` en `theme`. `kind: "theme"` of een thema-ID in `sourceId` levert de bestaande rapportpunten met hun oorspronkelijke sleutel en bronvermelding; thema’s maken geen extra normen. De bronlijst telt modelvragen per respondentniveau. `readableItems` omvat ook `holdItems` en `contextItems`; `selectableItems` telt de punten die de applicatie laat selecteren. Aantallen over thema’s en rapporten mogen niet bij elkaar worden opgeteld.

Elke treffer en detailaanroep toont `selectionStatus`, `selectionReason` en `draftSelectable`. HOLD en contextpunten blijven leesbaar. Voor kaders die de bestaande conceptfunctie nog niet ondersteunt is `draftSelectable` eveneens `false`; deze uitbreiding voegt geen schrijfmogelijkheden toe. Bronbeperkingen, toepasselijkheid, bronversie en herleiding staan in het overzicht en de gepagineerde bronsecties. Ook Topical-herleiding is via `trace` verliesvrij te lezen. De gedeelde passageadapter blijft bepalend voor de bronversie van andere kaders. XML-bewijs blijft als XML herkenbaar.

`passageStatus: "NOT_AVAILABLE"` meldt expliciet wanneer geen letterlijke bronpassage aanwezig is. Dat kan bijvoorbeeld gelden voor modelvragen met alleen een publicatie- en paginaverwijzing. Eigen interviewvragen, normparafrases en broncontext worden niet als citaten aangevuld. Lees `sourceContext` en `trace` voor modelgrenzen en theoretische herkomst. Een synthetische test bevestigt de route, niet de inhoudelijke juistheid of volledigheid van een echte bronrelease. Bestaande agent-builds moeten opnieuw worden opgebouwd voordat deze uitgebreidere zoekindex beschikbaar is; dit verandert de bronrelease niet.

**Tien vaste testvragen.** In [`evaluatie/testvragen.mjs`](evaluatie/testvragen.mjs) staan tien realistische vragen met het verwachte antwoord. Een AI-agent beantwoordt ze via de koppeling; jij vergelijkt het antwoord. `npm run agent:testvragen` controleert zonder AI of de verwachte antwoorden nog kloppen met de huidige agent-build, bijvoorbeeld na een nieuwe database.

De vaste referentie staat in `evaluatie/testbasis.mjs`: release, publicatie, volledige AI-index, vragen en werkwijze. Ook broncontext, passages en zoekgegevens tellen mee in de indexhash. De controle leest één databasesnapshot en behoudt de bestaande integriteitscontroles voor publicatie, bouwstenen en uitleverbestanden. Een afwijking geeft **HOLD** en exitcode 2, ook als de verwachte antwoorden nog kloppen. Dit bevestigt versie-identiteit, geen inhoudelijke juistheid of nieuwe publicatiegoedkeuring.

De referentie hoort bij de openbare collectie van 19 oktober 2026, niet automatisch bij de nieuwste database. Beoordeel een gewijzigde collectie en bronverwijzingen afzonderlijk voordat je de vaste basis of antwoorden bewust bijwerkt. Het programma schrijft nooit een nieuwe basis, database of actieve buildinstelling. Regels voor verschillende regeleinden op Windows en Linux beïnvloeden de hash van het vragenbestand niet.

Een andere bestaande agent-build kies je zonder de actieve koppeling te wijzigen:

```text
npm run agent:testvragen -- --pointer <bestaande-agent-build.json>
```

Voeg `--vragen` toe voor alleen vragen en hulpmiddelen, zonder verwachte antwoorden of controlefuncties. Ook dit vraagpakket komt pas vrij als de basis klopt. Geef het aan een nieuwe evaluator die de antwoorden niet heeft gelezen; laat die uitsluitend via de leestools antwoorden. Bewaar diens antwoorden en toolbewijs lokaal vóór vergelijking met de verwachtingen. Een deterministische controle of een proef door iemand die de antwoorden al kende, is geen onafhankelijke AI-evaluatie. Die onafhankelijke proef blijft open. `--basis <beoordeelde-basis.json>` is alleen voor een bewust gereviewde andere basis, geen automatische herijking.

**Vraagvoorstellen controleren (#147).** Nieuwe centrale vragen, deelvragen en interviewvragen gaan vóór het opslaan door de gedeelde vraagvoorcontrole. Een afgekeurde vraag of HOLD blokkeert het hele nieuwe concept, met uitleg per vraag. Er ontstaat dan geen gedeeltelijk project. Een geslaagde voorcontrole bevestigt alleen de vorm; inhoudelijke review blijft nodig. Bestaande opgeslagen vragen en eigen tekst blijven leesbaar en exporteerbaar. Opslaan vraagt nog steeds expliciet akkoord en maakt altijd een nieuwe map.

**Bekende gaten**, elk met een eigen user story:

- De [inhoudelijke vraagreview](../skills/omnibus-review-questions/README.md) blijft een afzonderlijke beoordeling; een geslaagde voorcontrole is geen inhoudelijke goedkeuring.
- Een werkelijk gehoste leesverbinding en de hostingacceptatie ontbreken: [#149](https://github.com/Robert-Worm/omnibus/issues/149). De afzonderlijke HTTP-reader heeft een lokale proef en een expliciete proxyconfiguratie, zoals hieronder beschreven.

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

De uitvoermap moet een gewone lokale map zijn: geen symlink of Windows-junction, ook niet in het bovenliggende pad. Conceptmappen mogen niet vervangen of omgeleid worden terwijl de service werkt. Opgeslagen conceptbestanden moeten gewone bestanden zijn met één hardlink. De service controleert de mapidentiteit opnieuw na het voorbereiden van een export. Namen bestaan uitsluitend uit een gegenereerde UUID, vaste projectnamen en één van de drie bestaande werkvormcodes. Bestaande namen worden ook bij een toevallige UUID-botsing geweigerd.

Project en `ai-concept.json` mogen ieder maximaal 24.000.000 UTF-8-bytes zijn, zowel bij opslaan als bij teruglezen. De gedeelde projectcodec behoudt zijn eigen uitpakgrens. Lezen gebruikt een begrensde buffer en weigert bestanden die tijdens het lezen groeien. Beschadigde JSON geeft een fout zonder opgeslagen tekstfragmenten. Dit zijn bestands- en veldgrenzen; de lokale STDIO-wachtrij, ruwe transportbytes, Exceluitvoer en totale schijfruimte hebben hiermee geen nieuw afzonderlijk budget.

Een concept-ID wordt pas teruggegeven nadat beide bestanden volledig zijn geschreven. Bij een gewone schrijffout probeert de service uitsluitend de zelf aangemaakte onvolledige bestanden en de eigen lege map op te ruimen. Zij wist nooit recursief een uitvoermap en laat een bestaand, vervangen of niet meer herkenbaar bestand staan. Een nieuwe poging kan daarna nieuwe uitvoer maken. Bij procesuitval, geweigerde opruiming of gelijktijdige wijzigingen kunnen resten blijven staan; dit is geen crashbestendige transactie of bescherming tegen een kwaadwillende lokale gebruiker met dezelfde bestandsrechten. Een onvolledig project/conceptpaar kan niet worden geëxporteerd. Oude `.pending-*`-mappen worden niet automatisch gewist.

## Browser en MCP na een nieuwe collectie gelijkzetten

Een werkende verbinding kan nog naar een oude installatie of index wijzen. Gebruik dezelfde instellingen als voor de lokale website:

```text
npm run build:agent -- --settings /pad/naar/local-build.json
npm run test:agent:protocol
```

De build leest de bron uitsluitend en maakt een afzonderlijke databasekopie met zoekindex. Hij vervangt `agent-build/current.json` pas na een geslaagde build; bewaar de vorige pointer vooraf om te kunnen terugschakelen. De protocoltest maakt fictieve projecten en drie Excelwerkvormen in de lokale, van Git uitgesloten `agent-output`-map.

Controleer daarna:

1. `release` en `publication` uit `get_workflow_guide` zijn gelijk aan de gekozen instellingen en de webbuild. Controleer ook de bronlijst; alleen hetzelfde aantal rapporten bewijst geen gelijke publicatie.
2. Het geregistreerde serverpad verwijst naar `agent-tools/server.mjs` van deze installatie, niet naar een oud archief of een andere checkout.
3. Herstart de bestaande MCP-verbinding na omschakeling. Een reeds draaiend proces kan de vorige index blijven gebruiken. Bouwen wijzigt geen clientregistratie.
4. Open een gegenereerd fictief project via **Open project** in een afzonderlijke lokale testwerkplek. Controleer selecties, vraagkoppelingen en exportinstellingen.

De protocoltest gebruikt bewust gekozen voorbeeldpunten. Een ontbrekend punt vraagt onderzoek; vervang het niet automatisch door het eerste zoekresultaat. Houd lokale paden, indexkopieën, projecten en testuitvoer buiten Git. Een geslaagde STDIO-proef bewijst niet dat een reeds geopende AI-client opnieuw verbonden is.

## Technische opbouw en opnieuw voorbereiden

De voorbereidingsstap maakt een consistente SQLite-kopie met `node:sqlite.backup`, leest dezelfde vastgepinde runtimepublicatie als de website en bouwt een afgeleide FTS-zoekindex. De bestaande selectiemodules leveren de brongebonden gegevens. Tijdens gebruik worden alleen geselecteerde bronmodules geladen; de volledige rapportcollectie wordt niet per zoekvraag ingelezen. De index bevat gepubliceerde toetspunten en modelvragen per niveau, geen alternatieve bronextractie. Oorspronkelijke bronarchieven worden niet door deze agent-build geïmporteerd.

`workflow.mjs` hergebruikt projectvalidatie, bronadapters, vraagkoppelingen, compressie en de bestaande Excel-generator. `service.mjs` bewaakt invoer en aparte uitvoerbestanden. `server.mjs` biedt zes MCP-tools met het officiële SDK. Er wordt geen HTTP-poort geopend. Beide transporten — website en agent — delen de catalogusprojectie; de standaard webtransportkeuze is ongewijzigd.

Zonder private database of agent-build zijn deze gerichte controles uitvoerbaar:

```text
node --test --test-timeout=30000 agent-tools/input-contract.test.mjs agent-tools/output-safety.test.mjs agent-tools/read-tools.test.mjs
```

De uitvoergrenstest maakt uitsluitend eigen synthetische testgegevens onder `work/mcp-output-safety/` en ruimt alleen die nieuwe testgegevens op. Hij gebruikt de echte service, alleen-lezen index en projectcodec. De domeinwerkwijze levert vaste testbytes: dit test bestandsafhandeling voor alle drie werkvormcodes, geen echte Excelinhoud of bronselectie. Daarvoor blijft de onderstaande bestaande protocolproef leidend. De linkproeven moeten echte symlinks/junctions en hardlinks kunnen maken; een beperkte runner die dat weigert geeft een fout, geen stille skip. De drie testbestanden zijn opgenomen in `test:agent:input` en daarmee in `npm test`. Dit vereist geen extra dependency, bronpublicatie of wijziging van MCP-registratie.

Uitvoeren vanuit deze repositorymap, met Node 24.21.0 en de instellingen uit [installeren](../docs/gebruiken/installeren.md):

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run build:agent -- --settings local-data/runtime/local-build.json
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

Voor codeherstel kan de ontwikkelaar de betreffende commits terugdraaien en de lokale client herstarten. Dat verandert geen bronrelease of browserproject. Een vorige agent-build kan via de bestaande lokale pointer worden teruggekozen nadat de beheerder release/publicatie heeft gecontroleerd; deze proef wijzigt geen globale registratie. De huidige opdracht bevat geen publiek MCP-endpoint, tunnel, login, accountbeheer of online opslag.

## Afzonderlijke HTTP-leesroute

`node agent-tools/start-read-only-http.mjs --build-directory <agent-build> [--port <poort>]` start uitsluitend op `127.0.0.1`, standaard op een vrije poort, met exact `/mcp`. Dit verandert `npm start`, de website en STDIO niet. De route biedt alleen `get_workflow_guide`, `list_sources`, `search_building_blocks` en `get_building_block`. Er zijn geen projecten, eigen documenten, bestandsroutes, schrijf- of exporttools, sessies of SSE-streams. HOLD, bronhashes en paginering blijven behouden.

Voor een **later afzonderlijk te beoordelen** TLS-reverseproxy op dezelfde host bestaat `--online-config <bestand.json>`. Zonder die optie blijft de lokale Host/Origin-controle gelden; omgevingsvariabelen activeren niets. Het instellingenbestand heeft uitsluitend deze velden:

```json
{
  "enabled": true,
  "publicOrigin": "https://omnibus.example.invalid",
  "missingOrigin": "reject",
  "publicRuntime": {
    "release": "<64 kleine hextekens van de goedgekeurde openbare release>",
    "publication": "<64 kleine hextekens van de goedgekeurde runtimepublicatie>",
    "databaseSha256": "<64 kleine hextekens van de goedgekeurde agentcatalogue.sqlite>"
  }
}
```

Dit voorbeeld bevat ongeldige plaatshouders en schakelt niets in. `enabled` moet expliciet `true` zijn; een onvolledig of onbekend veld stopt de start. De beheerder levert de drie **afzonderlijk beoordeelde openbare pinnen** aan. Een hash uit een willekeurige lokale build berekenen is geen publicatiegoedkeuring. De databasehash bindt ook de afgeleide zoekindex en zoekkolommen aan die beoordeling; alleen release/publicatie noemen bindt die index niet. De reader controleert de hash, de echte runtimepublicatie, resources en het codecontract in ieder geïsoleerd leesproces. Een gewijzigd bestand of niet-lege WAL/journal wordt geweigerd. Lever een afgeronde, onveranderlijke build op een alleen-lezen volume aan; wijzig of checkpoint nooit een actieve database om deze controle te passeren.

De bronrelease moet `omnibus-catalogue-release`, schema 1 zijn. Lokale model-/bronpublicaties, reviewdatabases, onbekende formaten en afwijkende scope/contentgate worden geweigerd, ook met correcte expliciet opgegeven hashes. `LOCAL_OWNER_ADMITTED` is geen openbare toelating. Deze controle filtert geen privéregels weg: een verkeerde of gewijzigde collectie wordt als geheel geweigerd. Broninhoud en review blijven buiten deze codewijziging.

Het reverseproxycontract is bewust beperkt:

- Extern uitsluitend de exact ingestelde HTTPS-origin plus `/mcp`; intern `http://127.0.0.1:<poort>/mcp`. De reader accepteert alleen de echte loopback-peer en bindt nooit op een publiek adres. Een proxy op een ander systeem of in een ander netwerknamespace valt buiten dit contract.
- De proxy valideert de externe authority en bewaart exact de publieke `Host` en de oorspronkelijke `Origin` en `Sec-Fetch-*`-headers. Hij herschrijft geen foute Origin naar een vertrouwde waarde en verwijdert geen browsermetadata. Alleen `POST /mcp` zonder query of herschreven pad wordt doorgestuurd. `Accept`, `Content-Type` en MCP-protocolheaders blijven behouden. De reader controleert dit zelf opnieuw; geen wildcard-CORS of CORS-preflightondersteuning.
- `missingOrigin: "reject"` weigert verzoeken zonder Origin. Alleen expliciet `"server-client"` laat serverclients zonder Origin toe, mits alle `Sec-Fetch-*`-headers ontbreken. Een aanwezige Origin moet altijd exact overeenkomen. Dit is geen authenticatie: de inhoud is bewust openbaar. Een cloudclient die een andere Origin meestuurt valt buiten dit contract; verruim daarvoor geen checks.
- `Forwarded`, `X-Forwarded-*` en vergelijkbare clientclaims bepalen geen host, schema, toegangsrecht of verzoekbudget. Alle toegelaten clients delen het budget van deze reader. De proxy bewaakt daarnaast zijn eigen totale verbindingen, header-/bodygrootte, buffering en deadlines, zonder retries of een onbegrensde wachtrij. Schakel requestbodylogging uit.

De bestaande bovengrenzen gelden in beide modi: 16 KiB body, 8 KiB headers, 256 KiB antwoord, 4 gelijktijdige verzoeken/leesprocessen, 16 verbindingen, 60 verzoeken burst en 1 verzoek per seconde aanvulling. De absolute verbindings- en leestijd is 5 seconden. Geen leeswachtrij; gestopte processen blijven meetellen tot ze zijn opgeruimd. V8 old space blijft 128 MiB per leesproces. Dit is **geen OS/native-geheugenquota**. Het opnieuw controleren van de database en publicatie valt binnen dezelfde leestijd; een te grote of trage build wordt geweigerd, de grenzen worden niet automatisch verruimd.

Voor een kleine host of een besloten proef kan `--read-concurrency 1` het aantal gelijktijdige leesprocessen verlagen. Alleen gehele waarden van 1 tot en met 4 zijn toegestaan; zonder deze optie blijft de grens 4. Een extra leesverzoek wordt direct geweigerd, niet in een wachtrij gezet. De HTTP-gezondheidscontrole blijft onafhankelijk beschikbaar. Een expliciete Node-start met `--jitless` wordt ook doorgegeven aan de leesprocessen; andere extra Node-startopties worden niet gekopieerd. Dit ondersteunt een afzonderlijke hostingproef met Linux-procesgrenzen, maar stelt die grenzen niet zelf in en vervangt geen totale containerquota of capaciteitscontrole. De gewone website en STDIO veranderen niet.

### HTTP-ingang achter de hostingproxy

Voor hosting waarbij de TLS-proxy buiten de container staat, is er een afzonderlijke, optionele ingang. Voeg `--gateway-host 127.0.0.1` toe aan dezelfde opdracht mét `--online-config` om die lokaal te testen. Alleen `--gateway-host 0.0.0.0` maakt deze ingang bereikbaar op het containernetwerk. `--port` bepaalt de ingangspoort. Er is geen wijziging aan de normale startopdracht van de website en geen automatische inschakeling via omgevingsvariabelen.

De ingang maakt zelf een interne reader op een vrije loopbackpoort. Een bezoeker kan geen ander doeladres opgeven. Beide kanten behouden de bovenstaande grenzen en controleren Host, Origin en browsermetadata. Verzoeken en antwoorden worden begrensd voordat ze worden doorgestuurd; er zijn geen retries of wachtrijen. Een verbroken verbinding stopt ook het interne verzoek. Alleen de vier leestoepassingen blijven beschikbaar, met dezelfde collectie- en broncontroles.

Stel voor deze afzonderlijke dienst de Sliplane-gezondheidscontrole in op `/health`, op dezelfde interne poort (standaard `8080` in de image). Alleen exact `GET /health` zonder body geeft `200` met `{"status":"ok"}` als de interne reader luistert; anders `503`. De host mag hiervoor zijn interne Host meesturen zonder Origin. Dit is uitsluitend een bereikbaarheidscontrole: geen databaseleesactie, bronidentiteit, projectinformatie of volledige collectiecontrole. De dienst begint pas te luisteren na de bestaande opstartcontrole van de gekozen collectie; ieder echt leesverzoek blijft zijn broncontroles uitvoeren.

Deze route bestaat alleen op de optionele HTTP-ingang, niet op de gewone website, STDIO of directe reader. Andere methoden, verzoekbodies en padvarianten worden geweigerd. Gezondheidschecks hebben een eigen begrensd verzoekbudget, met de bestaande verbindings-, header- en tijdslimieten. Ze verbruiken het MCP-leesbudget niet en geven geen CORS-toestemming. De strengere Host/Origin-controles op `/mcp` blijven ongewijzigd. Een geslaagde check bevestigt geen HTTPS-configuratie, beschikbare capaciteit of werking van een cloudclient.

Deze ingang levert **geen TLS**. De hostingproxy moet HTTPS afdwingen en het bovenstaande header- en padcontract behouden. Publiceer alleen die proxy; scherm de HTTP-ingang af van rechtstreekse internettoegang en houd de interne reader in dezelfde container. Ook deze opstelling vereist de afzonderlijk beoordeelde openbare collectie, een alleen-lezen volume en OS-quota. De lokale proef start geen hostingdienst en bevestigt geen online clientondersteuning.

De synthetische proeven in `read-only-http-online.test.mjs` lopen mee via `read-only-http.test.mjs` in `npm test`. Ze bewijzen lokale startup, protocol, weigering van lokale collecties en de veranderde toegangsgrens. Voor hosting blijven bewijs van TLS/proxyrouting en headerbehoud, afscherming van de interne poort, alleen-lezen openbare build, OS/native-geheugen-/procesquota, totale capaciteit en herstel, en de gekozen echte cloudclient nodig. Deze wijziging activeert geen publieke MCP-route of hostingdienst en geeft geen hostinggoedkeuring. Sluit #149 niet op basis van deze lokale proeven alleen.

## Afzonderlijk hostingpakket voor de leesroute

Maak een klein codepakket met de bestaande Node- en Vite-installatie:

```text
node scripts/package-mcp.mjs --out work/mcp-runtime
```

De uitvoermap moet nieuw zijn. Het pakket bevat de HTTP-ingang, de afzonderlijke leesprocessen en hun benodigde onderdelen uit `package-lock.json`. Op de doelcomputer is alleen Node 24.21 nodig; geen installatie van extra npm-onderdelen. `mcp-package.json` bevat controlegetallen en versies. Licenties van meegeleverde onderdelen staan in `THIRD-PARTY-NOTICES.txt`.

Er gaat geen database, lokale configuratie, website of onderzoeksproject mee. De bestaande webstart en STDIO-koppeling blijven ongewijzigd. Dit pakket bouwt zelf geen agentdatabase en neemt geen vrijgavebesluit.

Voor containerhosting is er een afzonderlijk bouwbestand:

```text
docker build -f hosting/mcp/Dockerfile -t omnibus-mcp-read-only .
```

Dit bouwbestand wordt niet gebruikt door de bestaande website. Het haalt geen database op en maakt geen publieke verbinding. Bij starten zijn twee afzonderlijke, alleen-lezen koppelingen nodig:

- `/data`: de beoordeelde agentbuild, met `catalogue.sqlite` en `omnibus-release.json`. De oorspronkelijke database zonder de afgeleide zoekindex is niet voldoende.
- `/config/online.json`: de expliciete online configuratie hierboven. Het databasecontrolegetal geldt voor de volledige **agentdatabase**, inclusief zoekindex.

Zonder deze bestanden, bij verkeerde controlegetallen of bij een lokale reviewcollectie weigert de ingang te starten. De image draait als gebruiker zonder beheerrechten. De host moet ook een alleen-lezen bestandssysteem, proces- en geheugengrenzen en de beschreven HTTPS-proxy instellen. De V8-geheugengrens in het startcommando vervangt de geheugengrens van de container niet.

De pakketproef gebruikt uitsluitend fictieve gegevens buiten de checkout. Zij controleert de vier leestools, bronidentiteit, HOLD, bronpassages, weigering van schrijfacties en verkeerde headers, en starten met ontbrekende of verkeerde instellingen. Dit bewijst de afzonderlijke Node-runtime; het is geen bewijs van een draaiende container of publieke aansluiting. Die acceptatie blijft onderdeel van [#149](https://github.com/Robert-Worm/omnibus/issues/149).

## Verder lezen

[AI-koppeling voor gebruikers](../docs/gebruiken/ai-koppeling.md) · [Architectuur](../docs/bijdragen/architectuur.md)

---

[↑ Omnibus](../README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
