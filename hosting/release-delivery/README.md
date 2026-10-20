# Hosting voorbereiden (`hosting/release-delivery/`)

> **In het kort:** een voorbereiding voor de [online versie](../../docs/routekaart.md#pad-a--online-versie). Hier staat hoe het runtimepakket in een container (image) wordt gezet, met de database apart ernaast. Een lokale proef met fictieve gegevens is gedaan (zie de [imagecontrole](../image-verification/README.md)); er is nog niets online gezet.

Aanbevolen route: bouw de bestaande portable runtime op een gecontroleerde
releasewerkplek met een afzonderlijke, goedgekeurde SQLite-publicatie. Maak met
de bestaande packager het runtimepakket. Zet alleen dat pakket in een
`linux/amd64`-image en lever die later via een goedgekeurde private registry aan
Sevalla, vastgezet op digest. Lever SQLite en de expliciete instellingen apart
aan één persistente disk. De gewone Git-checkout blijft code-only.

Dit voegt uitsluitend een lokale contextmaker en een Dockerfile-template toe.
De runtime, packager, pinnen, publicatiemethode en workflows veranderen niet.
Een Dockerfile in de geverifieerde pakketmap zou de bestaande inventaris breken;
daarom staan template en `.dockerignore` erbuiten. Er is geen nieuwe backend,
downloadfunctie, deploytool, dependency of automatisch publicatieproces nodig.

## Onderbouwing en open providergrens

Op 19 oktober 2026 geraadpleegde officiële documentatie:

| Bron | Gedocumenteerd feit en gevolg |
| --- | --- |
| [Sevalla Docker images](https://docs.sevalla.com/applications/docker-images) | Een vooraf gebouwde image wordt zonder providerbuild uitgevoerd. `linux/amd64`, tag of digest en private registrycredentials worden ondersteund. Kies voor elke release een digest; geen veranderlijke `latest`. |
| [Sevalla Dockerfile](https://docs.sevalla.com/applications/builds/dockerfile) | De Git-route bouwt uit de repository/context. Een proces-startcommand vervangt zowel ENTRYPOINT als CMD en gebruikt `/bin/sh -l -c`. `PORT` is de ingestelde webpoort. Een volledige `exec node ... --port "$PORT"` past bij de bestaande expliciete CLI. |
| [Sevalla disks](https://docs.sevalla.com/applications/disks) | SQLite kan op een disk bij één proces met één instantie. De nieuwe mount is leeg en verbergt imagebestanden op hetzelfde pad. Jobs/cronjobs kunnen geen disk krijgen; disks zijn niet deelbaar. Bevestig ontvangst en rechten vóór de eerste appstart. |
| [Sevalla webterminal](https://docs.sevalla.com/applications/web-terminal) | Vereist een draaiende, gereedstaande instantie. Het Files-menu ondersteunt upload/download tot 100 MB, met updatebevoegdheid. Zie het [eerste-startvoorstel](../first-start/README.md); daarmee is die providerprocedure nog niet bewezen. |
| [Docker build context](https://docs.docker.com/build/concepts/context/) en [Dockerfile](https://docs.docker.com/reference/dockerfile/) | De context begrenst COPY; `.dockerignore` filtert vóór de overdracht. De template gebruikt een expliciet geverifieerde context, een exec-entrypoint en een numerieke niet-rootgebruiker. |

**Afleiding voor dit project:** een Git-build mist de afzonderlijke SQLite-input
die onze webcompiler nodig heeft. Een vooraf gebouwd pakket vermijdt dat probleem.
Deze route gebruikt de gemounte disk nergens tijdens de imagebuild. Dat is een
ontwerpkeuze, geen claim dat een Sevalla-build toegang tot die disk zou hebben.

**Eerste diskvulling blijft een harde poort.** De gedocumenteerde webterminalroute
vereist een draaiende, gereedstaande instantie, terwijl onze pakketstart zonder database stopt.
Laat de provider bevestigen hoe de eigenaar vóór de eerste Omnibus-start de disk
kan vullen en de rechten kan instellen. Laat daarbij expliciet bevestigen hoe
beheer toegang krijgt zonder eerst Omnibus-inhoud openbaar te serveren, met welke
UID/GID de terminal werkt en hoe de bestanden buiten logs/shellgeschiedenis blijven.
Een aparte job kan niet op grond van deze docs bij dezelfde disk. Er is hier geen
bootstrapserver, startdownload, extra worker, root-start of lege vervangdatabase
toegevoegd. Zonder bevestigde, goedgekeurde bootstraproute stoppen vóór deployment.

## Bestands- en mountgrenzen

| Plaats | Toegestane inhoud en functie |
| --- | --- |
| Code-Git | Bestaande code en deze voorbereiding. Geen gegenereerde context of echte pinbestanden. |
| Private releasewerkplek, buiten de context | Ontvangen SQLite, exact `database`/`release`/`publication` in het instellingenbestand, inhoudsreview, ontvangstcontrole, backup en privébronverwerking. |
| Nieuwe lokale imagecontext | Alleen `Dockerfile`, `.dockerignore` en `runtime/` met de exact geverifieerde pakketbestanden. |
| Image `/app/omnibus-runtime` | Bestaande Node-server en gecompileerde webbestanden; geen SQLite, instellingen, credentials, private auteursmodules, Workbench, MCP-service of bronarchief. De webbestanden bevatten wél gepubliceerde frontend-/startgegevens: inhoudsrechten blijven nodig. |
| Persistente disk `/var/lib/omnibus` | `releases/<publicatie-sha256>/catalogue.sqlite` en `local-build.json`. Nooit mounten over pakket of webroot. Bewaar vorige versies, overschrijf geen geopende database. |
| Providerconfiguratie | Image-digest, één webproces, expliciete HTTPS-origin, webpoort, diskpad en door de eigenaar beheerde registrycredentials. Credentials komen niet in image, buildargs of Git. |

De template zet pakketbestanden op root-eigendom zonder schrijfrechten en kiest
UID/GID `1000:1000`. Dit is lokaal in een synthetische Linux-imageproef bevestigd,
maar nog niet op Sevalla. De afzonderlijke
versiemap moet voor die gebruiker doorzoekbaar zijn, SQLite en instellingen leesbaar;
schrijfrechten zijn voor de applicatie niet nodig. Laat beheer de rechten buiten
het applicatieproces instellen. Een image-`chmod` verandert geen later gemounte disk.

Het instellingsbestand bij elke database bevat uitsluitend:

```json
{
  "database": "catalogue.sqlite",
  "release": "<exacte-release-sha256>",
  "publication": "<exacte-publicatie-sha256>"
}
```

Dit is een onbruikbaar voorbeeld tot beide placeholders zijn vervangen. De
releasepin, publicatiepin, runtimecontracthash, SQLite-bestandshash,
`runtime-package.json`-hash en uiteindelijke image-digest zijn verschillende
identiteiten. Leg hun koppeling met de gereviewde codecommit buiten Git vast.
De pakketmanifesthash is geen digitale handtekening en de contextmaker verricht
geen inhoudsreview of base-imagescan.

## Operatorstappen, uitsluitend na passende toestemming

Onderstaande release- en providerstappen met echte inhoud zijn **niet uitgevoerd**. Gebruik
nieuwe uitvoermappen, een vertrouwde codecommit en een rustige releasewerkplek.
Geen automatische bronpublicatie, aanpassing van de actieve database of bestaande
runtime-build. Stop na iedere mislukte opdracht; gebruik gedeeltelijke uitvoer niet.

1. Ontvang de goedgekeurde SQLite-publicatie met verwachte pinnen en bestandshash
   via het bestaande private proces. Controleer de hash op de consistente,
   gesloten overdrachtskopie; kopieer geen live SQLite met open WAL-bestanden.
   Bevestig de inhoudsrechten voor webbundels, geregistreerde resources en volledige
   bereikbare documenten. De eigenaar kiest de registry, verantwoordelijke,
   regio, budget en backup-/hersteldoelen. Er is hier geen keuze of dienst geactiveerd.
2. Voer op de releasewerkplek de bestaande ontvangstcontrole, portable build en
   packager uit. Node 24 en de bestaande gecontroleerde frontend-buildomgeving
   moeten beschikbaar zijn; de image heeft geen npm-installatie nodig. Vanuit
   de codecheckout, met eigen bestaande bovenliggende uitvoermap:

   ```powershell
   $settingsFile = '<absoluut-pad-naar-goedgekeurd-local-build.json>'
   $databaseFile = '<absoluut-pad-naar-dezelfde-catalogue.sqlite>'
   $deliveryRoot = '<bestaande-aparte-private-uitvoermap>'
   node scripts/check-runtime-database.mjs --settings "$settingsFile"
   if ($LASTEXITCODE -ne 0) { throw 'Databasecontrole mislukt' }
   npm run build:runtime -- --settings "$settingsFile" --out "$deliveryRoot/web"
   if ($LASTEXITCODE -ne 0) { throw 'Runtimebuild mislukt' }
   node scripts/package-runtime.mjs --web-root "$deliveryRoot/web" --database "$databaseFile" --out "$deliveryRoot/runtime"
   if ($LASTEXITCODE -ne 0) { throw 'Pakketcontrole mislukt' }
   ```

   Vergelijk de ontvangen pinnen en de pakketidentiteiten. Voer de bestaande
   pakketcontrole/smokeproef uit die bij de release hoort; hergebruik onveranderd
   bewijs waar passend. Deze contextmaker vervangt die releasecontrole niet.
3. Laat de eigenaar een exacte officiële Node 24-patch voor `bookworm-slim` en
   de bijbehorende `linux/amd64`-geschikte digest goedkeuren, inclusief beveiligings-
   en onderhoudsreview. De [officiële imagebron](https://github.com/nodejs/docker-node/tree/main/24/bookworm-slim)
   bestaat; een actuele tag/digest wordt hier niet verzonnen of gedownload.
   Maak dan de lokale context; deze opdracht gebruikt alleen Node en bestaande bestanden:

   ```powershell
   $nodeImage = 'node:24.<minor>.<patch>-bookworm-slim@sha256:<goedgekeurde-digest>'
   node hosting/release-delivery/prepare-image-context.mjs --package "$deliveryRoot/runtime" --node-image "$nodeImage" --out "$deliveryRoot/image-context"
   if ($LASTEXITCODE -ne 0) { throw 'Imagecontext geweigerd' }
   ```

   De helper weigert onvolledige pinnen, extra of beschadigde pakketbestanden,
   overlappende mappen en een bestaand uitvoerpad. Hij controleert de gekopieerde
   bytes opnieuw en schrijft een `.dockerignore` met uitsluitend exacte
   bestandsuitzonderingen. Voeg later geen bestanden of Dockerfile-specifieke
   ignorefile toe; houd de context onveranderlijk. De helper vraagt geen databasepad
   en doet geen netwerkverkeer. Zijn resultaat `imageBuilt: false` blijft letterlijk waar.
4. **Imagepoort:** laat een bevoegde operator met een goedgekeurde
   containerbouwomgeving de image bouwen en inspecteren. Gebruik de
   [synthetische imagecontrole](../image-verification/README.md) en herhaal
   relevante controles bij een nieuwe base-image of runtimepakket.
   Onderstaand voorbeeld vervangt die volledige controle niet.
   Het contextpad is de enige bouwinput, nooit de checkout of datamap:

   ```powershell
   $imageTag = 'omnibus-reviewed:local'
   docker build --platform linux/amd64 --network none --tag "$imageTag" "$deliveryRoot/image-context"
   if ($LASTEXITCODE -ne 0) { throw 'Imagebuild mislukt' }
   docker image inspect --format '{{.Os}}/{{.Architecture}} {{.Config.User}}' "$imageTag"
   if ($LASTEXITCODE -ne 0) { throw 'Image-inspectie mislukt' }
   docker run --rm --network none --entrypoint node "$imageTag" --input-type=module -e "import {verifyRuntimePackage} from './local-data/runtime-package.mjs'; verifyRuntimePackage(process.cwd());"
   if ($LASTEXITCODE -ne 0) { throw 'Pakketcontrole in image mislukt' }
   ```

   `--network none` begrenst RUN-instructies, niet een eventueel ophalen van de
   base-image. Bewijs Linux/amd64, gebruiker `1000:1000`, Node/SQLite-ondersteuning,
   pakketbytes, contextuitsluiting, mountrechten en shutdown met synthetische data
   voordat echte inhoud wordt gebruikt. Inspecteer ook imagelagen en inhoud;
   een geslaagde contexttest is geen imagecontrole. Bewaar de bewijsresultaten
   buiten Git. De template installeert geen software en bevat geen databasebuild.
5. **Latere overdrachtspoort:** pas na vrijgave de gecontroleerde image naar de
   gekozen private registry overdragen. Leg de ontvangen registry-digest vast;
   een lokale image-ID is niet automatisch die registry-digest. Kies in Sevalla
   `Docker image` met `registry/naam@sha256:<digest>` en de afzonderlijke
   registrycredential. Gebruik bij elke volgende release opnieuw de expliciete
   digest, ook in de broninstelling; een losse deploymentwijziging is geen
   blijvende bronwijziging volgens de providerdocumentatie. Geen automatische CI nodig.
6. **Vóór de eerste Omnibus-start:** laat de bevestigde bootstrap-/overdrachtsroute
   de disk van het webproces vullen onder de nieuwe versie. Verifieer de
   ontvangen SQLite-bestandshash tegen de private overdracht, leg het instellingen-
   bestand met dezelfde release/publicatie vast en controleer minimale leesrechten.
   De [ontvangsthelper](../data-transfer/README.md) controleert vier vooraf
   vertrouwde pins, maar voert geen netwerktransfer of activatie uit.
   Het [eerste-startvoorstel](../first-start/README.md) beschrijft de open
   provider- en rechtenvragen.
   De concrete transferopdracht blijft open totdat kanaal, toegangsbeheer en eerste
   mounttoegang zijn bevestigd; een download-URL of credential wordt niet uitgevonden.
7. Na die poort en de gezamenlijke ingressvrijgave: één instantie, mount
   `/var/lib/omnibus`, expliciet gekozen webpoort en één volledige startopdracht
   in het Sevalla-webproces. Onderstaand is een provider-shellvoorbeeld, geen
   PowerShell-opdracht; vervang versie en origin door de vrijgegeven waarden:

   ```sh
   exec node /app/omnibus-runtime/scripts/start-runtime-package.mjs --settings /var/lib/omnibus/releases/<publicatie-sha256>/local-build.json --public-origin https://<vrijgegeven-domein> --listen-host 0.0.0.0 --port "$PORT"
   ```

   De shell geeft `PORT` expliciet door; de runtime leest geen env-default en
   weigert een lege/ongeldige waarde. Het volledige commando is nodig omdat de
   provideroverride ENTRYPOINT én CMD vervangt. De bestaande pakketstart controleert
   inventaris, contract en databasepinnen voordat er geluisterd wordt. Stel probes
   pas in met bewezen Host-/proxygedrag; deze template voegt geen probealias toe.
8. Bewijs op de gekozen provider de afzonderlijke vrijgavepunten voor TLS, Host,
   Origin/CORS, probes, logs, misbruikgrens, leesrechten, restart, releasewissel en
   herstel. Bewaar de vorige image-digest plus bijpassende database/settings.
   Een rollback moet beide expliciet kiezen; een code-rollback herstelt SQLite niet.
   Gebruik de bestaande [herstelroute](../../docs/beheer/storingen-en-herstel.md).

## Stopcondities en integratie

- Geen bevestigde eerste diskvulling of onvoldoende rechten voor `1000:1000`:
  niet deployen; geen rechten verruimen of runtimecontract aanpassen als workaround.
- Ontbrekende inhoudsvrijgave, image-/databasepin, registrybesluit, beheerder of
  onafhankelijke backup/herstelafspraak: geen overdracht of publieke start.
- Verkeerde hash, veranderde context, pakket-/databasefout, vereiste tweede
  instantie of probe-/proxygedrag buiten het bestaande contract: stoppen en
  gericht terugleggen bij de integrator; geen controles uitschakelen.

De integrator hoeft runtime/server/packagercontracten niet aan te passen voor
deze route. Neem desgewenst de gerichte testopdracht in de centrale testplanning
op; `package.json` blijft hier ongewijzigd. Als een andere lane runtimebestanden
aan de bestaande pakketallowlist toevoegt, neemt deze contextmaker ze via de
verifieerde inventaris over. Maak na integratie nieuwe pakketten; kopieer geen
nieuwe servercode in een eerder geverifieerd pakket.

Lokale controle zonder Docker:

```text
node --test --test-reporter=tap --test-concurrency=1 --test-timeout=120000 hosting/release-delivery/prepare-image-context.test.mjs
```

Deze tests gebruiken uitsluitend synthetische SQLite en tijdelijke mappen.
Ze controleren staging, bytebehoud, fouten en de Node-expressie uit de template
op de host. Ze draaien geen Dockerparser, image, Linux-permissieproef, HTTP-listener
of providerproef en leveren geen inhoudelijke of menselijke acceptatie.

## Verder lezen

[Runtimepakket](../../docs/beheer/runtime-pakket.md) · [Routekaart](../../docs/routekaart.md)
