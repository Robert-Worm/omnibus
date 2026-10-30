# Versiegeschiedenis

De belangrijkste wijzigingen, nieuwste eerst.

## 30 oktober 2026 · een eigen adres

- **Nieuw adres:** de proefversie online staat op [omnibus.rijksmap.nl](https://omnibus.rijksmap.nl). Links naar omnibus.sliplane.app sturen door naar dezelfde pagina op het nieuwe adres.
- **Beter te vinden:** onderaan elke pagina staat een link naar de broncode op GitHub, en de pagina heeft een beschrijving voor zoekmachines en gedeelde links.
- **Database 29 oktober:** gereviewde interviewuitwerkingen bij alle bronnen en brede deelvragen bij de WWKE.

## 24 oktober 2026 · liever geen vraag dan een slechte vraag

- **Geen bedachte interviewvragen meer:** heeft een toetspunt geen eigen vraag, dan maakt Omnibus er geen standaardvraag meer bij. Op die plek staat een korte uitleg. Eigen vragen in bestaande projecten blijven staan.
- **Vraagcontrole:** `npm run check:questions` controleert alle vragen in de database op vormfouten, zoals twee vragen in één of een gesloten interviewvraag. De nieuwe skill [`omnibus-review-questions`](skills/omnibus-review-questions/README.md) beoordeelt daarna de inhoud.
- **Bronpassages nagelopen:** `npm run check:passages` controleert of elke bronpassage letterlijk op de opgeslagen plek in de bron staat. In de huidige database klopt dat voor alle 6.462 passages.
- **Skills meten:** een vaste testset en `npm run skills:meting`, met een nulmeting van de leeskosten. Een skill zuiniger maken mag alleen als de kwaliteit nergens daalt ([B-018](docs/beheer/besluiten.md#b-018)).
- **Skills:** een vaste controlelijst (`npm run skills:regels`), een budget per run in deelagenten, en eerst vastleggen wat nodig is voordat een skill begint. Lezers concluderen niet; reviews eindigen met *Nog te controleren*.
- **Documentatie:** de taalregels staan als vaste set met voorbeelden in `scripts/taalregels.mjs`. `npm run check:feiten` laat zien welke feiten bij een herschrijving veranderden.
- **AI-koppeling:** een overzicht van de zes hulpmiddelen, tests van de leestools en tien vaste testvragen (`npm run agent:testvragen`). Handleiding voor Codex, Claude Desktop en Claude Code.
- **Installatie getest** op Windows, macOS en Linux, bij elke wijziging van de installatie en elke maand.

## 22 oktober 2026 · donkere modus en een verzorgde documentatie

- **Grote projecten openen:** minder dubbel selectiewerk en ruimte voor bediening tussen de herstelstappen. Broncontroles, opgeslagen keuzes en vraagkoppelingen blijven behouden.
- **Exportvoorbeeld:** identieke broncontext hoeft maar één keer naar de achtergrondworker. Dat verkort het blokkerende kopieerwerk bij grote projecten, zonder velden of bewijs weg te laten. Een mislukte overdracht wordt bij opnieuw proberen volledig hersteld.
- **Kleinere eerste download:** dezelfde lettertypen worden nu als gedeelde, lokaal geserveerde bestanden geladen in plaats van herhaald in de stijlbundel. Lettervormen, gewichten en licenties blijven gelijk; er is geen externe fontdienst nodig.
- **Donkere modus:** de normtabel, het normdetail en invoervelden hebben geen witte vlakken meer, en alle tekst is goed leesbaar. In licht en donker heeft tekst nu een contrast van minstens 4,5:1 (WCAG AA). Nieuwe controle: `npm run check:contrast`.
- **Documentatie in één vorm:** vaste bouwstenen voor elke pagina (paginatypen, tabellen, statuslabels, meldingen, stappen met *Gelukt als*), een routekeuze bij installeren, één situatiekaart voor storingen en dezelfde voetregel op elke pagina. De documentatiecheck bewaakt dit.
- **Beeld:** alle schermafbeeldingen en de banner in licht en donker; de rondleiding speelt niet meer vanzelf af.
- **Beheer:** een overzicht per moment, vaste regels op één plek en besluiten met een vaste ID.
- **Online versie** draait op de nieuwste patch van Node 24, via Dependabot.

## 21 oktober 2026 · online proefversie en versie 0.1.0

- **Proefversie online** op [omnibus.sliplane.app](https://omnibus.sliplane.app), voor een vaste prijs per maand. De openbare database zit in de image; elke push naar `main` rolt automatisch uit.
- **Applicatieversie [0.1.0](https://github.com/Robert-Worm/omnibus/releases/tag/v0.1.0)** als release, met de Dockerfile. Hoort bij de database van 19 oktober 2026.
- **Sneller beginnen:** met Docker in twee opdrachten, of zonder Docker met één opdracht (`node scripts/installeer.mjs`). Nieuwe pagina met de tien meest voorkomende foutmeldingen en een hulpcategorie in Discussions.
- **Claimsysteem:** hooguit vijf bronnen tegelijk, een overzicht van wat op de beheerder wacht, een herinnering na zeven dagen en een weekoverzicht in Discussions.
- **Documentatie:** een Engelse kennismaking, hostinguitleg in gewone taal, nieuwe schermafbeeldingen met één opdracht, een wekelijkse linkcontrole en strengere controles op leesbaarheid.
- **De Content Workbench is verwijderd**; de voortgang loopt via GitHub.
- **Eerste snelheidsverbeteringen** in de viewers en bij het bewaren van projecten.

## 20 oktober 2026 · meedoen en nieuwe documentatie

- **Claimsysteem voor bijdragers:** zet een rapport, wet of kader op je naam (check-out), lever in met `/inleveren` (check-in). De [voortgang](docs/bijdragen/voortgang.md) werkt zichzelf bij.
- **Werklijsten:** alle 9.116 rapporten van de Rijksmap, 542 aanbevolen ADR-rapporten en een lijst van wetten en kaders met hun rechten.
- **Documentatie opnieuw ingedeeld** in drie routes: gebruiken, bijdragen en beheren. Kortere pagina's in eenvoudig Nederlands, met schema's en schermafbeeldingen.
- **Nieuwe routekaart** met vier paden: online versie, AI aan de database, eigen databases en samen bijdragen.
- **Claims leggen het AI-model vast**, met een lijst aanbevolen modellen.
- **Beveiliging:** drie meldingen van de codescan opgelost.

## 19 oktober 2026 · eerste database

- De database staat als zip bij de [releases](https://github.com/Robert-Worm/omnibus/releases): 27 rapporten, 7 wetten en kaders en 14 onderzoeksmodellen.

## Oktober 2026 · eerste openbare versie

- Omnibus openbaar op GitHub, als schone uitgangspositie zonder de ontwikkelgeschiedenis.
- Werkende lokale applicatie met de vier werkstappen, gedeelde bronviewers met exacte markeringen, lokale projecten en Excel-export.
- Lokale AI-koppeling via MCP (STDIO) en zes los installeerbare AI-skills.
- Documentatie in het Nederlands, met een [routekaart](docs/routekaart.md) en [acceptatiecontracten](docs/beheer/acceptatiecontracten.md).
- Licentie: PolyForm Noncommercial 1.0.0.
