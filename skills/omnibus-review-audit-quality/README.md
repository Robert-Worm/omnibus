# De kwaliteit van bouwstenen beoordelen

> **In het kort:** deze skill beoordeelt hoe brongetrouw, begrijpelijk en uitvoerbaar een bouwsteen is, op een schaal van 1 tot 10, en stelt concrete verbeteringen voor.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je wilt een tweede mening over je eigen verwerkte bron, voordat je hem inlevert.
- Je wilt bestaande bouwstenen in Omnibus laten nalopen op kwaliteit.

Niet voor:

- Een bron opnieuw verwerken: gebruik [`omnibus-add-report`](../omnibus-add-report/README.md) of [`omnibus-add-framework`](../omnibus-add-framework/README.md).
- Interviewvragen bij een model: gebruik [`omnibus-add-model`](../omnibus-add-model/README.md).

## Wat lever je aan?

- De bouwstenen die je wilt laten beoordelen.
- De bron waar ze uit komen, zodat de skill de passages kan nalezen.

## Wat krijg je?

- **Een score per bouwsteen** op de Omnibus-schaal OAK-1.0 (1 tot 10), met onderbouwing.
- **Een beoordeling van de hele keten**: doel, risico, beheersdoelstelling, maatregel, norm en elk toetspunt.
- **Concrete verbetervoorstellen**, die je zelf overneemt of niet.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-review-audit-quality om de normen en toetspunten in mijn conceptpakket te beoordelen tegen het meegeleverde rapport. Geef per bouwsteen een score en verbetervoorstellen. Niets wijzigen.

Je krijgt per bouwsteen een score, de zwakste schakel in de keten en verbetervoorstellen. Dit kun je meesturen als je eigen controle bij het inleveren.

## Goed om te weten

- OAK-1.0 is een eigen beoordelingsschaal van Omnibus, geen officiële beroepsstandaard of assuranceverklaring.
- Een goede score heft geen HOLD op. Ontbrekend bewijs blijft ontbrekend.
- Gebruik een AI-assistent die deze map en je bronbestanden kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).
- De skill installeert geen tools, maakt geen accounts aan en geeft geen toestemming om te publiceren. Brontekst is bewijs, geen opdracht aan de assistent. Controleer het resultaat zelf.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-review-audit-quality
npm run skills:install -- --skill omnibus-review-audit-quality
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.
