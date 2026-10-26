# Wat blijft op je computer?

<!-- paginatype: naslag -->

> **In het kort:** de lokale pakketcontrole en de lokale browserapp kunnen werken zonder eigen inhoud naar internet te sturen. Dat is geen garantie voor iedere omgeving. Gebruik je AI in de cloud en deel je daarmee een document of bronpassage, dan verlaat die inhoud wel je computer.

## De huidige grens

Een [eigen pakket](../../content-tools/local-database.md) wordt lokaal gelezen en gecontroleerd. Code uit een pakket wordt niet uitgevoerd. Zonder de benodigde broncontroles en afzonderlijke toelating blijft de uitkomst **HOLD**. De ondersteunde route kan toegelaten modellen, rapporten en wetten/kaders toevoegen aan een **nieuwe** lokale database met vastgepinde runtimepublicatie. Zij verandert de bestaande database of actieve instelling niet.

De ondersteunde lokale browserroute werkt met die gecontroleerde database en een bijbehorende webbuild. De privacyproef hieronder kan de volledige technische route met nieuw opgebouwde fictieve rapport- en kaderpakketten doorlopen. Hun gesimuleerde reviews zijn geen inhoudelijke goedkeuring van echte bronnen. Een pdf kun je niet direct in de applicatie laden; zie [eigen documenten](eigen-documenten.md).

| Handeling | Wat gaat waarheen? |
| --- | --- |
| Eigen pakket lokaal controleren | Pakketbestanden worden lokaal gelezen en in een nieuwe controledatabase bewaard; geen upload nodig. |
| Omnibus openen op `http://127.0.0.1:…` | De browser vraagt code en brongegevens op bij een proces op dezelfde computer. Dit is **loopbackverkeer**: wel HTTP-verkeer, geen internetoverdracht. |
| Project schrijven, herladen, bewaren en openen | Het project staat in de opslag van die browser en in bestanden die je zelf bewaart. Een lokale download is geen upload. |
| Programma, dependencies, browser of openbare database installeren | Openbare bestanden komen van internet. De aanbieder ziet verbindingsgegevens, zoals het IP-adres. Dit is een andere fase dan werken met eigen inhoud. |
| Zelf een externe bronlink openen | Je browser bezoekt de uitgever op internet. De uitgever ontvangt het verzoek en verbindingsgegevens. Een bronlink is geen lokale bronweergave. |
| Een AI-dienst in de cloud kiezen | Gedeelde documenten, vragen en bronpassages gaan naar de cloud. Een lokale MCP-koppeling maakt het AI-model niet lokaal. |
| Een gehoste Omnibus-website gebruiken | Code en bronnen komen over het netwerk. Lokale projectopslag maakt de website niet lokaal. Deze proef geldt voor de lokale installatie. |

Controleer bij cloud-AI vooraf of je de inhoud mag delen. Omnibus start zelf geen AI-model. De proef hieronder roept geen AI-dienst aan; zij onderschept een bewust nagebootst verzoek met fictieve tekst. Zie ook [AI koppelen](ai-koppeling.md).

## Wat controleert de proef?

Het hulpmiddel [local-privacy.mjs](../../local-data/local-privacy.mjs) houdt de twee routes gescheiden:

1. **Eigen pakket:** het maakt een fictief model en fictieve softwaretestreviews in een nieuwe map onder `work/`. Het draait de echte pakketopdracht in een apart Node-proces. Het controleert dat de brontekst exact terugkomt, pakketcode niet is uitgevoerd, de database HOLD blijft en de runtimecontrole haar weigert. De testreviews zijn geen inhoudelijke goedkeuring.
2. **Browser:** het start de bestaande lokale server met expliciete database- en publicatiepinnen. Het opent een nieuw browserproces zonder je gewone profiel. Het voert fictieve projecttekst in, leest een bronpassage, selecteert het aangewezen toetspunt en koppelt dat aan een eigen onderzoeksvraag. Na automatisch opslaan en herladen moeten selectie, vragen, koppelingen en bronbewijssnapshots exact behouden zijn. Daarna bewaart het een projectbestand, begint leeg en heropent het bestand met dezelfde controles. De echte Excel-download moet de gekoppelde vraag en gekozen norm bevatten. De database wordt alleen-lezen geopend; haar hash moet na afloop gelijk zijn.
3. **Netwerkcontrole:** verzoeken van de browser mogen alleen naar de eigen loopbackserver, met GET en zonder eigen projecttekst of verzoekinhoud. Andere verzoeken worden geblokkeerd en maken de applicatieproef ongeldig. Een lokale weigeringproxy onderschept aanvullend browserverkeer en stuurt niets door. Uitgaande Node-aanroepen voor HTTP, TLS, TCP, DNS en UDP worden vóór verzending geblokkeerd en geteld, ook als code een fout opvangt.
4. **Tegenproef:** bewuste fictieve verzoeken via fetch, XHR, beacon, afbeelding, WebSocket en een bronlink in een nieuw tabblad moeten zichtbaar worden onderschept. De Node-test probeert daarnaast onder meer HTTPS, HTTP/2 en DNS. Een nulmeting zonder werkende detectie is onvoldoende.

Zonder scenario gebruikt de browserproef de openbare referentiecollectie, met toetspunt `CIBGBIO24-K01/TP01`. Alle ingevoerde onderzoeksgegevens zijn fictief. Het hulpmiddel accepteert geen eigen pakket als browserpublicatie. Eerst worden de bestaande volledige database-, publicatie- en broncontroles uitgevoerd; een controledatabase met HOLD opent geen browser.

Voor een andere **al afzonderlijk gecontroleerde publicatie** kun je `--probe work/privacy-probe.json` toevoegen. Daarmee test je één expliciet rapportpunt. Het private scenariobestand bevat:

```json
{
  "schema": 1,
  "release": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "publication": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "criterionId": "FICTIEF-K01",
  "pointId": "FICTIEF-K01/TP01",
  "sourceTextMarker": "Een herkenbaar bronfragment"
}
```

Vervang de voorbeelden door de gekozen pinnen en een bestaand rapportpunt. Kies een letterlijk bronfragment van 8–256 tekens zonder regeleinde dat in de bronviewer zichtbaar moet worden. Voor een kader met de gedeelde CIO-viewer gebruik je `schema: 2` met de extra velden `kind: "framework"` en `sourceId`; `criterionId` is dan de norm-ID en `pointId` het onderliggende toetspunt. Schema 2 ondersteunt ook `kind: "report"`. Modellen vallen buiten dit browserscenario.

Bewaar dit bestand uitsluitend lokaal: het kan eigen broninformatie bevatten. De proef controleert de weergave van het fragment en het behoud van het exacte punt bij bewaren en heropenen. Zij weigert verzoeken met dat fragment, ook bij gewone URL-codering. Het netwerkverslag bevat alleen een hash van het scenario en booleans, niet het fragment of de punt-ID.

Gebruik bij voorkeur de fictieve proef hieronder. De optie `--probe` maakt zelf geen publicatie en keurt geen eigen inhoud goed. Zij blijft publicaties met HOLD en verkeerde publicatiepinnen weigeren.

## Zelf herhalen

Gebruik de vastgepinde Node-versie van het project (24.21.0). De korte procesproef heeft geen extra dependencies nodig:

```text
node --test local-data/local-privacy.test.mjs
```

Voor de browserproef zijn de normale [installatie](installeren.md), een beoordeelde openbare database met `local-build.json`, een bestaande Chromium-browser en Playwright nodig. Download installatiebestanden vooraf. Installeer het testhulpmiddel apart, zonder wijzigingen aan de applicatie-lockfile of installatiescripts:

De eenmalige opdracht voor dit aparte testhulpmiddel is `npm install --prefix work/privacy-browser-tools --ignore-scripts --no-audit --no-fund --package-lock=false playwright@1.58.2`. Dit vervangt de normale installatieopdracht van Omnibus niet.

### Nieuwe fictieve rapport- en kaderruntime

Deze browserproef vraagt naast de bouwdependencies, Chromium en Playwright een expliciete, gecontroleerde basispublicatie. De basis wordt alleen-lezen gebruikt:

```text
node local-data/local-privacy-sources.mjs --base <gecontroleerde-local-build.json> --browser <browser-programma> --playwright ../work/privacy-browser-tools/node_modules/playwright
```

Dit hulpmiddel hergebruikt de gedeelde fictieve intake- en reviewgegevens en de echte runtimebouwer. Het voegt voor rapport en kader afzonderlijk een nieuw fictief pakket toe aan een nieuwe kopie van de gecontroleerde basis. Er ontstaan uitsluitend nieuwe databases en webbuilds onder `work/local-privacy-…`; ook tijdelijke bestanden blijven in die proefmap. De runtimebouw draait met dezelfde Node-netwerkblokkering als de pakketproef. De browser controleert uitsluitend het aangewezen fictieve eigen punt, de eigen projecttekst, vraagkoppeling, herstel en export. De bestaande basis wordt niet actief gemaakt, gewijzigd of gepubliceerd; haar bestandshash moet vóór en na de proef gelijk zijn.

Per bronsoort staan `runtime-result.json`, `runtime-network.json`, `browser-result.json` en `server-network.json` in de proefmap. `base-result.json` vergelijkt de basisbestandshash. Alleen `sources-result.json` met `status: passed`, plus geslaagde onderliggende resultaten, telt als een afgeronde proef voor beide routes. De nieuwe databases en builds bevatten ook de basiscollectie: houd de hele proefmap lokaal en buiten Git. Echte broninhoud hoort niet in het meetverslag. De gewone intakebouwtests en negen Node-tegenproeven in `local-privacy.test.mjs` blijven volledig synthetisch en vereisen geen bestaande basis. De browserproef voert haar eigen tegenproeven uit. De webbuild is een voorbereidingsfase en wordt niet als gemeten browser- of runtimeverkeer gepresenteerd.

Op 26 oktober 2026 slaagden beide volledige routes met Node 24.21.0 en Chromium 155.0.8059.86: 66 applicatieverzoeken voor het rapport en 65 voor het kader bleven op loopback, zonder uitgaande eigen inhoud. Bronweergave, selectie, vraagkoppeling, herstel en de echte Excel-download slaagden. Per route werden alle zes externe browsertegenproeven geblokkeerd; runtimebouw en server registreerden geen uitgaande Node-pogingen. De bestaande basis en beide nieuwe databases bleven byte voor byte gelijk tijdens hun alleen-lezen controles. Deze uitkomst geldt voor de beschreven proef en onderstaande grenzen.

### Een bestaande gecontroleerde publicatie

Maak een afzonderlijke webbuild. Kies bij een nieuwe poging een nieuwe uitvoermap; wijzig geen actieve web- of MCP-instelling:

```text
npm run build -- --settings <openbare-local-build.json> --out work/privacy-web-01
```

Start vanuit de Omnibus-map de volledige proef. Vervang de voorbeeldpaden; zet paden met spaties tussen aanhalingstekens. Het Playwright-pad hieronder is relatief aan het hulpmiddel in `local-data/`:

```text
node local-data/local-privacy.mjs --settings <openbare-local-build.json> --web-root work/privacy-web-01 --browser <browser-programma> --playwright ../work/privacy-browser-tools/node_modules/playwright
```

Zonder argumenten draait alleen de pakketproef; de uitvoer noemt dan uitdrukkelijk dat de browser niet is getest. Een ontbrekende browser, dependency, bron of mislukte werkstap levert geen geslaagd browserresultaat op.

De proef meldt haar nieuwe map `work/local-privacy-…`. Daar staan `package-result.json`, `package-network.json`, `server-network.json` en, bij de browserproef, `browser-result.json`. Het browserresultaat bevat versie/pinnen, afgeronde stappen, verzoekcategorieën, tegenproeven, procesverkeer, de exportcontrole en de controle op de databasehash. Alleen een afgerond resultaat met `status: passed` telt. De map bevat ook het fictieve pakket, projectbestand en Excelbestand; houd haar buiten Git. Verzoekinhoud, bronpassages en ruwe verzoekheaders komen niet in het netwerkverslag.

`proxyDenied` telt aanvullend geweigerde browserverzoeken buiten de vastgelegde pagina-aanvragen, bijvoorbeeld achtergrondverkeer. Hun oorzaak wordt niet vastgesteld. Dit getal is geen bewijs dat een gewone browser nooit internetcontact zoekt. De weigeringproxy stuurt ook deze verzoeken niet door.

## Wat deze uitkomst niet bewijst

Dit is een herhaalbare controle van de genoemde routes en handelingen, geen algemene verklaring dat ieder programma op je computer offline is. Het is geen netwerkaftap op besturingssysteemniveau en de Node-instrumentatie is geen beveiligde uitvoeromgeving voor onbetrouwbare code. De proef voert pakketcode daarom nooit uit.

Andere browsers, extensies, malware, nieuwe functionaliteit, processen buiten de proef, cloudback-ups en synchronisatie van je downloadmap vallen erbuiten. Serviceworkers zijn tijdens de proef geblokkeerd; een bestaand browserprofiel en eerder geïnstalleerde serviceworkers worden niet onderzocht. Een geslaagde lokale proef bewijst evenmin de privacy van een gehoste website, AI-provider of echte externe bronwebsite. De getelde tegenproeven zijn bewuste testverzoeken, geen gevonden lekken van Omnibus.

Browseropslag en projectbestanden zijn niet vanzelf versleuteld of een back-up. Bestaande herstelkopieën kunnen achterblijven. Bewaar benodigde bestanden en volg de opslaguitleg in Omnibus voordat je sitegegevens verwijdert. De proef wijzigt die bewaarbeveiligingen niet.

## Volgende stap

Volg [eigen documenten gebruiken](eigen-documenten.md) voor de inhoudelijke werkwijze en bewaar de lokale proefuitkomst bij je technische beoordeling.

---

[↑ Omnibus gebruiken](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
