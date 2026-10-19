# Schone build en verplaatsbare bronbewijzen

Voor de code-only GitHub-checkout geldt nu de [databasepublicatieroute in de README](../README.md#lokaal-bouwen-en-starten). Die bouwt zonder oorspronkelijke bronarchieven, met een voorbereide database en expliciete release-/publicatiehash. Gebruik `data:runtime-backup` om ook de afgeleide laadpakketten mee te nemen. De instructies hieronder beschrijven de eerdere volledige privé-checkout en haar inhoudelijke bewijsketen; de oude buildopdracht is niet de startopdracht voor de nieuwe codecheckout.

De databasewebversie is op 14 oktober 2026 op Windows zelfstandig geïnstalleerd,
gebouwd en in de browser getest vanuit een andere map. De nieuwe installatie
gebruikt eigen afhankelijkheden en een eigen herstelde database. Historische
bewijsbestanden zijn verplaatst zonder hun inhoud, hashes of reviewstatus te wijzigen.
Dit is een technische overdrachtsproef, geen nieuwe inhoudelijke goedkeuring of
vrijgave voor online productie.

## Benodigdheden

- Node 24.17 en npm zijn in deze proef gebruikt. Een andere versie moet afzonderlijk
  worden getest, inclusief de ingebouwde SQLite-ondersteuning.
- Python 3.10 of nieuwer voor de oorspronkelijke CIO-bronvalidator. De build gebruikt
  `python3`, of het uitvoerbare bestand uit `OMNIBUS_PYTHON`. Deze variabele bevat één
  pad, geen opdracht met argumenten. Er wordt geen shell gebruikt om het pad uit te voeren.
- De bij de release behorende broncheckout, vergrendelde pakketlijst, bronpakketten,
  reviewarchieven en expliciete databaserelease. Alleen de map `viewer` is nog niet
  voldoende: enkele controles lezen onveranderlijke archieven ernaast.
- Voor browsercontroles bovendien Playwright en een geschikte browser. De huidige
  testscripts bevatten nog lokale standaardpaden en enkele historische fixtures;
  de gehele QA-omgeving is dus nog niet zonder voorbereiding overdraagbaar.

De huidige archiefstructuur naast `viewer` bevat `report-ingestion`,
`framework-ingestion`, `law-extraction/cio-2026-v1`,
`law-extraction/wwke-2026-08-15-astra-high-20261010-01`, `source-documents`
en `bronnen/CIBGBIO24.pdf`.
De proef kopieerde de benodigde archiefmappen ruim; dit is nog geen minimaal
distributiepakket. Bewaar deze bestanden buiten de publieke webmap.

## Historische bestandslocaties verplaatsen

Sommige vastgelegde reviewbewijzen bevatten absolute paden van de oorspronkelijke
werkplek. Die bewijzen mogen niet worden herschreven om een verhuizing te laten
slagen. Maak op de werkende oorspronkelijke installatie een transportkopie:

```text
node scripts/prepare-evidence-bundle.mjs ../evidence-transfer-01
```

Kies een nieuwe, nog niet bestaande doelmap. De opdracht voert eerst de bestaande
rapportvrijgavecontrole uit, verzamelt de daadwerkelijk gebruikte historische
bestanden, kopieert hun bytes en voert dezelfde controle opnieuw uit op de kopie.
Identieke bestanden worden één keer opgeslagen. Alleen na beide controles volgt
`VERIFIED_TRANSPORT_COPY`; `newContentApproval` blijft `false`.

Neem de volledige nieuwe map mee naar de andere installatie. Stel daar
`OMNIBUS_EVIDENCE_MAP` in op het absolute pad naar haar `paths.json`. Het manifest
koppelt oude identiteiten aan relatieve bestanden binnen de transportmap.
De oorspronkelijke controles blijven de oorspronkelijke hashes vergelijken.
Ontbrekende vermeldingen, onveilige paden en verwijzingen via een symbolische
link of junction worden geweigerd. Een ingestelde mapping valt nooit stilzwijgend
terug op de oude computer. Zonder mapping blijft de bestaande lokale werkwijze werken.

Bij een mislukte tweede controle kan een onvolledige doelmap achterblijven. Gebruik
die niet voor overdracht; onderzoek de fout en kies voor een herhaling een nieuwe
map. Er wordt niet automatisch opgeruimd of over bestaande bewijsbestanden geschreven.

## Installeren, herstellen en bouwen

1. Plaats de broncheckout en bijbehorende archieven in een nieuwe werkmap. Kopieer
   geen `node_modules`, persoonlijke instellingen, geheimen of oude bouwuitvoer.
   Neem ook de ontwikkelbron `build-foundation-passages.mjs` mee: een regressietest
   leest hieruit de echte focuscontrole, zonder de schrijvende generator uit te voeren.
2. Voer vanuit `viewer` `npm ci --workspaces=false --ignore-scripts --no-audit --no-fund` uit. Daarmee
   zijn in de proef alle 551 vastgelegde pakketten geïnstalleerd. Er zijn geen
   installatiescripts uitgevoerd; dit is geen beveiligingsaudit van de pakketten.
3. Stel indien nodig `OMNIBUS_PYTHON` en `OMNIBUS_EVIDENCE_MAP` in. De Python-installatie
   mag buiten de projectmap staan; het pad is nu een expliciete omgevingseis,
   geen in de broncode vastgelegde persoonlijke locatie.
4. Herstel de expliciet gekozen JSON-inhoudsbackup in een nieuwe SQLite-database.
   Gebruik `npm run data:restore --workspaces=false -- --from <backup.json> --to
   local-data/runtime/catalogue.sqlite --release <releasehash>`; vervang de
   placeholders en maak de doelmap vooraf aan. Een bestaande database wordt niet
   overschreven. De opdracht controleert de releasehash en vergelijkt alle inhoud
   volledig, inclusief opnieuw openen als alleen-lezen database. Maak een backup
   op de oorspronkelijke installatie met `npm run data:backup --workspaces=false -- --from
   local-data/runtime/catalogue.sqlite --to <nieuwe-backup.json> --release
   <releasehash>`. Kopieer geen draaiend SQLite-bestand als vervanging van deze
   gecontroleerde herstelroute.
5. Voer `npm run build:database --workspaces=false -- --release <releasehash>` uit, met de werkelijke
   64 tekens lange hash. Alle bestaande bronvrijgavecontroles blijven actief.
   Deze stap maakt ook de afgeleide webpakketten opnieuw aan; die zitten niet in
   de inhoudsbackup.
6. Start `npm run dev:database --workspaces=false`. Open de lokale site en controleer laden,
   selecties, vraagkoppelingen, bronmarkeringen en projectherstel. De dienst
   luistert lokaal en is niet bedoeld als onbeveiligde internetpublicatie.

Voor de broncodecontrole is `node node_modules/typescript/bin/tsc --noEmit
--incremental false` gebruikt. `npm run test:database` controleert de gegevenslaag.
De volledige verzameling blijft apart nodig: `npm run test:baseline -- --suite all
--run --out work/all-new-installation.json`. Kies een nog niet bestaande rapportnaam.
Een geslaagde databasegroep maakt resterende fouten in die brede verzameling niet goed.

## Historische testgegevens meenemen

De brede testverzameling heeft negen kleine historische bestanden nodig naast
de bronpakketten: vier projectscenario's, een viewerproject, twee oorspronkelijke
bronmomentopnamen, een oud rapportmodel en een Markdown-baseline. Maak op de
werkende installatie een nieuwe transportmap:

```text
node scripts/prepare-qa-fixtures.mjs <nieuwe-map>
```

Plaats deze volledige map als `qa-fixtures` direct in de nieuwe `viewer`-map.
Het hulpmiddel controleert alle negen vooraf vastgelegde hashes, schrijft niets
over, kopieert alleen ongewijzigde bytes en controleert de kopie opnieuw. Samen
zijn deze bestanden 1.777.808 bytes. De tests gebruiken de kopie zodra de map
bestaat. Een ontbrekend of beschadigd bestand is dan een fout, zonder terugval
op oude bestandspaden. De map blijft buiten versiebeheer en de webapplicatie.
Dit is apart van `OMNIBUS_EVIDENCE_MAP`, dat de bevroren rapportontvangsten bedient.

Neem bovendien de volledige oorspronkelijke map `source-documents` naast
`viewer` mee: 83 bestanden, 82.670.707 bytes in de huidige proef. De brontests
vergelijken de historische PDF's én de publieke kopieën met de ongewijzigde
documenthashes. Een meegeleverde publieke kopie vervangt niet stilzwijgend
het oorspronkelijke bewijs. Deze archieven zijn ontwikkelbewijs, geen opdracht
om alle historische kaders weer openbaar selecteerbaar te maken.

## Uitkomst van de Windows-proef

### Privé-archieven meenemen zonder de oorspronkelijke werkmap

De aanvullende overdracht gebruikt bewust de structuur
`<nieuwe-root>/round-d/v4.25/viewer`. Daardoor verwijzen de oorspronkelijke
relatieve archiefpaden binnen de nieuwe root, niet naar een gedeelde map op de
oude werkplek. Maak de nieuwe root vanaf de werkende oorspronkelijke installatie:

```text
node scripts/prepare-private-archives.mjs <nieuwe-root>
```

Deze opdracht neemt precies de 28 bestanden uit
`content-tools/private-archives.json` mee: afgesloten reviewmomentopnamen,
private DigiD-bijlagen en oorspronkelijke rapport-PDF's. Samen zijn ze
85.470.571 bytes. Hun bestaande hashes blijven ongewijzigd. De opdracht weigert
een bestaande doelmap, controleert alle bronbestanden vóór het schrijven en
verifieert de kopieën. Dit is geen nieuwe inhoudelijke goedkeuring.

Plaats vervolgens de broncheckout onder `round-d/v4.25/viewer` en de eerder
genoemde archiefmappen ernaast. Neem ook `.openai/hosting.json` mee; de huidige
inhoud bevat alleen twee lege bouwbindingen, geen credentials. Kopieer nooit
persoonlijke `.env`-bestanden, sleutels, `node_modules` of de draaiende database.
Sluit uitsluitend `viewer/local-data/runtime` uit: mappen genaamd `runtime`
**binnen afgesloten bronpakketten zijn bewijsbestanden** en moeten wel mee.

Een minimale private `package.json` in de nieuwe root met
`{"private":true,"workspaces":["round-d/v4.25/viewer"]}` begrenst het zoeken
van bouwgereedschap naar bovenliggende workspace-instellingen. Installeer en
bouw nog steeds vanuit de geneste `viewer`-map, met `--workspaces=false` bij
npm-opdrachten. `npm prefix --workspaces=false` moet precies die map tonen;
zonder die optie zoekt npm de buitenste workspace op. Rechtstreekse
`node scripts/...`-opdrachten zijn niet afhankelijk van npm-workspacedetectie.
Stel `OMNIBUS_EVIDENCE_MAP`
in op de verplaatste `evidence/paths.json` en plaats de negen historische
testgegevens als `viewer/qa-fixtures`. Volg daarna de backup-, herstel- en
bouwstappen hierboven.

Voor de relevante browsertests zijn de testprojecten expliciet verplaatsbaar:
`REPORT_FIXTURE` is het rapportproject en `MIXED_FIXTURE` het gemengde project.
Gebruik daarnaast `PLAYWRIGHT_MODULE`, `EDGE_PATH`, `REVIEW_URL` en een nieuwe
`REVIEW_OUT` per uitvoering. De catalogus-, kader- en modelcontrole gebruiken
deze instellingen zonder testscenario's of bronasserties te verwijderen.

Dit is een private ontwikkeloverdracht, geen uploadpakket voor webhosting.
Reviewarchieven, oorspronkelijke testprojecten en databasebackups horen nooit
in de publieke webmap. De ruim gekopieerde archiefmappen zijn nog niet tot
een minimaal distributiepakket teruggebracht.

### Eerste zelfstandige installatie

De proef staat onder `work/omnibus-clean-20261014-01` in de hoofdwerkmap:

- Eigen installatie van 551 pakketten; geen verwijzing naar de oude `node_modules`.
- De volledige eindronde over 311 testbestanden telt in beide installaties
  2835 geslaagde uitvoeringen, zonder fouten, overslaan of annuleren. Zie de
  isolatiebeperking voor historische archieven hieronder: dit is nog geen
  volledig onafhankelijke QA-omgeving op een andere computer.
- Herstel van 83 pakketten, 8617 records, 110 brondocumenten en 4147 pagina's,
  met exacte inhoudsgelijkheid en behoud van de releasehash.
- Transport van 95 historische paden via 65 unieke bestanden, samen 410.633.791 bytes.
  De oorspronkelijke en de verplaatste vrijgavecontrole slagen.
- TypeScript, alle 37 databasetests en alle 16 browserscenario's slagen.
  De browserproef omvat workflow, catalogusfouten/herstel, projectimport,
  CIO/WWKE-bronnen en oude projecten met PDF- en werkbladbronnen.
- De vaste backup-/herstelopdrachten zijn ook op de echte catalogus uitgevoerd:
  een backup van 75.139.946 bytes herstelt dezelfde release volledig in een
  nieuw databasebestand. Bestaande doelbestanden en gewijzigde inhoud worden
  in regressietests geweigerd. De huidige overdrachtslimiet is 512 MiB; voor
  grotere verzamelingen moet de beheerroute later stapsgewijs gegevens verwerken.
- De broncode van de applicatie, broninhoud en bestaande gebruikersprojecten
  behouden hun functies. Versie 0.1.085 is niet opnieuw verpakt of overschreven.

Tijdens de proef bleek dat de opmaakgenerator oude bouw- en QA-uitvoer meenam.
Die mappen zijn nu uitgesloten. De volgorde van niet-uitvoerbare brongegevens in
de HTML is bovendien vastgezet, zodat deze niet afhangt van de volgorde waarin
modules worden geladen. Broninhoud en Unicode-posities veranderen daardoor niet.
De definitieve HTML, CSS, drie JavaScript-bestanden en het releasemanifest zijn
byte voor byte gelijk tussen de oorspronkelijke en de nieuwe bouwomgeving.

De proef bevatte ook een begrensde bestandstoegangscontrole voor Node. Die
weigerde leesacties naar de oorspronkelijke `round-d`-map. Zij sloot niet alle
historische archieven buiten die map uit. Bijvoorbeeld de relatieve verwijzing
naar `tmp/aw-semantic/semantic-candidate-inputs-r2.json` kwam vanuit beide eerste
installaties nog bij hetzelfde oude bestand uit. Die eerste groene testreeks
bewees daarom nog geen volledig zelfstandige QA-overdracht. De onderstaande
aanvullende proef heeft deze afhankelijkheden expliciet meegenomen en opnieuw
gecontroleerd, zonder de originele bewijzen te wijzigen.
Omdat bouwprocessen bovendien native modules, workers en Python starten, is de
Node-leescontrole geen volledige procesisolatie of beveiligingsaudit.

### Aanvullende proef zonder gedeelde projectarchieven

`work/omnibus-isolated-20261014-01` bevat een eigen geneste checkout, een nieuwe
installatie van 551 pakketten en een nieuw herstelde database. Beide volledige
eindmetingen tellen 2838 geslaagde tests in 312 bestanden, zonder fouten of
overgeslagen tests. Alle 16 browserscenario's en de ongewijzigde TypeScript-
opdracht slagen. De 89 gecontroleerde bouwbestanden, inclusief 83 bronbestanden,
zijn bytegelijk aan de bestaande versie. De backup/herstelroute behoudt
83 pakketten, 8617 records, 110 brondocumenten en 4147 pagina's.

De definitieve build, brede testreeks en browserscenario's proberen onder de
diagnostische Node-controle niet buiten deze nieuwe root uit de oorspronkelijke
werkmap te lezen. Vier TypeScript-metadatapogingen naar bovenliggende mappen
blijven geblokkeerd; de typecontrole heeft hun inhoud niet nodig. De oude checkout,
gedeelde reviewmap, oorspronkelijke PDF-locatie en eerste proefmap zijn met
negatieve controles afgeschermd. Externe Node/Python/browser-runtimes blijven
nodig; dit is geen native procesisolatie, beveiligingsaudit of hostingbenchmark.

De eerdere mislukte metingen blijven bewaard, waaronder 18 bronlinkfouten door
negen ontbrekende originele rapport-PDF's. Na exacte overdracht tegen hun
bestaande hashes is de volledige reeks opnieuw uitgevoerd. Bewijs:
`viewer/work/isolated-transfer-verification-20261014.json` in de hoofdcheckout,
plus `browser-transfer.json`, `browser-features-transfer.json` en
`types-transfer.json` in de nieuwe root. De lokale overdrachtsfase is afgerond.

## Wat nog niet is bewezen

Linux, de uiteindelijke hostingomgeving, PostgreSQL, transportcompressie onder
realistische netwerkbelasting en operationele backup/herstelprocedures moeten
nog worden getest. De brede historische testverzameling slaagt nu ook met eigen
projectarchieven in de aanvullende Windows-installatie. Bestaande reviewbindingen
zijn niet vernieuwd om fouten te verbergen. De externe runtimevereisten en
grenzen van de diagnostische controle blijven gelden.
Nieuwe pakketten en grootschalige invoer wachten op de bijbehorende kwaliteitscontroles.
