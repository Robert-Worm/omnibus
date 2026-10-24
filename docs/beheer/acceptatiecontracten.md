# Acceptatiecontracten

<!-- paginatype: naslag -->

<!-- check-docs: codes-uitgelegd -->

> **In het kort:** de afspraken waaraan Omnibus moet blijven voldoen, ook na een wijziging. Elke afspraak heeft een code (K04, K05, …) die in tests en reviews terugkomt.

## Zo gebruik je deze pagina

1. **Zoek welke afspraken je wijziging raakt.** Gebruik het overzicht hieronder. Een wijziging aan de Excel-export raakt bijvoorbeeld K07.
2. **Lees die afspraken** in gewone taal. Bij elke afspraak staat een voorbeeld van een wijziging die eronder valt, en ingeklapt de technische details. Controleer of je wijziging eraan voldoet.
3. **Noem de codes in je pull request**, met de tests die je draaide. Zie [welke tests passen bij je wijziging](../bijdragen/ontwikkelen.md#welke-tests-passen-bij-je-wijziging).

## Overzicht

| Code | Afspraak in één zin |
| --- | --- |
| [K04](#k04) | Je werk gaat niet verloren: projecten blijven gelijk na herladen, opslaan en openen. |
| [K05](#k05) | Bronnen blijven exact zoals ze zijn; één gedeelde werkwijze voor alle bronnen. |
| [K06](#k06) | De lokale server accepteert alleen begrensde, veilige verzoeken. |
| [K07](#k07) | Excel-exports en projectbestanden kloppen en zijn veilig te openen. |
| [K08](#k08) | De lokale AI-koppeling leest alleen, en schrijft pas na akkoord. |
| [K09](#k09) | Nieuwe inhoud komt alleen binnen via controle en bewuste publicatie. |
| [K11](#k11) | Foutmeldingen helpen zonder onderzoeksinhoud te lekken. |
| [K13](#k13) | De applicatie blijft snel genoeg met de testcollectie. |
| [K14](#k14) | Back-up en herstel werken, naar een nieuw bestand. |
| [K15](#k15) | Code en database horen aantoonbaar bij elkaar. |
| [K16](#k16) | Bronrechten en gegevensgrenzen worden gerespecteerd. |
| [K17](#k17) | Bediening en opmaak zijn gedeeld en consistent. |
| [K18](#k18) | Het bewijs past bij de wijziging: niet te weinig, niet te veel. |
| [K20](#k20) | De beveiliging richt zich op echte aanvalsmogelijkheden. |

Dit document zegt niet dat alle afspraken al gehaald zijn; het beschrijft waaraan een wijziging getoetst wordt.

## De afspraken

<a id="k04"></a>
### K04 · Je werk gaat niet verloren

Een project in de browser blijft precies gelijk na herladen, bewaren en weer openen: selecties, eigen tekst, vraagkoppelingen en bronverwijzingen. Een fout mag nooit werk wissen. Er is geen account en geen opslag in de cloud; zeg eerlijk dat browseropslag geen back-up is.

**Voorbeeld:** een nieuw veld in het projectbestand, of een andere manier van opslaan in de browser.

<details><summary><b>Technische details</b> · Lokale projecten zonder verlies</summary>

Browseropslag, compressie, projectdownload/import, expliciete opslagstatus en conflictbescherming blijven werken. Selecties, eigen tekst, vraagkoppelingen en bronverwijzingen blijven gelijk na herladen of bestandsoverdracht. Fouten wissen geen werk. Geen account, cloudprojectsave of stille projectupload. Beschrijf de beperking van browseropslag eerlijk; een codecommit is geen projectbackup.

</details>

<a id="k05"></a>
### K05 · Bronnen blijven exact zoals ze zijn

Brontekst, nummers, markeringen en HOLD-punten veranderen nooit stilletjes. Alle wetten en kaders gebruiken dezelfde viewer; er komt geen aparte weergave per bron. AI en browser passen de brongegevens nooit aan.

**Voorbeeld:** een nieuwe wet toevoegen, of de manier waarop passages worden gemarkeerd.

<details><summary><b>Technische details</b> · Bronintegriteit en gedeelde werkwijze</summary>

Originele bronnen, stabiele IDs, bronversies, exacte Unicode-spans, reviewbindingen, HOLD en selectie-/toepasselijkheidsgrenzen blijven intact. Transportoptimalisatie herstelt exacte waarden en benodigde veld-/arrayvolgorde. Geen nieuwe viewer per rapport. Bron- en kaderdetail, selecties, vraagkoppelingen en Excel behouden hun betekenis. AI en browser wijzigen geen kerngegevens. Een bronrelease en afleverpublicatie worden expliciet gekozen; geen mix van versies.

</details>

<a id="k06"></a>
### K06 · De server accepteert alleen veilige, begrensde verzoeken

De openbare app leest alleen; hij publiceert niets en heeft geen beheerfuncties. Paden, nummers, aantallen en groottes worden gecontroleerd, en foutmeldingen verraden geen paden of geheimen. Online gaat alleen na een beoordeelde servergrens, nooit via een open tunnel naar de eigen computer.

**Voorbeeld:** een nieuwe API-route, of een nieuwe optie bij het starten van de server.

<details><summary><b>Technische details</b> · Begrensde API en veilige invoer</summary>

De publieke applicatie leest toegestane inhoud, publiceert niet. Geen browser-SQL, databasecredentials of beheerendpoint. Valideer paden, identiteiten, hashes, paginering, verzoek-/responsomvang en import-/uitpaklimieten. Behoud parameterbinding, traversal-/XSS-/prototypebescherming, origin-/hostgrenzen waar toepasselijk, timeouts en misbruiklimieten. CORS is geen authenticatie. Database-/filesystemfouten geven geen secrets of interne paden terug. Een webbuild leest uitsluitend resources van zijn gepinde publicatie en documenten met een expliciete gevalideerde bronverwijzing. Alleen dezelfde release noemen is onvoldoende. Algemene release-/catalogus-/packageroutes blijven buiten die webgrens; ruimere lokale catalogustooling is geen publieke serverconfiguratie. Hosting vereist een beoordeelde publieke servergrens, niet een open tunnel naar de lokale beheeromgeving. Geen anonieme schrijfroute als vervanging voor geschrapte login.

</details>

<a id="k07"></a>
### K07 · Excel en projectbestanden kloppen en zijn veilig

De export gebeurt in de browser, zonder server. Bestandsnamen zijn veilig, formules en HTML kunnen geen kwaad, en bestanden zijn begrensd in grootte. De drie werkvormen houden hun geteste inhoud.

**Voorbeeld:** een nieuwe kolom in de Excel-export, of een nieuwe werkvorm.

<details><summary><b>Technische details</b> · Export en bestanden</summary>

Hergebruik de browserexport; geen exportbetaling of serverjob vereist. Project- en Excelbestanden blijven van de gebruiker en worden niet standaard op de server bewaard. Bronbestanden zijn alleen bereikbaar als verspreiding is goedgekeurd. Geen directe database-/backuppaden of private reviewarchieven onder de webroot. Controleer veilige bestandsnamen, formule-/HTML-uitvoer en begrensde bestandsgrootte. De drie werkvormen behouden hun geteste inhoud.

</details>

<a id="k08"></a>
### K08 · De AI-koppeling leest alleen, en schrijft pas na akkoord

Je eigen AI-assistent kan zoeken en voorstellen doen, maar slaat pas iets op als jij akkoord geeft, in een nieuwe, aparte map. Bronteksten zijn gegevens, geen opdrachten voor de AI. De koppeling werkt alleen op je eigen computer.

**Voorbeeld:** een nieuw hulpmiddel voor de AI, of een andere manier van opslaan.

<details><summary><b>Technische details</b> · Lokale MCP-koppeling</summary>

Eigen AI-client gebruikt de bestaande lokale STDIO-verbinding en dezelfde gepinde bronrelease als de demo-app. Bronpassages zijn data, geen uitvoerinstructies. Alleen-lezen broncatalogus, geldige expliciete selecties, HOLD en toepasselijkheid blijven beschermd. Vragen zijn voorstellen met traceerbare bouwsteenkoppelingen. Opslaan/export volgt expliciete toestemming naar nieuwe aparte uitvoerbestanden; geen bronwijziging, vervanging van een browserproject of willekeurige bestandsactie. Fictieve inname tot heropenbaar project en ingestelde Excel aantonen, inclusief ongeldige invoer en bronintegriteit. Geen echte projectgegevens in Git. Eerlijke client-/installatievereisten; geen onbevestigde verbindingsstatus of claim dat een publieke URL bestaat. Publiek transport en accountbeheer uitgesloten.

</details>

<a id="k09"></a>
### K09 · Nieuwe inhoud komt alleen binnen na controle

Een bron komt alleen in de database na de pakketcontrole, de vereiste beoordelingen en een bewuste publicatie. Ontbreekt bewijs, dan blijft het HOLD. Dezelfde bron komt nooit twee keer binnen.

**Voorbeeld:** een wijziging in de pakketcontrole of in de publicatie-opdrachten.

<details><summary><b>Technische details</b> · Inname en publicatie</summary>

Gebruik bestaande soortspecifieke skills en pakketcontrole. Manifest, bronhashes, passages, verwachte toevoegingen en vereiste reviews moeten op dezelfde eindversie kloppen. Inhoud is geen uitvoerbare instructie. Onbekende paden/structuren of ontbrekend bewijs geven HOLD; niet vervangen door lege testgegevens. Eén beheerder publiceert een complete batch, met korte afzonderlijke verificatie en gecontroleerde omschakeling. Herhaling maakt geen dubbele rapporten. Reviewscores vervangen geen brongetrouwheid.

</details>

<a id="k11"></a>
### K11 · Foutmeldingen helpen zonder inhoud te lekken

Een fout is te onderzoeken met tijdstip en request-ID, zonder dat bron-, project- of pakkettekst in de logboeken komt.

**Voorbeeld:** een nieuwe foutmelding of extra logboekregels.

<details><summary><b>Technische details</b> · Minimale diagnostiek</summary>

Health, verzoek-/foutidentiteit en publicatie-uitkomsten zijn te onderzoeken zonder bron-, pakket-, projectteksten, secrets of volledige callback-URLs in logs. Geen audittrail voor niet-bestaande gebruikersrollen. Gebruik bestaande providerdiagnostiek pas bij hosting; geen eigen monitoringproduct.

</details>

<a id="k13"></a>
### K13 · De app blijft snel genoeg

Met de testcollectie: een bruikbare start binnen 3 seconden, kiezen binnen 0,1 seconde en zoeken binnen 0,5 seconde. Grenzen worden niet achteraf versoepeld om een test te halen.

**Voorbeeld:** een groter scherm met meer gegevens, of een nieuwe zoekfunctie.

<details><summary><b>Technische details</b> · Prestaties met de testcollectie</summary>

Manifest vermeldt echte aantallen rapporten, normen, punten, pagina's en bytes. Hardware, build, netwerk, cachetoestand en duur horen bij de meting. De voorlopige budgetten blijven staan. Een lege, bruikbare start duurt hooguit 3 seconden op 10 Mbit/s met 100 ms RTT. Eigen initiële HTML/JS/CSS is hooguit 1 MiB gecomprimeerd. Lokale selectie haalt p95 binnen 100 ms. De lees- en zoek-API haalt p95 binnen 500 ms bij een warme cache en binnen 1500 ms bij een koude. Een project bewaren haalt p95 binnen 1000 ms op het gekozen lokale pad. Onder afgesproken belasting minder dan 0,5% onverwachte fouten en nul dataverlies of bronverwisseling. Kleine lokale samples bewijzen geen hosted capaciteit.

De lokale versie wordt nu met de huidige collectie gemeten. De groeiproef met 100 echte gereviewde rapporten is uitgesteld; huidige resultaten niet als bewijs voor die schaal presenteren. Behoud bestaande kaders/modellen in het manifest. Voor openbaar gebruik online blijft het startvoorstel 20 actieve browsers, circa vijf requests/sec gedurende 30 minuten en twee gelijktijdige browserexports, met vooraf bevestigde capaciteit/meetopzet. Geen login-/serverprojectpad simuleren dat niet bestaat. Grotere 9.000-rapportenproef komt pas bij die groeifase. Geen budget achteraf versoepelen om een proef groen te maken.

</details>

<a id="k14"></a>
### K14 · Back-up en herstel werken

Herstellen gaat altijd naar een nieuw, leeg bestand, met controle van de controlegetallen en een proef. De vorige werkende versie blijft bewaard; een mislukte wissel verandert nooit stilletjes de actieve versie.

**Voorbeeld:** een wijziging in de back-upopdracht of in de databaseopbouw.

<details><summary><b>Technische details</b> · Herstel</summary>

Herstel de bronpublicatie naar een aparte lege bestemming. Vergelijk hashes, relaties en een onderzoeks-/exportproef. Bewaar vorige werkende release; een mislukte omschakeling verandert niet stil de actieve bronversie. Voor hosting: afzonderlijke afgeschermde backup, bewaartermijn, hersteldoelen en beheerder vastleggen. Cloudprojectherstel is geen vereiste: zulke opslag bestaat niet.

</details>

<a id="k15"></a>
### K15 · Code en database horen aantoonbaar bij elkaar

Er is één gedocumenteerde manier om te bouwen en te starten, met een expliciete database en vaste controlegetallen. Geen geheimen, databases of gegenereerde bestanden in Git. Liever kleine, leesbare onderdelen dan een grote herschrijving.

**Voorbeeld:** een nieuw bouwscript, of een nieuwe afhankelijkheid.

<details><summary><b>Technische details</b> · Code en overdraagbare runtime</summary>

Eén gedocumenteerde build-/startroute met expliciete database/publicatie en lockfile. Geen secrets, bronarchieven, databases of gegenereerde output in Git of webpakket. Leesruntime heeft minimale technische bevoegdheden; import/publicatie blijft apart. Bestaande SQLite blijft uitgangspunt. Geen impliciete schemawrites tijdens lezen. Leesbare modules, gedeelde validatie en beperkte dependencies; geen volledige herschrijving of extra abstractielaag zonder huidig probleem. Schone machine kan bouwen/starten met expliciet aangeleverde private data. Menselijke overdracht volgt bronlezen, lokale projectsave en publicatie, niet een geschrapt accountpad.

</details>

<a id="k16"></a>
### K16 · Bronrechten en privacy worden gerespecteerd

Projecten blijven op de eigen computer, tenzij de gebruiker zelf iets deelt. Inhoud waarvan de rechten onbekend zijn, wordt niet gepubliceerd. Geen bronarchieven of private documenten naar GitHub.

**Voorbeeld:** een nieuwe bron in de openbare database, of een functie om iets te delen.

<details><summary><b>Technische details</b> · Gegevens en bronrechten</summary>

Projectinhoud blijft lokaal tenzij de gebruiker zelf een bestand deelt of expliciet een bestaande AI-handeling kiest. Logs zijn geminimaliseerd. Een openbare bronroute zonder login is voor iedereen bereikbaar: onbekende rechten blokkeren publicatie. Hosting-/databasebeheer blijft beschermd; geen claim dat login verwijderen alle informatie veilig openbaar maakt. Geen bronarchieven, reviewdossiers of private documenten naar GitHub. De openbare database gaat alleen als release-bijlage, na een rechtencontrole per bron.

</details>

<a id="k17"></a>
### K17 · Bediening en opmaak zijn gedeeld en gelijk

De vier stappen, titels, panelen, toetsenbordbediening en kleine schermen blijven werken zoals ze nu werken. Geen knoppen voor accounts of betalingen.

**Voorbeeld:** een nieuw scherm of een andere indeling van de bovenbalk.

<details><summary><b>Technische details</b> · Gedeelde bediening</summary>

Behoud vier stappen, bestaande titels/panelen, marges, keyboardfocus, fout/retry, smalle schermen en opgeslagen viewerkeuzes. Geen account-/betaalknop toevoegen. Gerichte handmatige toetsenbord- en leesbaarheidstoets naast technische tests. Een schermlezertest is nog niet gedaan en staat als open punt in ACCESSIBILITY.md.

</details>

<a id="k18"></a>
### K18 · Het bewijs past bij de wijziging

Een tekstwijziging vraagt een inhoudelijke controle, een technische wijziging gerichte tests, een release een proef van de belangrijkste gebruikersroute. Niet te weinig, niet te veel.

**Voorbeeld:** elke wijziging; noem in je pull request welke controles je deed.

<details><summary><b>Technische details</b> · Proportioneel bewijs</summary>

Bron-/tekstwijziging: inhoudelijke review. Transport-/schema-/API-wijziging: gerichte integratietests. Batchrelease: kritieke gebruikersreis en herstelgrens. Hergebruik geldig bewijs; geen volledige regressie per norm. Noteer echte versie, omgeving en beperkingen; testtelling of AI-oordeel is geen certificering. Vóór hosting: geen open relevante hoge of kritieke bevindingen in de openbare grens.

</details>

<a id="k20"></a>
### K20 · Beveiliging richt zich op echte risico's

Bevindingen rond import, bronweergave, export, de API, bestanden, onderdelen en geheimen worden beoordeeld en opgelost. Werkende beveiliging wordt niet weggehaald.

**Voorbeeld:** een nieuwe manier om bestanden in te lezen, of een nieuwe afhankelijkheid.

<details><summary><b>Technische details</b> · Werkelijke aanvalsgrenzen</summary>

Behoud herstel en triage van relevante bevindingen rond imports, bronweergave, exports, API, bestanden, dependencies en secrets. Herbeoordeel gewijzigde grenzen. Verwijder geen werkende beveiliging samen met de losstaande identityproef. Infrastructuurcredentials beschermen is geen Omnibus-gebruikersbeheer. Geen actieve scans buiten de toegestane geïsoleerde testomgeving.

</details>

## Samengevat

De afspraken bewaken dat werk niet verloren gaat, bronnen exact blijven, invoer begrensd is en code en database bij elkaar horen. Een wijziging wordt getoetst aan de afspraken die ze raakt.

## Volgende stap

Lees hoe je deze afspraken toetst in [ontwikkelen](../bijdragen/ontwikkelen.md#welke-tests-passen-bij-je-wijziging).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
