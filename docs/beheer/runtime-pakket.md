# Runtimepakket

> **In het kort:** een runtimepakket is Omnibus zonder ontwikkelomgeving: de gebouwde app plus de lokale server. Handig om Omnibus naar een andere computer over te zetten, en de basis voor een latere online versie.

Het runtimepakket bevat de gebouwde Omnibus-interface en de bestaande alleen-lezen server, zonder ontwikkelomgeving, npm-installatie of database. Je hebt Node 24 en een database nodig. Standaard start het alleen lokaal op `127.0.0.1`. De hostingopties hieronder zijn voorbereiding, geen toestemming om het pakket openbaar te maken.

## Bouwen en starten

Voor latere hosting: [imagecontext voorbereiden](../../hosting/release-delivery/README.md).
Dat gebruikt het bestaande pakket; geen database in de image, geen automatische
upload of deployment. `npm run test:hosting-preparation` controleert deze helpers
met synthetische fixtures en loopback. Imagebouw en providerbewijs blijven apart.

Voer vanuit de codecheckout uit, met de bestaande privé-bouwinstellingen:

```powershell
$settingsFile = (Resolve-Path local-data/runtime/local-build.json).Path
$buildSettings = Get-Content $settingsFile -Raw | ConvertFrom-Json
$buildSettings.database = [System.IO.Path]::GetFullPath($buildSettings.database, (Split-Path $settingsFile))
npm run build:runtime -- --settings $settingsFile
npm run package:runtime -- --web-root runtime-build --database $buildSettings.database --out work/runtime-01
```

`build:runtime` gebruikt dezelfde React/Vite-applicatie, viewers, exports en gegevenscontrole. De uitvoer gaat naar `runtime-build`; `database-build` en de actieve lokale versie blijven ongemoeid. Alleen de lokale AI-startconfiguratie verschilt: het pakket bevat geen persoonlijk computerpad en toont de bestaande uitleg dat een online AI-koppeling nog niet beschikbaar is. De afzonderlijke lokale AI-service blijft ongewijzigd.

De bovenliggende uitvoermap moet bestaan en de doelmap moet nieuw zijn. De packager controleert eerst de bronrelease, gegevenspublicatie en het codecontract. Daarna kopieert hij uitsluitend de vaste runtimebestanden, HTML, releasebeschrijving en toegestane gebouwde assets. Hij vervangt geen bestaande map. Na een fout blijft eventuele onvolledige uitvoer herkenbaar apart; kies een nieuwe doelmap voor een nieuwe poging.

Start op Windows of Linux vanuit de gemaakte pakketmap:

```text
node scripts/start-runtime-package.mjs --database "<absoluut-pad-naar-private.sqlite>" --port 4322
```

`npm start -- --database "<absoluut-pad-naar-private.sqlite>" --port 4322` is gelijkwaardig. Een `npm install` is niet nodig: de server gebruikt alleen Node-modules. De browserbundels bevatten uiteraard hun bestaande frontendbibliotheken en startgegevens. Behandel ook dit pakket als lokale uitvoer; het is geen toestemming om broninhoud te publiceren.

Ook `--settings "<pad-naar-local-build.json>"` wordt ondersteund. Bewaar instellingen en database buiten de pakketmap. De start controleert dan naast de pakketidentiteit ook de gekozen release en publicatie uit dat instellingenbestand.

## Expliciete hostingopties — standaard uitgeschakeld

De startlaag accepteert de onderstaande opties alleen als complete configuratie.
De startlaag, gedeelde originvalidator, publieke requestgrens en het burstbudget
zijn geïntegreerd. Beide echte CLI-routes zijn met synthetische
data op loopback getest, inclusief het zelfstandige pakket zonder dependencies.
Er is geen publieke listener gestart. Een echte hosted vrijgave blijft een
afzonderlijk besluit; de localhost-probealias van een provider is niet toegestaan
zonder bewijs en afzonderlijke beoordeling.

| Optie | Voorwaarde |
| --- | --- |
| `--public-origin` | Eén canonieke HTTPS-origin, bijvoorbeeld `https://omnibus.example.invalid`. Exact opgegeven: geen gebruikersnaam/wachtwoord, pad, afsluitende slash, query, fragment, hoofdlettercorrectie, trailing dot, wildcard of overbodige `:443`. Een expliciete niet-standaardpoort zoals `:8443` mag wel. |
| `--listen-host` | Alleen exact `127.0.0.1` of `0.0.0.0`, altijd samen met `--public-origin`. Een luisteradres zonder origin wordt ook voor loopback geweigerd. De server-API houdt loopback als standaard; de startroutes eisen in hostingmodus een bewuste keuze. |
| `--port` | Verplicht expliciet in hostingmodus: decimale gehele poort 1–65535, zonder voorloopnul of andere normalisatie. Geen automatische overname van `PORT` of andere omgevingsvariabelen. De operator kan een providerpoort later zelf als argument doorgeven. |
| Database en pinnen | `--database` plus afzonderlijke `--release` en `--publication`, beide exacte 64-tekens SHA-256 in kleine letters; of één expliciet `--settings`-bestand met precies deze drie velden. Geen menging of overrides. De hostingstart leidt geen ontbrekende pin af uit de webbuild. |
| Webroot | `serve-database-web.mjs` vereist in hostingmodus expliciet `--web-root`. `start-runtime-package.mjs` gebruikt uitsluitend de gecontroleerde `database-build` binnen het gekozen pakket en weigert een hosting-override met `--web-root`. De database blijft buiten het pakket. |

Onbekende of dubbele vlaggen, aliassen zoals `--host` en `--origin`, en
`--vlag=waarde` worden geweigerd. Dezelfde hostingvoorwaarden gelden voor de
geëxporteerde startfuncties: wegvallen van een optie activeert nooit een lokale
terugval. De gewone lokale CLI behoudt poort 4319 (of expliciet 1024–65535);
programmatic lokale tests kunnen nog steeds poort 0 gebruiken. Er komen geen
hostingvelden in het database-instellingenbestand of in de pakketmanifestindeling.

Voorbeeld voor **bewuste loopbackvalidatie**;
alle paden en pinnen moeten door echte gecontroleerde waarden worden vervangen:

```text
node scripts/start-runtime-package.mjs --database "<apart-pad-naar-private.sqlite>" --release "<release-sha256>" --publication "<publicatie-sha256>" --public-origin https://omnibus.example.invalid --listen-host 127.0.0.1 --port 8080
```

Dezelfde opties gelden voor `scripts/serve-database-web.mjs`, met aanvullend
`--web-root "<expliciete-webbuild>"`. Het synthetische domein is alleen een
configuratie-/headerwaarde; er wordt geen verbinding mee gemaakt. De expliciete
keuze `0.0.0.0` is bedoeld voor een later goedgekeurde host en wordt in deze
tranche alleen door de parser getoetst, nooit als listener gestart.

De nieuwe starttests gebruiken een serverdubbel voor de doorgifte van
`{port, webRoot, publicOrigin, listenHost}` en echte synthetische publicaties en
pakketinventarissen voor de voorafgaande controles. Dat bewijst argumentvalidatie,
pinvergelijking, integriteit en doorgifte. De integrator heeft daarnaast met
`scripts/hosting-start-integration.test.mjs` beide echte CLI-processen en de
publieke verzoekafhandeling op loopback bewezen, zonder testdubbel. Bestaande
lokale pakkettests blijven van toepassing. Startfouten aan de CLI blijven kort
en geredigeerd, zonder ingevoerde waarden, bestandsinhoud of stacktrace.

## Controle bij overdracht en start

`runtime-package.json` bevat de exacte bestandsinventaris, bytegroottes, SHA-256-hashes en de release-/publicatie-/contractidentiteiten. Gewijzigde of ontbrekende bestanden, extra bestanden, ongeldige paden en symlinks blokkeren de verificatie. Databases, oorspronkelijke documenten, secrets, tests, sourcemaps, `node_modules` en publicatiehulpmiddelen worden niet meegenomen. De database moet buiten de pakketmap staan en wordt alleen-lezen geopend.

De inventaris detecteert onbedoelde wijzigingen, maar is geen digitale handtekening. Wie het pakket én de inventaris kan wijzigen, kan nieuwe hashes maken. Ontvang pakket en verwachte identiteiten via een vertrouwd kanaal en gebruik later een gecontroleerde releaseprocedure. Pak een nieuwe versie in een nieuwe map uit, verifieer en test die voordat een bestaande versie wordt vervangen.

De server begint pas te luisteren na pakket- en databasecontrole. `GET /api/v1/health` geeft de gekozen alleen-lezen modus terug: `local-read-only` of expliciet `public-read-only`. Beide probes weigeren querysyntaxis, ook een kale `?`. Shutdown laat actieve leesverzoeken maximaal vijf seconden afronden. Browserprojecten blijven aan hun oorspronkelijke adres gekoppeld; breng een project naar een ander adres over met **Bewaar project** en **Open project**.

Alleen in expliciete publieke modus deelt de hele listener één burstbudget:
120 directe toelatingen, daarna aanvulling met 60 per seconde tot maximaal 120.
Bij uitputting volgt 429, `Retry-After` en no-store vóór inhouds-/readinesslezing.
Probes delen het budget; forwarded IP-headers, andere sockets en URL's geven geen
nieuwe voorraad. Lokale modus krijgt geen extra rategrens. De bestaande 32
actieve antwoorden, 128 verbindingen en 30-secondenresponsegrens blijven gelden.
Dit zijn beginwaarden, geen hosted capaciteits-, fairness- of DDoS-garantie.
Een overbelaste probe mag later geen onbeheerst herstartpatroon veroorzaken.

### Lokale gereedheid en capaciteitsgrenzen

`GET /api/v1/ready` controleert bij een webbuild de oorspronkelijke alleen-lezen
databaseverbinding en de bij start geverifieerde release-/publicatie-/contractpinnen.
Een gereed proces antwoordt 200 met `status: "ready"`; een onleesbare of gewijzigde
database geeft 503 met `status: "not-ready"` en `Retry-After: 1`. Beide antwoorden
zijn `no-store` en bevatten geen paden, inhoud of pinwaarden. Queryparameters zijn
niet toegestaan. Losse catalogustooling zonder webbuild biedt deze route niet aan.

Een tijdelijke SQLite-lock kan herstellen. Een waargenomen databasecommit,
verloren pin of vervangen/gesloten verbinding vereist een nieuwe gecontroleerde
start: de probe accepteert nooit stilzwijgend een nieuwe baseline. Schrijf daarom
niet in de geopende runtime-database; publiceer naar een afzonderlijke versie en
schakel later bewust om. De probe leest kleine metadatavelden, niet alle bronhashes,
en bewijst geen volledige bestandsintegriteit of harde OS-I/O-deadline.

Alle routes, ook health en ready, delen per server maximaal 32 actieve antwoorden,
128 verbindingen en een absolute antwoorddeadline van 30 seconden. Overbelasting
kan dus ook een probe 503 geven. De bestaande Host-/Origin-/invoercontroles blijven
vooraf gelden. Deze capaciteitsgrenzen zijn onafhankelijk van het aanvullende
publieke burstbudget; geen eerlijke verdeling per gebruiker, query-annulering of
publieke DoS-bescherming.

## Grens naar echte hosting

### Begrensde HTTP-controle vóór de demo

Gebruik vanuit de **codecheckout** de bestaande operatorcontrole tegen een al
gestart pakket. Zij start of wijzigt niets. Zonder argumenten toont zij alleen
hulp en maakt zij geen verbinding. Het hulpmiddel hoort niet in de webroot.

```text
node scripts/hosting-acceptance.mjs --run --target http://127.0.0.1:8080 --public-origin https://omnibus.example.invalid --package "<geverifieerd-runtimepakket>" --release "<releasehash>" --publication "<publicatiehash>" --approved-resource "<hash-uit-het-pakketmanifest>" --excluded-resource "<hash-van-bestaande-maar-uitgesloten-resource>"
```

Gebruik de werkelijk gekozen pinnen en resources. De uitgesloten resource moet
bekend aanwezig zijn in de database, maar ontbreken in de webpublicatie: een
verzonnen hash bewijst niet dat bestaande niet-openbare inhoud afgeschermd is.
De controle verifieert het lokale pakket vóór het eerste verzoek.

Zestien opeenvolgende GET-verzoeken controleren health, readiness, startpagina,
één JavaScript-bundel, één toegestane resource en uitgesloten routes. De bundel
wordt met gzip opgevraagd en moet na uitpakken exact overeenkomen met het
vertrouwde pakket. Ontbrekende compressie, gewijzigde inhoud, beschadigde gzip,
onveilige headers of een overschreden limiet geven een mislukte controle.
De overige verzoeken gebruiken ongecomprimeerde antwoorden.

Grenzen: drie seconden per verzoek, dertig seconden totaal; maximaal 8 MiB per
antwoord en 24 MiB totaal, **afzonderlijk voor ontvangen en uitgepakte bytes**.
Er zijn geen retries of redirects. Uitvoer bevat alleen controlenamen,
statuscodes, byteaantallen en tijden; geen antwoordinhoud. Afsluitcode 0 betekent
dat deze steekproef slaagt, 1 een mislukte controle en 2 geweigerde invoer.

Voor de later goedgekeurde host vereist de hulp expliciet `--allow-external`
en een HTTPS-target dat exact gelijk is aan `--public-origin`. Gebruik dat nu
niet als impliciete toestemming voor een hostproef. Een geslaagde lokale run
bewijst geen hosted snelheid, providerprobes, browserwerking, volledige
collectie-integriteit of onafhankelijke beveiligingsacceptatie.

### Nog te bewijzen op de host

Historisch bewijs van de eerdere pakketroute: lokaal getest op Windows en Ubuntu 24.04 met Node 24.17.0, met 59 geslaagde ondersteunde tests. Beide pakketversies behielden in de browserproef selecties, vraagkoppelingen, bronmarkeringen en projectoverdracht; de drie Excel-werkvormen hadden dezelfde uitgepakte inhoud als de eerdere Windows-preview. De brondata en actieve lokale versie zijn toen niet vervangen. Dit is geen nieuwe browser-/Linuxtest van latere wijzigingen.

Dit pakket introduceert geen tweede backend of hostingprovider. De bestaande uitrolcontracten blijven leidend. Voor een publieke pilot ontbreken nog:

- Providerbewijs voor de geïmplementeerde server-/proxy-/Host-/Origin-/CORS-grens, toegestane broninhoud en onafhankelijke publieke review.
- Aantoonbare SQLite-persistentie, minimale leesrechten, TLS en geteste readiness/restart op Sevalla.
- Begrensd verkeer, providerlogprivacy, afzonderlijke backup en herstelproef, releasebescherming en onafhankelijke menselijke beveiligingsreview.

Pas daarna kan een hosted startconfiguratie worden vrijgegeven. De loopbackserver of lokale STDIO-AI-service rechtstreeks online zetten is geen ondersteunde tussenoplossing. Zie de [routekaart](../routekaart.md). Sinds het scopebesluit van 19 oktober zijn applicatieaccounts en betalingen verwijderd uit de productscope; SQLite blijft behouden en de bestaande lokale MCP-demo is actief.

Deze startopties leveren geen authenticatie, providerconfiguratie of
probe-authority-alias. Onder meer de werkelijke proxy-/TLS-/Host-/probeheaders,
probe-isolatie, providerlogs, misbruikgrenzen, opslag/herstart en herstel blijven
hostingchecks die nog moeten gebeuren voordat Omnibus online gaat.
Een publieke origin is geen toegangscontrole voor vertrouwelijke inhoud.

## Samengevat

- `build:runtime` bouwt de app, `package:runtime` maakt het pakket.
- Het pakket start standaard alleen lokaal; hostingopties staan uit tot je ze bewust instelt.
- De database zit niet in het pakket en blijft apart.

## Volgende stap

Lees [storingen en herstel](storingen-en-herstel.md) voor back-up en herstel.
