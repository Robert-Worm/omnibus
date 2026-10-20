# Een auditrapport verwerken

> **In het kort:** deze skill zet één auditrapport om naar normen en toetspunten, met bij elk punt de bronpassage. Wat je inlevert is een concept; de beheerder maakt het af.

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
- **Voorgestelde bouwstenen**: per bevinding een norm met toetspunten, plus doel, risico en beheersmaatregel waar de bron dat draagt.
- **Beperkingen**: wat het rapport níet zegt, zoals peildatum, populatie en managementreactie.
- **Twijfels** als HOLD, niet weggepoetst.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-add-report om een concept te maken van het meegeleverde ADR-rapport "Onderzoek naar het inkoopproces" (versie 12 maart 2026). Behoud bronpassages en beperkingen. Niet integreren of publiceren.

Je krijgt een map met de bronbank (bevindingen met passages), de voorgestelde normen en toetspunten, een lijst met beperkingen en een overzicht van open punten. Die map zet je als zip bij je claim.

## Goed om te weten

- Een historische bevinding is geen actueel feit en geen algemene norm. De skill houdt die twee uit elkaar.
- De volledige opname vraagt twee onafhankelijke lezingen en een rapportkit die niet in deze repository zit. Zonder die stappen blijft het resultaat een concept; dat is precies wat je inlevert.
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
