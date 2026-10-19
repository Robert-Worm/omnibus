# Databasepublicatie en overdracht

Deze beheerinstructies zijn verplaatst uit de README. Ze horen bij de bestaande
privé-verwerkingsomgeving, niet bij de gewone ontwikkelaarssetup. Nieuwe
rapportbatches zijn momenteel uitgesteld. De opdrachten hieronder geven geen
opdracht of toestemming om een publicatie uit te voeren of te activeren.

Voor applicatieontwikkeling volstaat een aangeleverde database; begin bij
[setup en tests](contributor-setup.md). De [inhoudsoverdracht](content-maintenance.md#codecheckout-en-privé-verwerking)
en [intake-instructies](content-intake.md) blijven leidend voor bronreviews en
ontvangst. Voor het verplaatsbare app-pakket bestaat een afzonderlijke
[runtimehandleiding](runtime-pakket.md).

## Inhoud opnieuw publiceren

Historische bewijsbestanden verplaatsen vraagt een expliciete private
`OMNIBUS_EVIDENCE_MAP`: de code bevat geen terugval naar een persoonlijke
computer of vaste archiefmap. Behoud de originele bewijsidentiteiten en hashes;
de kaart wijst alleen naar de ongewijzigde bestanden op de nieuwe locatie.
Zonder kaart blijft het oorspronkelijke pad gelden; een ontbrekend bestand
blijft een fout, geen aanleiding om een ander bronbestand te gebruiken.

`data:publish-runtime` maakt een nieuwe, zelfstandige runtime-database vanuit de vertrouwde privé-verwerkingsomgeving. Dit vervangt de eenmalige migratiehulpmiddelen; de historische bronreviews en bronbestanden zijn nog steeds nodig aan de beheerderskant. De gewone app-build heeft die omgeving niet nodig.

`npm run data:publish-runtime -- --help` toont de invoer, voorcontrole en
vervolgstappen na de dependency-installatie uit de [setup](contributor-setup.md), zonder privé-bestanden nodig te hebben. Bij een fout sluit de
opdracht af met een foutstatus en een verwijzing naar deze hulp. Gebruik
onvolledige uitvoer niet als databasepublicatie; bestaande uitvoer wordt nooit
automatisch gewist of overschreven.

Fouten binnen de drie acceptatiestappen noemen ook de stap. Zie
[herstellen na een publicatiefout](#herstellen-na-een-publicatiefout) voor de
toegestane correcties en de controles die opnieuw nodig zijn. De oorspronkelijke
fout blijft zichtbaar. Deze labels voegen geen automatische herhaling,
hervatting of mogelijkheid om een review over te slaan toe.

Gebruik uitsluitend de eigen, gereviewde verwerkingscheckout. De opdracht voert daar bestaande JavaScript-modules en broncontroles uit: dit is geen veilige importer voor uploads of code van derden. Kies vooraf een inhoudelijk geaccepteerde bronrelease en de bijbehorende volledige Git-commit. Een hash of geslaagde technische controle is geen nieuwe inhoudelijke goedkeuring.

Bewaar de vier gekozen invoeren in een lokaal `publication-settings.json` buiten
Git. Relatieve paden worden vanaf de map van dit bestand gelezen. Zowel dit
bestand als `local-build.json` gebruikt UTF-8; een enkele UTF-8-bytevolgordemarkering
(BOM) van een Windows-editor is toegestaan. UTF-16 is niet ondersteund:

```json
{
  "sourceRoot": "<private-verwerkingscheckout>",
  "sourceDatabase": "<private-brondatabase.sqlite>",
  "sourceCommit": "<40-tekens-commit>",
  "release": "<64-tekens-bronrelease>"
}
```

Geef bij iedere publicatie alleen de instellingen en een nieuwe uitvoermap op:

```text
npm run data:publish-runtime -- --settings "<publication-settings.json>" --out "work/publication-01"
```

Wil je eerst alleen de gekozen invoer controleren, voeg dan `--check` toe.
Opties mogen in iedere volgorde staan; `--check` heeft geen waarde nodig.
Dubbele opties en het mengen van instellingen met losse invoer blijven verboden.
Deze alleen-lezen controle toetst de schone broncommit, bronrelease,
bijbehorende inhoudsinvoeren en nieuwe uitvoerlocatie. Ze voert geen private
code uit en maakt geen bestanden aan. Een geslaagde controle is geen
inhoudelijke goedkeuring en bewijst niet dat de dependencies, Python en
bronreviews klaarstaan. Laat `--check` weg om daarna de volledige publicatie
met de bestaande reviewgates uit te voeren. Ook die route controleert de invoer
voordat zij een uitvoermap aanmaakt.

De uitvoermap is relatief aan de huidige werkmap. Instellingen kiezen nooit
automatisch de nieuwste commit of release en mogen niet met overrides worden
gemengd. De bestaande losse opties blijven beschikbaar:

```text
npm run data:publish-runtime -- --source-root "<private-verwerkingscheckout>" --source-database "<private-brondatabase.sqlite>" --source-commit "<40-tekens-commit>" --release "<64-tekens-bronrelease>" --out "work/publication-01"
```

De uitvoermap moet nieuw zijn, buiten de broncheckout liggen en een bestaande bovenliggende map hebben. De privé-omgeving moet haar bestaande dependencies, evidence-archieven en Python beschikbaar hebben; stel zo nodig `OMNIBUS_PYTHON` in op de bestaande interpreter.

De opdracht controleert de schone broncommit, draait de bestaande releasecontroles en vergelijkt de benoemde inhoudsinvoeren met de vastgepinde bronrelease. Ze maakt de bronreleasekopie, laadpakketten en gegevenspublicatie in de nieuwe map. Onbekende modules, afwijkende exports, niet-JSON-waarden en veranderde broninvoer blokkeren de publicatie. Daarna voert ze automatisch dezelfde volledige alleen-lezen controle uit als `data:check-runtime`, inclusief bronrelease, pagina's en inventaris. Pas na die controle worden `publication-receipt.json` en `local-build.json` geschreven; er is geen optie om reviews over te slaan. Bij een schrijffout kan alleen het ontvangstbewijs aanwezig zijn: zonder `local-build.json` is de overdracht niet voltooid. Na een fout blijft eventuele onvolledige uitvoer apart staan; kies voor een nieuwe poging een nieuwe map.

De gegenereerde instellingen verwijzen naar `catalogue.sqlite` **naast dat instellingenbestand**. Vergelijk eerst de huidige en kandidaatpublicatie:

```text
npm run data:compare-runtime -- --before local-data/runtime/local-build.json --after work/publication-01/local-build.json
```

Deze opdracht controleert beide vastgepinde databases alleen-lezen en toont
toegevoegde, verwijderde en gewijzigde pakketten, documenten en runtimegegevens.
Ook tekstwijzigingen met gelijke aantallen worden via inhoudshashes zichtbaar;
de tekst zelf wordt niet afgedrukt. Bewaar de uitvoer lokaal bij het reviewbewijs,
niet in Git. Een ongeldige publicatie of dubbelzinnige identiteit geeft `HOLD`
en een foutcode. Een geslaagde vergelijking keurt geen inhoud goed en activeert
niets: beoordeel alle verschillen, vooral onverwachte verwijderingen.

Voor een zuivere toevoeging kun je de vooraf gekozen pakketidentiteit meegeven:

```text
npm run data:compare-runtime -- --before local-data/runtime/local-build.json --after work/publication-01/local-build.json --expect-addition report:NIEUW01
```

Vervang `report:NIEUW01` door het werkelijke `kind:id` uit de overdracht; herhaal
`--expect-addition` voor meerdere pakketten. De controle eist precies die nieuwe
pakketten en weigert wijzigingen of verwijderingen van bestaande pakketten en
brondocumenten. Een afwijking levert `HOLD` en afsluitcode 1, met het volledige
verschiloverzicht en de redenen in `additionCheck`. Zonder deze optie blijft de
gewone vergelijking ongewijzigd beschikbaar voor bewuste inhoudelijke revisies.

`MATCH` betekent alleen dat deze toevoegingsgrens klopt. Nieuwe documenten,
bronartefacten en runtimeverschillen moeten nog worden beoordeeld, net als
norm-/punt-aantallen, brongetrouwheid en viewerwerking. Er is geen automatische
reviewgoedkeuring, build of activatie.

Dezelfde toevoegingscontrole kan direct vóór een **afzonderlijke reviewbuild**:

```text
npm run build -- --settings work/publication-01/local-build.json --out work/review-01 --compare-with local-data/runtime/local-build.json --expect-addition report:NIEUW01
```

`--compare-with` en minstens één `--expect-addition` horen samen en vereisen een
nieuwe `--out`-map. Bij HOLD start geen build en wordt geen uitvoermap gemaakt.
Bij MATCH verschijnt het volledige metadata-verschiloverzicht in de uitvoer,
waarna de gewone vastgepinde build volgt. Het overzicht wordt niet als bestand
in de webmap gezet. Bewaar gewenst bewijs afzonderlijk en privé. Dezelfde opties
werken met `build:runtime`; gewone builds zonder vergelijking blijven ongewijzigd.
Ook een geslaagde reviewbuild activeert niets en vervangt geen inhoudelijke review.

Beoordeel de nieuwe inhoud daarna in een afzonderlijke build:

```text
npm run build -- --settings work/publication-01/local-build.json --out work/review-01
npm start -- --settings work/publication-01/local-build.json --web-root work/review-01 --port 4320
```

`--out` moet een nieuwe map met een bestaande bovenliggende map aanwijzen.
Een bestaande map, bestand of directorylink wordt geweigerd; de kandidaatbuild
wist geen eerdere uitvoer. Gebruik voor iedere poging een nieuwe naam onder
`work/`, zodat gegenereerde inhoud buiten Git blijft. Na een mislukte build
kan onvolledige uitvoer achterblijven: neem die niet in gebruik.

`--web-root` kiest uitsluitend de lokale buildmap. De preview controleert nog
steeds de exacte release-/publicatiebinding en blijft alleen-lezen op loopback.
Kies een vrije testpoort; iedere poort heeft eigen browseropslag. Open een kopie
van een projectbestand om herstel te testen, niet het enige exemplaar van een
onderzoek. Stop de testpreview na afloop met Ctrl+C.

Zonder `--out` en `--web-root` blijven de bestaande opdrachten werken met
`database-build`; de portable build gebruikt standaard `runtime-build`.
Ook `build:runtime` accepteert `--out` voor een aparte portable kandidaat.
Een normale build vernieuwt zijn standaardmap: stop een preview die die map
gebruikt voordat je haar opnieuw bouwt. Bewaar voor herstel de vorige build
én de bijbehorende database-instellingen en database.

De publisher wijzigt geen actieve bouwinstellingen, preview of AI-clientregistratie. Neem een nieuwe publicatie pas expliciet in gebruik na de passende bouw- en workflowcontrole. Nieuwe rapporten of kaders blijven via hun extractieskill en inhoudelijke review binnenkomen; bij wijzigingen aan de gegevensstructuur of authoringlogica moeten ook het codecontract en de adapters worden beoordeeld. De publisher is een herhaalbare overdrachtsbrug, nog geen zelfstandig inhoudsbeheerportaal.

## Herstellen na een publicatiefout

Bewaar de oorspronkelijke foutmelding lokaal en gebruik de mislukte uitvoer niet.
De stap geeft aan waar de controle stopte, niet welke eerdere controles bij een
nieuwe poging mogen vervallen. Ook een fout zonder staplabel, bijvoorbeeld bij
het voorbereiden van aflevergegevens, volgt dezelfde herhaalroute hieronder.

| Foutstap | Herstel vóór een nieuwe poging |
| --- | --- |
| `INPUT_CHECK` | Corrigeer invoerpaden, een verkeerd overgenomen goedgekeurde hash of de uitvoerlocatie; zorg voor een bestaande bovenliggende map en een nieuwe uitvoermap buiten de broncheckout. Herstel ontbrekende bestanden uit de oorspronkelijke goedgekeurde overdracht en gebruik de schone checkout op de gekozen commit. Kies geen andere commit of release alleen om de controle te laten slagen. |
| `CONTENT_REVIEW` | Herstel de gemelde reviewvoorwaarde in de vertrouwde privé-omgeving, bijvoorbeeld de beschikbaarheid van het oorspronkelijke bewijs, dependencies of Python. Moet broninhoud of reviewbewijs veranderen, doorloop dan de bestaande soortspecifieke review en integratie op die eindversie. Kies daarna expliciet de bijbehorende goedgekeurde commit en bronrelease. Een nieuwe commit of een geslaagde intakecontrole is op zichzelf geen goedkeuring. |
| `FINAL_VERIFICATION` | Onderzoek de oorspronkelijke fout: de databasecontrole of het schrijven van de overdrachtsbestanden is mislukt. Herstel de oorzaak in de invoer of omgeving, bijvoorbeeld schrijfrechten voor een nieuwe bestemming. Laat een inhouds- of contractafwijking via de bestaande review-/coderoute oplossen. Bewerk de gegenereerde database niet en maak of kopieer geen ontvangstbewijs of buildinstellingen om de fout te omzeilen. |

Alleen paden of de lokale omgeving herstellen verandert de gekozen goedgekeurde
inhoud niet; bestaande versiegebonden reviews blijven dan bruikbaar. Bij
gewijzigde broninhoud of reviewbewijs moeten de vereiste reviews weer op dezelfde
eindversie aansluiten. Werk de expliciete `sourceCommit`- en `release`-pinnen pas
bij na die beoordeling. HOLD, manifesten en bewijs-/bronhashes worden niet
vrijgegeven of herschreven om een foutmelding weg te krijgen.

Voer na herstel deze twee bestaande opdrachten **na elkaar** uit. Vervang de
voorbeeldpaden door de gekozen instellingen en een nieuwe, nog niet bestaande
uitvoermap. Gebruik in beide opdrachten exact dezelfde invoer en bestemming:

```text
npm run data:publish-runtime -- --settings "<publication-settings.json>" --out "work/publication-02" --check
npm run data:publish-runtime -- --settings "<publication-settings.json>" --out "work/publication-02"
```

1. De eerste opdracht herhaalt `INPUT_CHECK`: schone vastgepinde checkout,
   bronrelease en inventarisbinding, private entrypoints en nieuwe uitvoerlocatie.
   Ze maakt geen uitvoer en voert geen inhoudelijke reviews uit. Stop bij een fout.
2. Alleen na een geslaagde voorcontrole voert de tweede opdracht de volledige
   publicatie uit. Zij herhaalt `INPUT_CHECK` en `CONTENT_REVIEW`, maakt nieuwe
   aflevergegevens en voert `FINAL_VERIFICATION` uit: dezelfde alleen-lezen
   databasecontrole als `data:check-runtime`, gevolgd door het exclusief schrijven
   van ontvangstbewijs en buildinstellingen. Bij elke nieuwe fout opnieuw de
   oorzaak herstellen en deze route volgen; een aangemaakte map niet hergebruiken.

Een losse `data:check-runtime`-controle kan bij diagnose helpen, maar rondt een
mislukte publicatie niet af en voert de private bronreviews niet uit. Ook alleen
een `publication-receipt.json` is geen voltooide overdracht: het schrijven van
`local-build.json` kan daarna nog falen. Wacht op succesvolle afronding van de
volledige opdracht; hervatten of bestanden handmatig aanvullen is niet ondersteund.
Daarna blijven de hierboven beschreven vergelijking, afzonderlijke reviewbuild
en passende workflowcontrole nodig vóór bewuste activatie. De actieve publicatie
wordt door deze herstelroute niet omgeschakeld.

## Een verplaatsbare databasekopie maken

Maak een consistente, gecontroleerde kopie naar een nieuw bestand. Vervang de
voorbeeldwaarden door de ontvangen database en hashes. Gebruik een absoluut
invoerpad; een relatief databasepad uit `local-build.json` moet eerst vanaf de
map van dat instellingenbestand worden opgelost. De doelmap moet bestaan:

```text
npm run data:runtime-backup -- --from "<absoluut-pad/catalogue.sqlite>" --to "<nieuw-backupbestand.sqlite>" --release "<64-tekens-bronrelease>" --publication "<64-tekens-runtimepublicatie>"
```

De opdracht gebruikt SQLite-backup, controleert de kopie en weigert bestaande doelbestanden. Ze neemt ook de publicatie en afgeleide laadpakketten mee. Draag de kopie en de twee hashes apart van Git over; pas op de ontvangende computer alleen het lokale databasepad aan. Kopieer geen draaiende SQLite-bestanden met de bestandsverkenner.

De oudere `data:backup`/`data:restore`-route bewaart bronreleases, maar niet deze afgeleide runtimepublicatie. Gebruik voor deze zelfstandige applicatieroute daarom `data:runtime-backup`.
