# Checklist live demo

> **In het kort:** wat er nog moet gebeuren om van de lokale applicatie naar een online demo te gaan: database, code, hosting, herstel en acceptatie.

Doel: een werkende demo op Sevalla op **1 december 2026**, met de bestaande
applicatie en een afzonderlijk aangeleverde SQLite-database. Deze checklist is
geen melding dat Omnibus al is uitgerold of voor productie is goedgekeurd.

De beheerder levert de database en beoordeelt de inhoud en verspreidingsrechten.
De code-integratie controleert de aansluitingen, versiegrenzen en workflows.
Login, gebruikersbeheer, betalingen en een publiek MCP-endpoint vallen buiten
deze demo. De bestaande lokale MCP-koppeling blijft een aparte demonstratieroute.

## Actuele vervolgstappen — 20 oktober 2026

De eerdere lokale ontwikkeltranche is geleverd. Onderstaande open verhalen vragen
vooral **bewijs op de echte host of menselijke acceptatie**, niet nog een
nieuwe applicatiefunctie. Lokaal geslaagde tests sluiten deze poorten niet.
De codes EP… verwijzen naar die oorspronkelijke demo-backlog. De nieuwe
[kwaliteitsbacklog](../../.github/backlog/kwaliteit-2026-10.mjs) bevat daarnaast
verbeteringen voor documentatie en bijdragen; die zijn niet allemaal voorwaarden
voor deze demo. Verhaal K4-5 verbindt deze checklist met pad A van de routekaart.

| Verhaal | Wat is lokaal voorbereid? | Wat resteert voor de demo? |
| --- | --- | --- |
| EP11-S02 · storingen signaleren | Health/readiness, veilige foutdiagnostiek en begrensde HTTP-controle | Providerprobes, logprivacy, meldingsontvanger en handelen bij overbelasting beproeven. |
| EP12-S02 · snelheid op de host | Gemeten lokale workflow; de HTTP-controle verifieert ook gzip en exacte uitgepakte bundelbytes | Cold/warm browsermeting via de echte HTTPS-host en afgesproken belasting uitvoeren. |
| EP13-S02 · back-up en herstel | Ontvangstcontrole en afzonderlijk herstel met fictieve gegevens getest | Bewaarplaats, retentie, verantwoordelijke en hersteldoelen kiezen; herstel op de host oefenen. |
| EP13-S03 · release en terugschakelen | Gepind pakket, afzonderlijke database en strikte startweigering | Rechten op de disk, eerste ontvangst, herstart en terugschakelen van de volledige code/data-combinatie beproeven. |
| EP02-S03/S04 · overdracht | Lokale tests en handmatig te starten CI aanwezig | CI-gebruik en reviewafspraken bewust kiezen; een niet-betrokken ontwikkelaar de setup laten volgen. |
| EP07-S03 · beveiligingsacceptatie | Gerichte technische controles beschikbaar | Onafhankelijke review van de daadwerkelijk te hosten configuratie. |
| EP12-S03 · gebruikersacceptatie | Gegroepeerde bovenbalk getest op desktop en mobiel, inclusief toetsenbord en projectoverdracht | Menselijke bruikbaarheidscontrole en generale repetitie. Een test met schermlezer en in desktop-Excel valt buiten deze demo (besluit 20 oktober 2026). |

De toolbarverbetering en het gelijkzetten van de lokale MCP-index zijn geleverd.
Een bestaande AI-client moet opnieuw verbinden voordat hij de nieuwe index
gebruikt. Controleer vóór de demonstratie de actuele pinnen, niet alleen een
eerder geslaagd resultaat.

De uitgestelde publicatieoptimalisatie (EP12-S01) is geen verplicht nieuw
bouwproject. Pak die alleen op als een relevante meting daar aanleiding toe
geeft, met afzonderlijke toestemming voor een kandidaatpublicatie. De actieve
database blijft bij codeverbeteringen ongewijzigd.

## Wat moet nog worden aangetoond?

| Stap | Verantwoordelijke | Klaar wanneer |
| --- | --- | --- |
| Database kiezen | Inhoudsbeheerder | De bedoelde dataset en verspreidingsrechten zijn beoordeeld; privébestanden en persoonlijke paden worden niet onbedoeld meegeleverd. |
| Code en runtimepakket | Integrator | De gekozen code is gereviewd en getest, de echte image is gebouwd, de base-image is opnieuw op actuele beveiligingsupdates beoordeeld en de database blijft buiten de image. |
| Eerste ontvangst | Hostingbeheerder | Een ondersteund, beschermd overdrachtskanaal, de disk, procesidentiteiten en daadwerkelijke leesrechten zijn vastgesteld. De tijdelijke beheerstart wordt veilig beëindigd. |
| Hosted werking | Hostingbeheerder en reviewer | TLS, Host/Origin/CORS, probes, fout- en herstelgedrag, logs en cold/warm prestaties werken op de echte host. Lokale tests vervangen deze proef niet. |
| Herstel | Hostingbeheerder | Een aparte back-up, retentie en hersteldoelen zijn gekozen; herstel en terugschakelen naar een passende eerdere code/data-combinatie zijn geoefend. |
| Gebruikersacceptatie | Demonstrator en onafhankelijke tester | Bronnen, selecties, vragen, bewaren/openen en drie Excelwerkvormen zijn door mensen doorlopen, ook met alleen het toetsenbord. Schermlezer en desktop-Excel horen bewust niet bij deze demo. |
| Generale repetitie | Eigenaar en integrator | Dezelfde vastgezette code/data-combinatie is op de gekozen host doorlopen en een terugvalroute is beschikbaar. |

Voorgestelde planning: pakket en ontvangst eind oktober, echte hostingproef
begin november, herstel en gebruikersacceptatie uiterlijk 20 november,
vrijgavebesluit op 27 november en generale repetitie op 30 november. Dit zijn
streefdata, geen toestemming om diensten te activeren of kosten te maken.

## Database en koppelingen

- Controleer een nieuwe database met
  `npm run data:check-runtime -- --settings work/candidate/local-build.json`.
  Volg daarbij de [publicatiehandleiding](database-publiceren.md).
  Gebruik expliciete database-, release- en
  publicatie-identiteiten; val niet stilzwijgend terug op een oudere versie.
- Gebruik zo nodig de [actieve-inventariscontrole](actieve-inventaris-controleren.md)
  naast de volledige runtimevergelijking. Die controle wijzigt niets en
  beoordeelt geen bronrechten.
- Een nieuwe webpublicatie maakt een bestaande agentbuild niet automatisch
  actueel. Controleer de versie van de [lokale AI-koppeling](../../agent-tools/README.md)
  tegen de voor de demo gekozen release. Bereid een passende agentbuild apart
  voor en test het protocol en de export; presenteer een oudere index niet als
  bewijs voor de nieuwe collectie.
- Onderzoeksprojecten blijven in de browser. Naar een ander adres verhuizen
  vraagt een projectdownload en opnieuw openen, geen veronderstelde automatische
  overdracht van browseropslag.

## Hoe bewijs wordt vastgelegd

Leg per controle de exacte codeversie, release/publicatie, datum, uitvoerder,
resultaat en beperkingen vast. Houd broninhoud, echte projecten, exports,
databasebestanden en ruwe testuitvoer buiten de coderepository.

Een lokale browserrepetitie kan selecties, vraagkoppelingen en Excel-inhoud
controleren, maar bewijst geen desktop-Excelweergave of menselijke
toegankelijkheid. Die twee tests zijn voor deze demo bewust buiten scope
gelaten (besluit van de eigenaar, 20 oktober 2026). Een snelle lokale proef is evenmin een capaciteitsgarantie
voor de host. Herhaal alleen relevante controles wanneer code, data of
hostingconfiguratie veranderen.

Gebruik de bestaande [hostingvoorbereiding](../../hosting/release-delivery/README.md),
[runtime-instructies](runtime-pakket.md) en
[herstelhandleiding](storingen-en-herstel.md); bouw hiervoor geen tweede beheerplatform.
De [begrensde HTTP-controle](runtime-pakket.md#begrensde-http-controle-vóór-de-demo)
kan alvast met een synthetisch pakket op loopback worden uitgevoerd. Zij houdt
ontvangen en uitgepakte bytes apart bij en stopt bij de eerste fout; het is
geen vervanging voor de latere hosted browsermeting.

## Samengevat

- Database, code, hosting, herstel en acceptatie hebben elk een verantwoordelijke en een duidelijk "klaar wanneer".
- De data zijn streefdata, geen toestemming om diensten te activeren of kosten te maken.

## Volgende stap

Zie [pad A van de routekaart](../routekaart.md#pad-a--online-versie) en de voorbereiding in [`hosting/`](../../hosting/README.md).
