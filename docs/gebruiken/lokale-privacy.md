# Wat blijft op je computer?

<!-- paginatype: naslag -->

> **In het kort:** de lokale pakketcontrole en de lokale browserapp kunnen werken zonder eigen inhoud naar internet te sturen. Dat is geen garantie voor iedere omgeving. Gebruik je AI in de cloud en deel je daarmee een document of bronpassage, dan verlaat die inhoud wel je computer.

## De huidige grens

Een [eigen modelpakket](../../content-tools/local-database.md) kan nu in een nieuwe lokale **controledatabase** worden gezet. Die route leest bestanden, controleert hun hashes en reviewstructuur en bewaart de inhoud lokaal. Code uit een pakket wordt niet uitgevoerd. De uitkomst blijft **HOLD**: er is nog geen runtimepublicatie of browserimport van dat pakket. Rapporten en wetten/kaders hebben in deze route nog geen zelfstandige integratiecontrole.

De ondersteunde lokale browserroute werkt met een afzonderlijk beoordeelde, vastgepinde database en bijbehorende webbuild. Een privacyproef van die route bewijst niet dat een eigen controledatabase al in de viewer werkt. Een pdf kun je ook niet direct in de applicatie laden; zie [eigen documenten](eigen-documenten.md).

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
2. **Browser:** het start de bestaande lokale server met expliciete database- en publicatiepinnen. Het opent een nieuw browserproces zonder je gewone profiel. Het voert fictieve projecttekst in, herlaadt, leest een openbare bronpassage, selecteert een toetspunt, bewaart een projectbestand, begint leeg en opent het bestand opnieuw. Ook het exportvoorbeeld wordt geopend. De bestaande database wordt alleen-lezen geopend; haar hash moet na afloop gelijk zijn.
3. **Netwerkcontrole:** verzoeken van de browser mogen alleen naar de eigen loopbackserver, met GET en zonder eigen projecttekst of verzoekinhoud. Andere verzoeken worden geblokkeerd en maken de applicatieproef ongeldig. Een lokale weigeringproxy onderschept aanvullend browserverkeer en stuurt niets door. Uitgaande Node-aanroepen voor HTTP, TLS, TCP, DNS en UDP worden vóór verzending geblokkeerd en geteld, ook als code een fout opvangt.
4. **Tegenproef:** bewuste fictieve verzoeken via fetch, XHR, beacon, afbeelding, WebSocket en een bronlink in een nieuw tabblad moeten zichtbaar worden onderschept. De Node-test probeert daarnaast onder meer HTTPS, HTTP/2 en DNS. Een nulmeting zonder werkende detectie is onvoldoende.

De browserproef gebruikt de openbare referentiecollectie, met het voorbeeld `CIBGBIO24-K01`. Alle **eigen** invoer is fictief. Gebruik hiervoor geen vertrouwelijke documenten, echte onderzoeksprojecten of database met eigen inhoud. Het hulpmiddel accepteert geen eigen pakket als browserpublicatie.

## Zelf herhalen

Gebruik de vastgepinde Node-versie van het project (24.21.0). De korte procesproef heeft geen extra dependencies nodig:

```text
node --test local-data/local-privacy.test.mjs
```

Voor de browserproef zijn de normale [installatie](installeren.md), een beoordeelde openbare database met `local-build.json`, een bestaande Chromium-browser en Playwright nodig. Download installatiebestanden vooraf. Installeer het testhulpmiddel apart, zonder wijzigingen aan de applicatie-lockfile of installatiescripts:

De eenmalige opdracht voor dit aparte testhulpmiddel is `npm install --prefix work/privacy-browser-tools --ignore-scripts --no-audit --no-fund --package-lock=false playwright@1.58.2`. Dit vervangt de normale installatieopdracht van Omnibus niet.

Maak een afzonderlijke webbuild. Kies bij een nieuwe poging een nieuwe uitvoermap; wijzig geen actieve web- of MCP-instelling:

```text
npm run build -- --settings <openbare-local-build.json> --out work/privacy-web-01
```

Start vanuit de Omnibus-map de volledige proef. Vervang de voorbeeldpaden; zet paden met spaties tussen aanhalingstekens. Het Playwright-pad hieronder is relatief aan het hulpmiddel in `local-data/`:

```text
node local-data/local-privacy.mjs --settings <openbare-local-build.json> --web-root work/privacy-web-01 --browser <browser-programma> --playwright ../work/privacy-browser-tools/node_modules/playwright
```

Zonder argumenten draait alleen de pakketproef; de uitvoer noemt dan uitdrukkelijk dat de browser niet is getest. Een ontbrekende browser, dependency, bron of mislukte werkstap levert geen geslaagd browserresultaat op.

De proef meldt haar nieuwe map `work/local-privacy-…`. Daar staan `package-result.json`, `package-network.json`, `server-network.json` en, bij de browserproef, `browser-result.json`. Het browserresultaat bevat versie/pinnen, afgeronde stappen, verzoekcategorieën, tegenproeven, procesverkeer en de controle op de databasehash. Alleen een afgerond resultaat met `status: passed` telt. De map bevat ook het fictieve pakket en projectbestand; houd haar buiten Git. Verzoekinhoud, bronpassages en ruwe verzoekheaders komen niet in het netwerkverslag.

`proxyDenied` telt aanvullend geweigerde browserverzoeken buiten de vastgelegde pagina-aanvragen, bijvoorbeeld achtergrondverkeer. Hun oorzaak wordt niet vastgesteld. Dit getal is geen bewijs dat een gewone browser nooit internetcontact zoekt. De weigeringproxy stuurt ook deze verzoeken niet door.

## Wat deze uitkomst niet bewijst

Dit is een herhaalbare controle van de genoemde routes en handelingen, geen algemene verklaring dat ieder programma op je computer offline is. Het is geen netwerkaftap op besturingssysteemniveau en de Node-instrumentatie is geen beveiligde uitvoeromgeving voor onbetrouwbare code. De proef voert pakketcode daarom nooit uit.

Andere browsers, extensies, malware, nieuwe functionaliteit, processen buiten de proef, cloudback-ups en synchronisatie van je downloadmap vallen erbuiten. Serviceworkers zijn tijdens de proef geblokkeerd; een bestaand browserprofiel en eerder geïnstalleerde serviceworkers worden niet onderzocht. Een geslaagde lokale proef bewijst evenmin de privacy van een gehoste website, AI-provider of echte externe bronwebsite. De getelde tegenproeven zijn bewuste testverzoeken, geen gevonden lekken van Omnibus.

Browseropslag en projectbestanden zijn niet vanzelf versleuteld of een back-up. Bestaande herstelkopieën kunnen achterblijven. Bewaar benodigde bestanden en volg de opslaguitleg in Omnibus voordat je sitegegevens verwijdert. De proef wijzigt die bewaarbeveiligingen niet.

## Volgende stap

Volg [eigen documenten gebruiken](eigen-documenten.md) voor de inhoudelijke werkwijze en bewaar de lokale proefuitkomst bij je technische beoordeling.

---

[↑ Omnibus gebruiken](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
