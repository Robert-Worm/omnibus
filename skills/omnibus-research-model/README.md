# Een model grondig onderzoeken en verbeteren

> **In het kort:** deze skill legt een model naast de literatuur, werkt de bronnen bij in APA 6 met DOI, verbetert de interviewvragen en laat drie onafhankelijke beoordelaars een score geven.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je twijfelt of een model en zijn vragen nog kloppen met de literatuur.
- Je wilt weten of er recent onderzoek is dat het model aanvult of tegenspreekt.
- Je wilt een score per model, zonder elke vraag zelf na te lopen.

Niet voor:

- Een nieuw model toevoegen aan de database: gebruik daarna [`omnibus-add-model`](../omnibus-add-model/README.md).
- Wetten en kaders: gebruik [`omnibus-add-framework`](../omnibus-add-framework/README.md).

## Wat lever je aan?

- Het model of de modellen die je wilt laten onderzoeken.
- Of de assistent op internet en in je browser mag zoeken.

## Wat krijg je?

- **Een bronnenlijst per model** in APA 6 met DOI, met de kernpublicaties, validaties en recente literatuur.
- **Een vergelijking** van de variabelen uit de literatuur met de dimensies in Omnibus.
- **Verbeterde vragen** per niveau, met doorvragen en een bevestiging waar die zin heeft.
- **Scores van 1 tot 10** per model en per ronde, van drie onafhankelijke beoordelaars: theorie, interviewpraktijk en auditbewijs.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-research-model om het model van Westrum te onderzoeken: zijn de bronnen compleet, is er recent onderzoek en vragen de vragen de variabelen goed uit? Niet integreren of publiceren.

Je krijgt een document met de bronnen, de bevindingen, de nieuwe vragen en de scores per ronde.

## Goed om te weten

- Een panel van AI-beoordelaars is geen menselijke goedkeuring en geen validatie van een meetinstrument.
- De skill wijzigt niets in de database. Opname loopt via [`omnibus-add-model`](../omnibus-add-model/README.md) en de controles daar.
- Vraagt een zoeksite om een robotcontrole, dan doe je die zelf.
- Gebruik een AI-assistent die deze map kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
