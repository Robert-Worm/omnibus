# Van lokale applicatie naar een live demo

Doel: een werkende demo op Sevalla op **1 december 2026**, met de bestaande
applicatie en een afzonderlijk aangeleverde SQLite-database. Deze checklist is
geen melding dat Omnibus al is uitgerold of voor productie is goedgekeurd.

De beheerder levert de database en beoordeelt de inhoud en verspreidingsrechten.
De code-integratie controleert de aansluitingen, versiegrenzen en workflows.
Login, gebruikersbeheer, betalingen en een publiek MCP-endpoint vallen buiten
deze demo. De bestaande lokale MCP-koppeling blijft een aparte demonstratieroute.

## Wat moet nog worden aangetoond?

| Stap | Verantwoordelijke | Klaar wanneer |
| --- | --- | --- |
| Database kiezen | Inhoudsbeheerder | De bedoelde dataset en verspreidingsrechten zijn beoordeeld; privébestanden en persoonlijke paden worden niet onbedoeld meegeleverd. |
| Code en runtimepakket | Integrator | De gekozen code is gereviewd en getest, de echte image is gebouwd, de base-image is opnieuw op actuele beveiligingsupdates beoordeeld en de database blijft buiten de image. |
| Eerste ontvangst | Hostingbeheerder | Een ondersteund, beschermd overdrachtskanaal, de disk, procesidentiteiten en daadwerkelijke leesrechten zijn vastgesteld. De tijdelijke beheerstart wordt veilig beëindigd. |
| Hosted werking | Hostingbeheerder en reviewer | TLS, Host/Origin/CORS, probes, fout- en herstelgedrag, logs en cold/warm prestaties werken op de echte host. Lokale tests vervangen deze proef niet. |
| Herstel | Hostingbeheerder | Een aparte back-up, retentie en hersteldoelen zijn gekozen; herstel en terugschakelen naar een passende eerdere code/data-combinatie zijn geoefend. |
| Gebruikersacceptatie | Demonstrator en onafhankelijke tester | Bronnen, selecties, vragen, bewaren/openen en drie Excelwerkvormen zijn doorlopen; toetsenbord, schermlezer en desktop-Excel zijn door mensen beoordeeld. |
| Generale repetitie | Eigenaar en integrator | Dezelfde vastgezette code/data-combinatie is op de gekozen host doorlopen en een terugvalroute is beschikbaar. |

Voorgestelde planning: pakket en ontvangst eind oktober, echte hostingproef
begin november, herstel en gebruikersacceptatie uiterlijk 20 november,
vrijgavebesluit op 27 november en generale repetitie op 30 november. Dit zijn
streefdata, geen toestemming om diensten te activeren of kosten te maken.

## Database en koppelingen

- Controleer een nieuwe database met
  `npm run data:check-runtime -- --settings work/candidate/local-build.json`.
  Volg daarbij de [publicatiehandleiding](contributor-publication.md).
  Gebruik expliciete database-, release- en
  publicatie-identiteiten; val niet stilzwijgend terug op een oudere versie.
- Gebruik zo nodig de [actieve-inventariscontrole](active-inventory-check.md)
  naast de volledige runtimevergelijking. Die controle wijzigt niets en
  beoordeelt geen bronrechten.
- Een nieuwe webpublicatie maakt een bestaande agentbuild niet automatisch
  actueel. Controleer de versie van de [lokale AI-koppeling](../agent-tools/README.md)
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
toegankelijkheid. Een snelle lokale proef is evenmin een capaciteitsgarantie
voor de host. Herhaal alleen relevante controles wanneer code, data of
hostingconfiguratie veranderen.

Gebruik de bestaande [hostingvoorbereiding](../hosting/release-delivery/README.md),
[runtime-instructies](runtime-pakket.md) en
[herstelhandleiding](runtime-herstel.md); bouw hiervoor geen tweede beheerplatform.
