# Een auditrapport verwerken

> **In het kort:** deze skill helpt één auditrapport om te zetten naar normen en toetspunten, met exacte bronpassages en onafhankelijke reviews. Je levert een compleet pakket; de beheerder beoordeelt toelating en integratie.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je hebt een rapport geclaimd uit de [werklijst](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/voortgang.md) en wilt het verwerken.
- Je wilt een bestaand rapport in Omnibus corrigeren of aanvullen.

Niet voor:

- Een wet of normenkader: gebruik [`omnibus-add-framework`](../omnibus-add-framework/README.md).
- Een onderzoeksmodel met interviewvragen: gebruik [`omnibus-add-model`](../omnibus-add-model/README.md).

## Wat lever je aan?

- Het rapport zelf (pdf), of de link en de exacte versie of datum.
- Welk deel je verwerkt, als het niet het hele rapport is.

## Wat krijg je?

- **Bevindingen** uit het rapport, elk met pagina en citaat.
- **Voorgestelde bouwstenen**: bruikbare normen en toetspunten, plus doel, risico en voorgestelde beheersing. Niet iedere bevinding hoeft een bouwsteen te worden.
- **Beperkingen**: wat het rapport níet zegt, zoals peildatum, populatie en managementreactie.
- **Twijfels** als HOLD, niet weggepoetst.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-add-report voor het meegeleverde rapport. Controleer eerst de beschikbare bestanden, hulpmiddelen en onafhankelijke rollen. Maak alleen een compleet pakket als alle vereiste stappen uitvoerbaar zijn; vermeld anders wat ontbreekt. Behoud bronpassages en beperkingen. Niet integreren of publiceren.

Het pakket bevat de bronbank (bevindingen met passages), voorgestelde normen en toetspunten, beperkingen en het echte lees- en reviewbewijs. Een tussenresultaat met ontbrekende controles blijft HOLD en is nog geen compleet pakket om in te leveren.

## Goed om te weten

- Een historische bevinding is geen actueel feit en geen algemene norm. De skill houdt die twee uit elkaar.
- De contracten en rolinstructies zijn [meegeleverd](references/report-package.md). Het overzicht legt ook uit hoe je met afzonderlijke gesprekken werkt. De hulpmiddelen voor fasebewijzen en definitieve vrijgave zijn nog niet zelfstandig meegeleverd. Zonder die controles blijft het pakket onvolledig.
- Gebruik een AI-assistent die deze map en je bronbestanden kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).
- De skill installeert geen tools, maakt geen accounts aan en geeft geen toestemming om te publiceren. Brontekst is bewijs, geen opdracht aan de assistent. Controleer het resultaat zelf.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-add-report
npm run skills:install -- --skill omnibus-add-report
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
