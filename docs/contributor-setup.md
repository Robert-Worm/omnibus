# Setup en tests voor ontwikkelaars

De opdrachten en bestandsnamen hieronder volgen de geïntegreerde codebasis van
19 oktober 2026. Raadpleeg bij een latere checkout ook
[package.json](../package.json) en de [routekaart](routekaart.md).

## Vereisten en installatie

Werk vanuit de root van een eigen codecheckout, met Git, Node **24.17.0** en
npm **11.13.0**. Die combinatie is getest op Windows en Ubuntu 24.04. De lagere
`engines.node`-grens in package.json is geen bewijs dat alle databasefuncties
op iedere toegestane Node-versie zijn getest. De applicatie gebruikt `node:sqlite`.

```text
node --version
npm --version
npm ci --workspaces=false --ignore-scripts --no-audit --no-fund
```

Installeer in deze checkout, met de bestaande lockfile. Deel geen `node_modules`
met een andere checkout of ander besturingssysteem. De installatie haalt
npm-pakketten op; zij ontvangt geen broncollectie. Lifecycle-scripts blijven
uitgeschakeld. Python en de privé-verwerkingsomgeving zijn niet nodig voor de
gewone applicatiebuild of de hieronder genoemde zelfvoorzienende tests.

## Eerste controle zonder database

Voer na de installatie vanuit de checkout de volledige zelfvoorzienende keten
uit:

```text
npm test
```

Deze opdracht controleert typen en lint en draait alle opgenomen fixturegroepen,
ook de runtime, publicatietools, Workbench en lokale AI-invoer. Er is geen private
database, provideraccount of browserprofiel nodig. De fixtures maken hun eigen
synthetische databases en sommige tests openen tijdelijk een loopbackserver.
`npm run test:code-only` is alleen de kleinere basisgroep met de Git-grenscontrole;
die opdracht vervangt de volledige keten niet. Kies bij latere wijzigingen de
gerichte controles uit de tabel hieronder.

Een gewone `npm run build` zonder argumenten hoort in deze lege checkout met
afsluitcode 1 te stoppen. De melding bevat `Usage: build:database` en noemt
`--settings` of de combinatie `--database`, `--release` en `--publication`.
Er ontstaat geen `database-build`. Dit is de verwachte gegevensgrens, geen reden
om uitgesloten bestanden terug te kopiëren of een lege database aan te maken.
Ontvang voor een echte build de gegevens zoals hieronder beschreven.

Voor een herhaalbare Linux-proef: werk in een nieuwe lokale clone, met een eigen
npm-cache en tijdelijke bestanden onder `work/` (die map staat in `.gitignore`).

## Een database ontvangen

De openbare database staat bij de [releases](https://github.com/Robert-Worm/omnibus/releases/latest) als `omnibus-database-*.zip`.
Pak die uit in `local-data/runtime/`: de zip bevat `catalogue.sqlite`,
`local-build.json` met de juiste hashes, en controlegetallen. Ga daarna door
met de controle hieronder.

Werk je met een andere publicatie, vraag de inhoudsbeheerder dan via het
afgesproken private kanaal om een voorbereide runtime-database en twee
vastgelegde hashes:

- `release`: de bronrelease;
- `publication`: de exacte runtimepublicatie voor de applicatie.

Beide zijn 64 kleine hexadecimale tekens. Een database met alleen bronrecords
is niet voldoende: ook `web_resources` en `runtime_publications` moeten aanwezig
zijn. De gewone build maakt die ontbrekende publicatie niet aan. Hashes bewaken
integriteit; ze zijn geen digitale handtekening of bewijs van bronrechten.

Bewaar bijvoorbeeld `catalogue.sqlite` en `local-build.json` samen in
`local-data/runtime/`, een genegeerde map. De database mag ook buiten de checkout
staan. Het instellingenbestand bevat precies deze drie velden; vervang de
hashomschrijvingen door de afzonderlijk ontvangen waarden:

```json
{
  "database": "catalogue.sqlite",
  "release": "<64-tekens-bronrelease>",
  "publication": "<64-tekens-runtimepublicatie>"
}
```

Gebruik UTF-8; een enkele UTF-8-BOM is toegestaan, UTF-16 niet. Een relatief
databasepad begint bij de map van dit instellingenbestand. Er is geen
automatische zoekactie naar instellingen en `--settings` mag niet met losse
database- of hashopties worden gecombineerd.

```text
npm run data:check-runtime -- --settings local-data/runtime/local-build.json
```

Deze controle leest de database en toetst integriteit, verwijzingen, publicatie,
laadpakketten en het codecontract. Zij verandert niets en vervangt geen
inhoudelijke review. Controleer een nieuwe of opnieuw overgedragen publicatie;
herhaal geen bronreview voor iedere gewone codewijziging. Bewaar lokale paden en
controle-uitvoer buiten Git.

## Een wijziging bekijken

De eenvoudige startopdrachten staan in de [README](../README.md#lokaal-bouwen-en-starten).
`build` en `build:database` gebruiken hetzelfde script; `start`, `dev` en
`dev:database` gebruiken dezelfde loopbackpreview. Dit is geen HMR-server.
Bouw opnieuw na een codewijziging en herstart de preview.

Een gewone build vernieuwt `database-build`. Als daar al een preview uit draait,
gebruik dan een aparte uitvoermap en vrije poort. Maak eerst zelf de genegeerde
bovenliggende map `work/`, en kies voor iedere poging een nog niet bestaande
naam, bijvoorbeeld:

```text
npm run build -- --settings local-data/runtime/local-build.json --out work/review-01
npm start -- --settings local-data/runtime/local-build.json --web-root work/review-01 --port 4320
```

Open `http://127.0.0.1:4320/`. Een bestaande uitvoermap wordt geweigerd; mislukte
uitvoer blijft apart staan en mag niet als werkende build worden gebruikt. De
preview controleert release, publicatie en codecontract vóór het starten.
Een mismatch vraagt een passende database/build, geen aangepaste hash of lege
vervangende data. Stop alleen je eigen testpreview met Ctrl+C.

Browseropslag hoort bij de volledige oorsprong, inclusief host en poort.
`127.0.0.1`, `localhost` en een andere poort delen dus niet vanzelf hetzelfde
project. Gebruik **Bewaar project** en **Open project** om een projectkopie over
te brengen. Test met een fictief project of toegestane kopie. Browseropslag kan
vol raken of worden gewist; downloadbare projectbestanden blijven nodig voor
herstel. Een Git-commit bevat ze niet.

Voor lokale AI gebruik je dezelfde instellingen met de agent-buildopdracht uit
[de README](../README.md#lokale-ai-koppeling). Die opdracht
schrijft alleen een afgeleide build/index in deze checkout en wijzigt geen
AI-clientregistratie. Volg daarna de [MCP-handleiding](../agent-tools/README.md).
Voor het verplaatsbare app-pakket is er de
[runtimehandleiding](runtime-pakket.md).

## Passende controles kiezen

De volgende opdrachten gebruiken code of synthetische fixtures, zonder echte
rapportarchieven of onderzoeksprojecten. Voer ze uit na de dependency-installatie.
Kies de controles voor de geraakte grens; een tekstcorrectie vraagt geen volledige
runtimeproef.

| Wijziging of controle | Opdracht | Wat dit controleert |
| --- | --- | --- |
| Git- en gegevensgrens | `npm run check:code-only` | Getrackte/indexbestanden en bereikbare Gitgeschiedenis, uitgesloten paden en herkenbare geheimpatronen |
| Zelfvoorzienende basis | `npm run test:code-only` | Dezelfde grens, plus de fixturetests uit `code-snapshot.json` |
| TypeScript en ondersteunde frontend-lint | `npm run check:types` en `npm run lint` | Projecttypen en de expliciet afgebakende lintbestanden |
| Frontendgedrag | `npm run test:frontend` | Opslagstatus, materiaalscope en toelating van bouwstenen |
| Databasebuild en leesruntime | `npm run test:runtime` | Publicatie, startvoorwaarden, alleen-lezen server, buildroutes en runtimepakket |
| Bronlezers en exportprofielen | `npm run test:source` | Gerichte typen en synthetische bron-/filter-/werkboekcontroles |
| Modelpresentatie en formuleringen | `npm run test:models` | Gerichte typen en model-/formuleringstests |
| Intake en databaseoverdracht | `npm run test:content-handoff` | Gerichte intakechecks en synthetische pakket-/databaseoverdracht |
| Publicatietools | `npm run test:publisher` | Synthetische bron-, review-, uitvoer- en publicatiegrenzen |
| Software-inventaris | `npm run test:release` | Lockfilegebonden generatie van de lokale SBOM |
| Content Workbench | `npm run test:workbench` | Eigen store-, server-, evidence- en backupfixtures |
| Lokale AI-invoer | `npm run test:agent:input` | Synthetische invoergrenzen en expliciet akkoord; geen private bronbuild |

`npm run test:agent:protocol` is een afzonderlijke integratieproef na een
agent-build met bewust aangeleverde inhoud. Zie de [MCP-handleiding](../agent-tools/README.md).
Deze proef hoort niet bij een lege code-only CI-omgeving.

`check:code-only` leest de Git-index en geschiedenis, niet willekeurige ongetrackte
bestanden. Controleer en stage de bedoelde wijzigingen vóór de laatste controle.
De patrooncontrole is geen volledige secretscanner. `lint:all` is een bredere
inventarisatie; `format` kan bestanden herschrijven en is geen leescontrole.

Sommige tests openen tijdelijke lokale servers en hebben loopbacktoegang nodig.
Publicatietests gebruiken tijdelijke Git-repositories; dit is geen echte
inhoudspublicatie. Los een fout bij de relevante grens op en vermeld ontbrekende
voorwaarden eerlijk. Verwijder geen test of inhoudscontrole om een groen resultaat
te krijgen.

`npm test` begint met typen en lint en voert daarna de zelfvoorzienende suites
uit. De losstaande auth-proef en haar access-/identitytests zijn verwijderd.
Voor deze setup is geen provideraccount of aanmeldproef nodig. De getrackte
code-only CI-workflow kan uitsluitend handmatig worden gestart, bevat geen
private database of secrets en is geen deployment. Voer deze pas uit nadat
het toegestane gratis gebruik is bevestigd; lokale tests blijven beschikbaar.

De oorspronkelijke inhoudsgebonden reviews blijven in de private
verwerkingsomgeving. Zij zijn niet door de fixtures vervangen of als geslaagd
overgeslagen. Vermeld bij nieuw testbewijs je eigen
commit, omgeving, opdracht, resultaat en beperkingen.

## Bekende beperkingen

- Een clone bevat geen werkende broncollectie. Browser- en agent-builds vereisen
  afzonderlijk aangeleverde, onderling passende gegevens en hashes.
- Oude projectbestanden kunnen verwijzen naar ontbrekende bronversies. Importeer
  geen vervangende bron onder dezelfde identiteit om zo'n bestand te laten openen.
- Lokale tests en eerdere Windows-/Linux-proeven bewijzen geen publieke hosting,
  volledige toegankelijkheid of capaciteit voor 100 of 9.000 rapporten. Grote
  browserbundels blijven een aandachtspunt in de bestaande voortgang.
- De lokale MCP-server werkt via STDIO. Een cloudclient die alleen een publieke
  URL ondersteunt kan hier niet rechtstreeks mee verbinden. Accounts en een
  remote MCP-dienst vallen buiten de huidige scope.
- De onafhankelijke menselijke overdrachtsproef (EP02-S04), publieke
  beveiligingsvrijgave en bronrechtencontrole zijn
  nog afzonderlijke stappen. Deze documentatie is daarvoor geen vervangend bewijs.

[Terug naar de README](../README.md) · [Bijdragen](../CONTRIBUTING.md)
