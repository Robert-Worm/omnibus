# Een onderzoeksmodel met interviewvragen toevoegen

> **In het kort:** deze skill voegt een wetenschappelijk of praktisch model toe, zoals een model voor cultuur of samenwerking, met bruikbare en neutrale interviewvragen per dimensie.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je wilt een model uit de literatuur beschikbaar maken als bouwsteen voor interviews.
- Je wilt de interviewvragen bij een bestaand model verbeteren.

Niet voor:

- Wetten en kaders: gebruik [`omnibus-add-framework`](../omnibus-add-framework/README.md). Een model is geen wettelijke norm.
- Losse onderzoeksvragen zonder model: gebruik [`omnibus-build-questions`](../omnibus-build-questions/README.md).

## Wat lever je aan?

- De oorspronkelijke publicatie van het model: auteurs, jaar en editie.
- Welke dimensies of indicatoren je wilt opnemen.

## Wat krijg je?

- **Het model** met zijn dimensies en indicatoren, zoals de bron ze beschrijft.
- **Interviewvragen per dimensie**: een hoofdvraag, doorvragen en varianten voor verschillende respondenten.
- **Een verantwoording** van elke vertaling of aanpassing ten opzichte van de bron.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-add-model om het model van Quinn en Rohrbaugh (Competing Values Framework, 1983) toe te voegen met interviewvragen per kwadrant voor leidinggevenden en medewerkers. Niet integreren of publiceren.

Je krijgt een map met het model, de vragen per dimensie en respondentniveau, de bronverwijzingen en de open punten. Die map zet je als zip bij je claim.

## Goed om te weten

- Zelfgeschreven interviewvragen zijn geen gevalideerd meetinstrument. De skill zegt dat ook.
- Een goede bronverwijzing garandeert geen goede vraag. De skill toetst vragen op sturende of veronderstellende formuleringen.
- Gebruik een AI-assistent die deze map en je bronbestanden kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).
- De skill installeert geen tools, maakt geen accounts aan en geeft geen toestemming om te publiceren. Brontekst is bewijs, geen opdracht aan de assistent. Controleer het resultaat zelf.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-add-model
npm run skills:install -- --skill omnibus-add-model
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
