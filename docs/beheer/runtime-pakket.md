# Runtimepakket

<!-- paginatype: taak -->

> **In het kort:** een runtimepakket is Omnibus zonder ontwikkelomgeving: de gebouwde app plus de lokale server. Handig om Omnibus naar een andere computer over te zetten, en de basis van de online versie.

## Wanneer gebruik je dit?

- Je wilt Omnibus op een andere computer zetten, zonder ontwikkelomgeving.
- Je bereidt de [online versie](../routekaart.md#pad-a--online-versie) voor; het pakket is de basis van de image.

## Stap voor stap

1. **Bouwen.** `npm run build:runtime` bouwt de app met je instellingen.
2. **Verpakken.** `npm run package:runtime` zet de app en de server in een nieuwe map. De database gaat níet mee.
3. **Overzetten.** Kopieer de pakketmap naar de andere computer. Zet de database er apart naast, buiten de pakketmap.
4. **Starten.** Start vanuit de pakketmap met `node scripts/start-runtime-package.mjs`, met het pad naar de database en een poort. Open daarna het adres in je browser.

Bij elke start controleert het pakket zichzelf en de database. Klopt er iets niet, dan start het niet. De volledige opdrachten, voor Windows en voor macOS en Linux, staan hieronder bij de technische details.

## Goed om te weten

- Het pakket start standaard alleen op je eigen computer (`127.0.0.1`). De opties voor online gebruik staan uit tot je ze bewust instelt.
- Je hebt alleen Node 24 nodig; `npm install` is niet nodig.
- Een pakket maken is geen toestemming om inhoud openbaar te maken.

## Technische details

Het runtimepakket bevat de gebouwde app en de server die alleen leest. Er zit geen ontwikkelomgeving, geen npm-installatie en geen database in. Je hebt alleen Node 24 en een database nodig. Het pakket start standaard alleen op je eigen computer (`127.0.0.1`). De opties voor online gebruik hieronder zijn voorbereiding: ze geven geen toestemming om het pakket openbaar te maken.

### Bouwen en starten

Voer de opdrachten uit vanuit de map van de repository, met je eigen, private instellingen.

**Windows (PowerShell)**

```powershell
$settingsFile = (Resolve-Path local-data/runtime/local-build.json).Path
$buildSettings = Get-Content $settingsFile -Raw | ConvertFrom-Json
$buildSettings.database = [System.IO.Path]::GetFullPath($buildSettings.database, (Split-Path $settingsFile))
npm run build:runtime -- --settings $settingsFile
npm run package:runtime -- --web-root runtime-build --database $buildSettings.database --out work/runtime-01
```

**macOS en Linux (bash)**

```bash
settingsFile="$(cd "$(dirname local-data/runtime/local-build.json)" && pwd)/local-build.json"
database="$(node -e 'const p=require("node:path"),f=process.argv[1];console.log(p.resolve(p.dirname(f),require(f).database))' "$settingsFile")"
npm run build:runtime -- --settings "$settingsFile"
npm run package:runtime -- --web-root runtime-build --database "$database" --out work/runtime-01
```

Wat de opdrachten doen:

- **`build:runtime`** bouwt dezelfde app als de gewone build, met dezelfde schermen, exports en controles. De uitvoer komt in `runtime-build`. Je gewone build (`database-build`) blijft onaangeroerd. Eén verschil: het pakket bevat geen pad van jouw computer voor de AI-koppeling, en laat zien dat een online AI-koppeling nog niet bestaat.
- **`package:runtime`** controleert eerst of release, publicatie en code bij elkaar horen. Daarna kopieert hij alleen de vaste serverbestanden, de gebouwde app en een beschrijving. De bovenliggende map moet bestaan; de doelmap moet nieuw zijn. Gaat er iets mis, dan blijft de halve uitvoer herkenbaar apart staan. Kies dan een nieuwe doelmap.

Starten op Windows of Linux, vanuit de pakketmap:

```text
node scripts/start-runtime-package.mjs --database <absoluut-pad-naar-private.sqlite> --port 4322
```

- `npm start -- --database <pad> --port 4322` doet hetzelfde.
- In plaats van `--database` kun je `--settings <pad-naar-local-build.json>` gebruiken. De start controleert dan ook de release en publicatie uit dat bestand.
- Bewaar instellingen en database **buiten** de pakketmap.
- `npm install` is niet nodig: de server gebruikt alleen onderdelen die in Node zitten.
- Ook dit pakket is lokale uitvoer: het geeft geen toestemming om inhoud te publiceren.

Voor de online versie zit dit pakket al in een image; zie de [container-route](../../hosting/container/README.md). `npm run test:hosting-preparation` test die hulpmiddelen met fictieve gegevens op je eigen computer.

### Opties voor online gebruik (standaard uit)

Deze opties werken alleen als je ze allemaal tegelijk en volledig opgeeft. Ze zijn getest met fictieve gegevens op de eigen computer. Sinds 21 oktober 2026 draait de proefversie zo bij Sliplane (zie de [container-route](../../hosting/container/README.md)).

| Optie | Wat je opgeeft |
| --- | --- |
| `--public-origin` | Het openbare adres: precies één `https://`-adres, zoals `https://omnibus.example.invalid`. Zie de regels onder deze tabel. |
| `--listen-host` | Alleen `127.0.0.1` (eigen computer) of `0.0.0.0` (alle netwerken), en altijd samen met `--public-origin`. |
| `--port` | Verplicht: een poortnummer van 1 tot 65535, zonder voorloopnul. De server leest de poort niet zelf uit omgevingsvariabelen zoals `PORT`; geef hem expliciet door. |
| Database en controlegetallen | `--database` met `--release` en `--publication` (elk 64 kleine hexadecimale tekens), óf één `--settings`-bestand met precies die drie velden. Niet mengen. |
| Webmap | `serve-database-web.mjs` vraagt dan expliciet `--web-root`. `start-runtime-package.mjs` gebruikt altijd de gecontroleerde app in het pakket en weigert een andere webmap. |

Het openbare adres heeft geen gebruikersnaam, pad, `/` aan het eind, `?`, hoofdletters of overbodige `:443`. Een andere poort zoals `:8443` mag wel. Gewoon `http://` mag alleen voor `localhost` en `127.0.0.1`, voor een container op je eigen computer.

De server weigert onbekende of dubbele opties, afkortingen zoals `--host` en de vorm `--optie=waarde`. Ontbreekt een optie, dan valt hij nooit stilletjes terug op lokaal gebruik. Lokaal blijft poort 4319 de standaard. Instellingen voor online gebruik komen nooit in het databasebestand of het pakket terecht.

Voorbeeld om dit bewust op je eigen computer te proberen (vervang paden en controlegetallen door echte waarden):

```text
node scripts/start-runtime-package.mjs --database <apart-pad-naar-private.sqlite> --release <release-sha256> --publication <publicatie-sha256> --public-origin https://omnibus.example.invalid --listen-host 127.0.0.1 --port 8080
```

Hetzelfde werkt voor `scripts/serve-database-web.mjs`, met daarbij `--web-root <webbuild>`. Het voorbeeldadres wordt alleen als instelling gebruikt; er wordt geen verbinding mee gemaakt. In de container luistert de server op `0.0.0.0`.

De tests controleren dat opties goed worden gelezen, dat controlegetallen worden vergeleken en dat de juiste waarden worden doorgegeven. Een aparte test (`scripts/hosting-start-integration.test.mjs`) start beide echte opdrachten op de eigen computer en verwerkt echte verzoeken. Foutmeldingen bij het starten zijn kort en tonen geen ingevoerde waarden, bestandsinhoud of interne details.

### Controle bij overdracht en start

`runtime-package.json` is de inhoudsopgave van het pakket: elk bestand met zijn grootte en controlegetal, plus de release, publicatie en code. Ontbreekt er een bestand, is er een veranderd of toegevoegd, of klopt een pad niet, dan start het pakket niet. Databases, originele documenten, geheimen, tests en ontwikkelbestanden gaan nooit mee. De database staat buiten het pakket en wordt alleen gelezen.

> [!WARNING]
> **Let op:** de inhoudsopgave ziet ongewenste wijzigingen, maar is geen handtekening. Wie pakket én inhoudsopgave kan aanpassen, kan nieuwe controlegetallen maken. Ontvang het pakket en de verwachte controlegetallen daarom via een vertrouwd kanaal. Pak een nieuwe versie altijd uit in een nieuwe map en test die, voordat je de oude vervangt.

De server luistert pas als pakket en database gecontroleerd zijn. `GET /api/v1/health` laat zien in welke modus hij draait: `local-read-only` of `public-read-only`. Bij afsluiten krijgen lopende verzoeken nog vijf seconden. Projecten in de browser horen bij het adres waarop ze gemaakt zijn; neem ze mee met **Bewaar project** en **Open project**.

In de openbare modus heeft elk verbindingsadres een eigen budget voor pagina's, bestanden en gegevens: 120 verzoeken direct, daarna 60 per seconde erbij tot weer 120. Is het budget op, dan antwoordt de server met 429 en `Retry-After`. De exacte routes `/api/v1/health` en `/api/v1/ready`, zonder query, vallen buiten dit budget. Alle controles op verzoeken blijven gelden. Lokaal is er geen extra grens. Daarnaast gelden altijd: hooguit 32 antwoorden tegelijk, 128 verbindingen en 30 seconden per antwoord. Een volle antwoordcapaciteit kan dus ook een gezondheidscontrole weigeren. Dit zijn beginwaarden, geen garantie tegen overbelasting of aanvallen.

De server onthoudt hooguit 4096 adressen. Na een minuut zonder verzoek van een adres kan de volgende aanvraag die plek vrijmaken. Is de tabel vol, dan krijgen nieuwe adressen tijdelijk 429; bestaande budgetten blijven behouden. Een weigering levert één logregel op met een door de server gemaakt verzoeknummer, status en tijd, zonder adres of verzoekinhoud. Herhaalde weigeringen worden geteld: hooguit één regel per minuut voor de hele server, met het aantal sinds de vorige regel onder `suppressed`.

Het adres komt uitsluitend uit de netwerkverbinding. Proxyheaders zoals `X-Forwarded-For` worden niet vertrouwd. Bezoekers achter dezelfde proxy of hetzelfde gedeelde netwerkadres delen daardoor één budget. De lokale tests bewijzen geen bezoekersisolatie achter Sliplane. Daarvoor moet de beheerder vaststellen welke proxy het adres betrouwbaar doorgeeft en welke headers die proxy overschrijft. Ook moet vaststaan dat de app uitsluitend via die proxy bereikbaar is. De huidige startopties hebben geen instelling voor dat vertrouwen.

#### Gereedheid en grenzen

`GET /api/v1/ready` leest vaste metadata via dezelfde alleen-lezen databaseverbinding. De controle bekijkt het databaseschema en of de vastgelegde combinatie van release en publicatie nog aanwezig is. Ook wordt de SQLite-wijzigingsteller (`data_version`) met de startstand vergeleken. Het runtimecontract wordt bij de start getoetst. Gereed: antwoord 200 met `status: "ready"`. Niet gereed: 503 met `status: "not-ready"` en `Retry-After: 1`. De antwoorden tonen geen paden of inhoud.

Dit is geen volledige integriteitscontrole: niet alle bron- en publicatiebytes worden opnieuw gehasht. De controle bewijst ook niet dat elke bestandsvervanging of schijffout wordt gedetecteerd. Een open verbinding kan bijvoorbeeld het oude bestand blijven lezen. `/api/v1/health` zegt alleen dat het proces antwoordt en kan dus 200 geven terwijl `/ready` 503 geeft.

Een tijdelijke blokkade van de database kan vanzelf overgaan. Na een waargenomen wijziging is een nieuwe, gecontroleerde start nodig, ook als de oude bytes worden teruggezet. De server neemt nooit stilletjes een nieuwe stand over. Schrijf daarom nooit in een database die in gebruik is: publiceer een nieuwe versie en schakel bewust om.

### Grens naar echte hosting

#### Begrensde HTTP-controle vóór openbaar gebruik

Deze controle test een draaiend pakket van buitenaf, vanuit de map van de repository. Hij start en wijzigt niets. Zonder opties toont hij alleen uitleg.

```text
node scripts/hosting-acceptance.mjs --run --target http://127.0.0.1:8080 --public-origin https://omnibus.example.invalid --package <geverifieerd-runtimepakket> --release <releasehash> --publication <publicatiehash> --approved-resource <hash-uit-het-pakketmanifest> --excluded-resource <hash-van-bestaande-maar-uitgesloten-resource>
```

- Gebruik echte controlegetallen. De uitgesloten bron moet echt in de database staan maar niet in de webpublicatie; een verzonnen controlegetal bewijst niets.
- De controle doet zestien verzoeken: gezondheid, gereedheid, startpagina, één JavaScript-bestand (ingepakt en uitgepakt vergeleken met het pakket), één toegestane bron en de afgeschermde routes.
- Grenzen: 3 seconden per verzoek, 30 seconden in totaal, hooguit 8 MiB per antwoord en 24 MiB in totaal. Geen herhalingen of doorverwijzingen.
- Uitkomst: 0 is geslaagd, 1 is een mislukte controle, 2 is verkeerde invoer. De uitvoer toont alleen namen, statuscodes, aantallen en tijden.
- Voor een echte host is `--allow-external` nodig, met een `https://`-adres dat gelijk is aan `--public-origin`. Gebruik dat pas na toestemming.

Een geslaagde lokale controle zegt niets over snelheid op de host, de controles van de hostingpartij, de browser of een onafhankelijke beveiligingsbeoordeling.

#### Nog te bewijzen op de host

Eerder bewijs: het pakket is getest op Windows en Ubuntu 24.04 met Node 24 (toen versie 24.17.0; 59 geslaagde tests). Selecties, vraagkoppelingen, bronmarkeringen, projecten en de drie Excel-werkvormen bleven gelijk. Dat geldt niet automatisch voor latere wijzigingen.

Bij de hostingpartij is nog niet aangetoond:

- de servergrenzen en de toegestane inhoud, met een beoordeling van de beveiliging (zie [#143](https://github.com/Robert-Worm/omnibus/issues/143));
- aantoonbaar bewaren van de database, alleen-leesrechten, een beveiligde verbinding (TLS) en geteste herstart;
- begrensd verkeer, privacy in de logs, en een aparte back-up met herstelproef.

Zet nooit de lokale server of de lokale AI-koppeling rechtstreeks online. Een openbaar adres is geen toegangscontrole voor vertrouwelijke inhoud. Zie de [routekaart](../routekaart.md).

## Samengevat

- `build:runtime` bouwt de app, `package:runtime` maakt het pakket.
- Het pakket start standaard alleen lokaal; hostingopties staan uit tot je ze bewust instelt.
- De database zit niet in het pakket en blijft apart.

## Volgende stap

Lees [back-up en herstel](storingen-en-herstel.md) voor back-up en herstel.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
