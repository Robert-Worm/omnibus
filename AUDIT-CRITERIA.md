# Auditcriteria: applicatie en MCP-server

> **In het kort:** waaraan de applicatie Omnibus en de lokale MCP-server moeten voldoen, als je Omnibus zelf als auditobject beoordeelt. Per beheersdoelstelling staan toetsbare criteria, het bewijs dat er nu is en de gaten die we kennen. De opbouw volgt het sjabloon van de SAAF A2-standaard (*Audit Criteria & Controls*); de tekst is Nederlands, net als de rest van Omnibus.

Dit document gaat over de applicatie en de MCP-server. De AI-skills die de inhoud voorbereiden hebben een eigen document: [skills/AUDIT-CRITERIA.md](skills/AUDIT-CRITERIA.md).

## Gegevens

| Veld | Waarde |
| --- | --- |
| Onderdeel | Omnibus: webapplicatie, lokale API en lokale MCP-server (`agent-tools/`) |
| Repository | https://github.com/Robert-Worm/omnibus |
| Maintainer | Robert Worm, beheerder ([B-027](docs/beheer/besluiten.md#b-027)) |
| Verantwoordelijkheid | Geen aparte eigenaar: de criteria zijn afgeleid van kaders die van hun uitgevers blijven. De gebruiker blijft verantwoordelijk voor het oordeel. De criteria groeien mee met betere modellen en skills |
| Laatst bekeken | 2026-10-31 |
| Status | Concept (*Draft* in SAAF-termen). Het bewijs per criterium wordt nog nagelopen in [#273](https://github.com/Robert-Worm/omnibus/issues/273), de kaders zijn nagelopen in [#278](https://github.com/Robert-Worm/omnibus/issues/278) |
| Branches | Dit document beschrijft `main`. De twee andere branches (PR #235, gepauzeerd; een al verwerkte databasekoppeling) wijken hier niet van af (31 oktober 2026) |
| Controle op geheimen | 31 oktober 2026: geen sleutels (`sk-`, `AKIA`), private keys of `.env` in Git. `check:code-only` controleert dit bij elke wijziging |
| Bronnen voor dit document | [README.md](README.md), [SECURITY.md](SECURITY.md), [AGENTS.md](AGENTS.md), [besluitenlijst](docs/beheer/besluiten.md), [agent-tools/README.md](agent-tools/README.md), [hosting/container/README.md](hosting/container/README.md) en de tests die hieronder genoemd worden |

## 1. Wat Omnibus doet

Omnibus helpt een onderzoeker een referentiekader samen te stellen. Je kiest normen en toetspunten uit rapporten, wetten, kaders en modellen, koppelt er onderzoeksvragen aan en exporteert het geheel naar Excel. De invoer is een vaste, gereviewde database (een release met een vaste publicatie) plus de keuzes van de gebruiker. De uitvoer is een projectbestand en een Excel-werkboek.

De lokale MCP-server laat de AI-client van de gebruiker hetzelfde doen: bronnen verkennen, bouwstenen lezen, een concept maken en exporteren. **Omnibus roept zelf geen AI-model aan.** Het model hoort bij de AI-client van de gebruiker; Omnibus levert alleen gegevens en controleert wat terugkomt.

## 2. Beheersdoelstellingen en kaders

| Beheersdoelstelling | Kader | Waarom relevant |
| --- | --- | --- |
| **CO-1 (BD-1):** Omnibus toont geen bronpassage die niet letterlijk in de bron staat | DAMA-DMBOK, datakwaliteit (juistheid en integriteit). Ondersteunt Global Internal Audit Standards (IIA, 2024), standaard 14.1: informatie verzamelen | Een auditor bouwt op de bronpassage; een verschoven of verzonnen citaat ondermijnt elk oordeel |
| **CO-2 (BD-2):** Alles wat Omnibus toont of exporteert, is herleidbaar tot één vaste release en publicatie | COBIT 2019, BAI10 (configuratiebeheer); ISO 27001:2022, A.8.32 (wijzigingsbeheer) | Wie een kader gebruikt, moet kunnen zeggen uit welke versie het komt |
| **CO-3 (BD-3):** Omnibus trekt geen juridische of inhoudelijke conclusie die een mens moet trekken | Ondersteunt Global Internal Audit Standards (IIA, 2024), principe 4: professionele zorgvuldigheid en kritische houding van de auditor | Selecteren is geen oordeel over toepasselijkheid of naleving; dat oordeel blijft bij de auditor |
| **CO-4 (BD-4):** De MCP-server schrijft alleen na een expliciete opdracht, alleen in de eigen uitvoermap, en levert een concept, geen vastgesteld kader | ISO 27001:2022, A.8.3 (toegang tot informatie); OWASP Top 10, A01 (*Broken Access Control*) | Een agent mag de kerncollectie en andere bestanden niet kunnen veranderen |
| **CO-5 (BD-5):** Onderzoeksgegevens van de gebruiker blijven op de eigen computer; de online versie is alleen-lezen en begrensd | AVG, art. 5 lid 1 onder c en art. 25 (minimale gegevens, privacy by design); ISO 27001:2022, A.8.20–A.8.22 (netwerkbeveiliging) | Onderzoeken kunnen vertrouwelijk zijn; de server mag ze niet zien of bewaren |

AI-specifieke kaders (EU AI Act, OWASP LLM) staan hier bewust niet als doelstelling: Omnibus roept geen model aan (zie §1). Ze horen bij de skills, waar wel een model werkt. Zie ook dekkingsgat 2.

**Toelichting bij de kaders** ([#278](https://github.com/Robert-Worm/omnibus/issues/278)). De doelstellingen gaan over het eigen gedrag van Omnibus, niet over het vakgebied van de bronnen. De kaders komen uit de lijst die SAAF gebruikt (*domains-and-frameworks*): datakwaliteit (DAMA-DMBOK), wijzigingsbeheer (COBIT, ISO 27001), toegang en netwerk (ISO 27001, OWASP) en privacy (AVG). De IIA-standaarden gelden voor de auditor, niet voor een hulpmiddel; ze staan erbij als het werk dat Omnibus ondersteunt. De nummers zijn gecontroleerd; een beoordeling door een vakexpert ontbreekt nog.

## 3. Toetsbare criteria

### CO-1 (BD-1) · Geen verzonnen bronpassages

1. Gegeven een database, controleert `npm run check:passages` of elke passage letterlijk op de opgeslagen plek staat (Unicode-codepoints). Een afwijking wordt HOLD; het script verschuift of verzint nooit een markering.
2. Gegeven een gewijzigde bouwsteen, weigert de MCP-server hem te leveren (integriteitscontrole).
3. Gegeven een gewijzigde inhoud in de database, levert de webserver die niet uit en start hij niet met een kapotte selectie.

### CO-2 (BD-2) · Herleidbaar tot één release

1. Gegeven een start, weigert de server zonder geldige release- en publicatiehash of bij een afwijkende hash te starten.
2. Gegeven een verzoek met een andere release of publicatie, weigert de server de gegevens.
3. Gegeven een draaiende versie, toont `/api/v1/version` de coderevisie, release en publicatie.
4. Gegeven een databaserelease, kloppen de controlegetallen van de zip en de bestanden erin, voordat Omnibus hem gebruikt.

### CO-3 (BD-3) · Geen stille conclusies

1. Gegeven een punt met status HOLD, kan de gebruiker het lezen maar niet selecteren, ook niet via de MCP-server of export.
2. Gegeven een selectie, legt Omnibus geen oordeel over toepasselijkheid vast; WWKE-sectoruitzonderingen blijven beschermd.
3. Gegeven een nieuwe interviewvraag die de vormcontrole niet haalt, wordt die geweigerd met uitleg, zonder bestaande vragen te herschrijven.

### CO-4 (BD-4) · De MCP-server schrijft beperkt en levert een concept

1. Gegeven een schrijfopdracht zonder `consent: true`, maakt de server geen bestand.
2. Gegeven een pad, symlink, hardlink of bestaande bestandsnaam buiten de bedoeling, schrijft de server niet en overschrijft hij niets.
3. Gegeven een te groot of ongeldig verzoek, weigert de server vóórdat er iets wordt aangemaakt.
4. Gegeven de online leesroute (HTTP), zijn er precies vier leesfuncties en geen schrijfroute.
5. Gegeven een fout, geeft de server geen paden, databasevragen of brontekst prijs.

*Beperking, eerlijk benoemd:* `consent: true` is een verklaring van de AI-client, geen bewijs dat een mens akkoord gaf. Omnibus kan dat niet controleren.

### CO-5 (BD-5) · Gegevens blijven lokaal; online is alleen-lezen

1. Gegeven gebruik van de online versie, bewaart de server geen projecten, vragen of notities; die staan in de browser.
2. Gegeven een verzoek met een vreemde `Host` of `Origin`, weigert de server het.
3. Gegeven veel verzoeken van één bezoeker, begrenst de server die bezoeker, zonder anderen te blokkeren.
4. Gegeven de lokale versie, legt de applicatie geen verbindingen naar buiten.

## 4. Goede uitvoer en wat nooit mag

| Een goede uitvoer bevat altijd | Omnibus doet nooit |
| --- | --- |
| ✓ De release en publicatie waaruit de inhoud komt | ✕ Een bronpassage tonen die niet letterlijk in de bron staat |
| ✓ Bij elk toetspunt de bron, de versie en de vindplaats | ✕ Een HOLD-punt selecteerbaar maken of exporteren |
| ✓ De keuzes van de gebruiker, ongewijzigd | ✕ Een selectie presenteren als oordeel over toepasselijkheid of naleving |
| ✓ Bij MCP-uitvoer: de vermelding dat het een concept is | ✕ Bestanden schrijven buiten de eigen uitvoermap, of de kerncollectie veranderen |
| – | ✕ Projectgegevens van de gebruiker naar de server sturen |
| – | ✕ Inloggegevens of sleutels in de code of de database opnemen |

## 5. Dekkingsgaten

Wat een auditor redelijkerwijs zou verwachten en wat nu (nog) ontbreekt. Aangevuld met de auditorblik van de beheerder ([#274](https://github.com/Robert-Worm/omnibus/issues/274)).

1. **Prompt injection via de MCP-server.** Brontekst en citaten gaan naar de AI-client van de gebruiker. Staat daar een verstopte instructie in, dan beslist die client wat ermee gebeurt. Omnibus zegt in de werkwijze dat brongegevens geen instructies zijn, maar heeft daar nog geen gerichte test voor. Zie [#277](https://github.com/Robert-Worm/omnibus/issues/277).
2. **AI-kaders voor wie Omnibus aan een AI-client koppelt.** De MCP-server is een hulpmiddel voor een taalmodel. Voor die koppeling zijn OWASP Top 10 voor LLM-toepassingen LLM01 (*prompt injection*) en LLM06 (*excessive agency*) relevant. Ze staan niet als doelstelling, omdat Omnibus zelf geen model aanroept; de grenzen uit CO-4 en de proef in #277 dekken het deel dat bij Omnibus ligt.
3. **Menselijke toestemming bij de MCP-server.** Omnibus kan niet vaststellen dat een mens akkoord gaf; het vertrouwt op de AI-client (zie CO-4).
4. **Geen externe beveiligingsaudit.** De tests en CodeQL zijn geen volledige beveiligingsaudit. De SAAF-challenge is de eerste externe proef.
5. **Inhoudelijke juistheid buiten de passagecontrole.** `check:passages` toetst of een passage letterlijk klopt, niet of hij inhoudelijk bij de norm past. Dat beoordeelt de skill `omnibus-review-audit-quality` (zie het skills-document).
6. **Geen spoor van wie wat bekeek, bewust.** Privacy gaat voor. De server logt alleen technische fouten en weigeringen, zonder adressen of verzoekinhoud. Hooguit komen er later geanonimiseerde totalen, zoals aantallen bezoeken per land; die zijn er nu niet (besluit beheerder, 31 oktober 2026).
7. **Terugzetten online** gebeurt door opnieuw te bouwen, niet met een bewaarde image ([B-024](docs/beheer/besluiten.md#b-024)).
8. **Niet elke commit verwijst naar een issue.** Sinds de afspraak van 26 oktober 2026 hadden 14 van de 143 commits geen issuenummer, waarvan 4 van de voortgangsbot (telling van 31 oktober, zoals de *light scan* van SAAF Agent-Auditor). Daarvóór was het ongeveer de helft. Een controle die dit afdwingt, is er nog niet.

## 6. Status en bewijs

Werkwijze ([#273](https://github.com/Robert-Worm/omnibus/issues/273), naar het voorbeeld van SAAF *Audit-criteria*): elk criterium wordt echt uitgevoerd, een mislukking wordt gemeld, en een mens beslist of de controle het criterium dekt.

- ☑ betekent: de controle is op 31 oktober 2026 uitgevoerd en geslaagd.
- ◐ betekent: geslaagd, maar de controle dekt het criterium maar deels.
- ☐ betekent: nog niet uitgevoerd.

Of elke test het criterium echt dekt, is nog niet door een mens beoordeeld.

| Criterium | Controle | Geslaagd als | Uitkomst |
| --- | --- | --- | --- |
| CO-1 #1 | `npm run check:passages` op de database van 30 oktober | Elke passage staat letterlijk op de opgeslagen plek | ☑ 6.462 passages, 0 afwijkingen |
| CO-1 #2 | `agent-tools/read-tools.test.mjs` | Een gewijzigde bouwsteen faalt op de integriteitscontrole | ☑ |
| CO-1 #3 | `local-data/server-publication.test.mjs` | Gewijzigde bytes en beschadigde bronnen worden geweigerd, ook na de start | ☑ |
| CO-2 #1, #2 | `local-data/server-publication.test.mjs` | Starten zonder of met afwijkende pinnen en lezen uit een andere release worden geweigerd | ☑ |
| CO-2 #3 | `local-data/server-version.test.mjs` | `/api/v1/version` toont revisie, release en publicatie, zonder paden | ☑ |
| CO-2 #4 | `scripts/fetch-release-database.test.mjs`; handmatige controle bij elke release | Afwijkende controlegetallen en paden worden geweigerd | ☑ |
| CO-3 #1 | `agent-tools/read-tools.test.mjs` en `npm run test:agent:protocol` | HOLD is leesbaar en niet selecteerbaar | ☑ |
| CO-3 #2 | `npm run test:agent:protocol` | Uitgesloten WWKE-sectoren zijn niet selecteerbaar | ◐ Dekt de sectoren; dat selectie nergens een oordeel vastlegt, toetst geen test apart |
| CO-3 #3 | `agent-tools/input-contract.test.mjs` | Een afgewezen vraag krijgt uitleg; bestaande vragen blijven leesbaar | ☑ |
| CO-4 #1 | `agent-tools/input-contract.test.mjs` | Schrijven zonder `consent: true` wordt geweigerd | ☑ |
| CO-4 #2 | `agent-tools/output-safety.test.mjs` | Symlinks, hardlinks en bestaande bestanden worden niet beschreven of overschreven | ☑ |
| CO-4 #3 | `agent-tools/input-contract.test.mjs` en `agent-tools/output-safety.test.mjs` | Te grote of ongeldige invoer faalt vóór er een bestand ontstaat | ☑ |
| CO-4 #4 | `agent-tools/read-only-http.test.mjs` | Precies vier leesfuncties; schrijven heeft geen route | ☑ |
| CO-4 #5 | `agent-tools/read-only-http.test.mjs` en `local-data/server-security.test.mjs` | Fouten geven geen paden, databasevragen of invoer prijs | ☑ |
| CO-5 #1 | `local-data/server-security.test.mjs` | De server weigert schrijfverzoeken, dus kan hij geen projecten bewaren | ◐ Indirect bewijs; dat de browser niets stuurt, toetst de frontend niet apart |
| CO-5 #2 | `local-data/server-security.test.mjs` en `local-data/server-hosting.test.mjs` | Vreemde `Host` of `Origin` wordt geweigerd | ☑ |
| CO-5 #3 | `local-data/request-rate-limit.test.mjs` | Eén bezoeker wordt begrensd; anderen niet | ☑ |
| CO-5 #4 | `local-data/local-privacy.test.mjs` | Uitgaande verbindingen falen vóór er netwerkverkeer is | ☑ |

Alle tests behalve de MCP-protocolproef draaien in `npm test` en op GitHub bij elke wijziging. De protocolproef (`npm run test:agent:protocol`) vraagt een verse agentbuild met de actuele database. Met een verouderde build faalden op 31 oktober 3 van de 11 controles; na `npm run build:agent` met de database van 30 oktober slaagden alle 11.

*Beperking, eerlijk benoemd:* omdat de protocolproef niet in `npm test` zit, kan een fout daarin onopgemerkt blijven tot iemand hem draait.

## 7. Observability

Wat Omnibus vastlegt, en wat bewust niet:

- **Wel:** technische fouten en weigeringen van de server, met een vaste melding en een verzoek-ID, maar zonder adres, verzoekinhoud of brontekst. Bij een onbruikbaar bezoekersadres één regel `visitor_address_fallback` met alleen de vorm van de header, hooguit eens per minuut. Bij het starten de controle die mislukte, zonder paden.
- **Wel:** bij een databaserelease worden `check:passages` en `check:questions` gedraaid en de controlegetallen vastgelegd ([database publiceren](docs/beheer/database-publiceren.md)).
- **Bewust niet:** wie wat bekeek, zocht of exporteerde. Projecten, vragen en notities blijven in de browser. Privacy gaat voor; hooguit komen er later geanonimiseerde totalen.
- **Ontbreekt:** waarschuwingen bij storingen en een vaste bewaartermijn van de serverlogs van de host.

---

[↑ Omnibus](README.md) · [Wegwijzer](docs/README.md) · [Begrippen](docs/begrippen.md) · [Routekaart](docs/routekaart.md)
