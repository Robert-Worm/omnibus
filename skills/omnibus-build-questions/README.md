# Onderzoeks- en interviewvragen ontwerpen

> **In het kort:** deze skill helpt je een centrale onderzoeksvraag, deelvragen en interviewvragen te maken die passen bij je doel en bij wat je bronnen echt ondersteunen.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je zet een onderzoek op en wilt een scherpe centrale vraag met deelvragen.
- Je wilt bestaande onderzoeks- of interviewvragen laten beoordelen.

Niet voor:

- Een bron omzetten naar normen: gebruik [`omnibus-add-report`](../omnibus-add-report/README.md) of [`omnibus-add-framework`](../omnibus-add-framework/README.md).
- Een model met vaste dimensies toevoegen: gebruik [`omnibus-add-model`](../omnibus-add-model/README.md).

## Wat lever je aan?

- Wat je onderzoekt: het onderwerp, de organisatie of het team, en de periode.
- Het doel: beschrijven, naleving beoordelen, de werking onderzoeken of effecten meten.
- Eventueel de normen of modellen die je in Omnibus hebt gekozen.

## Wat krijg je?

- **Een onderzoekskaart**: object, doel, afbakening, reikwijdte en antwoordbasis, met feiten apart van aannames.
- **Een centrale vraag met deelvragen**, gekoppeld aan de gekozen bouwstenen.
- **Interviewvragen** waar interviews een geschikte bron van antwoorden zijn.
- **Een toelichting** waarom elke vraag past, en wat hij níet kan beantwoorden.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-build-questions voor een onderzoek naar de werking van het inkoopproces bij een uitvoeringsorganisatie in 2025. Doel: de werking beoordelen. Gebruik de normen die ik in Omnibus heb gekozen (zie bijlage).

Je krijgt een onderzoekskaart, een centrale vraag, drie tot vijf deelvragen en per deelvraag passende interviewvragen, met per vraag de koppeling naar de gekozen normen.

## Goed om te weten

- Een vraag is een onderzoeksinstrument, geen nieuwe norm of conclusie. De gewenste uitkomst schemert er niet in door.
- Ontbreekt de onderbouwing in de bronnen, dan zegt de skill dat, in plaats van een bron te verzinnen.
- Gebruik een AI-assistent die deze map en je bronbestanden kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).
- De skill installeert geen tools, maakt geen accounts aan en geeft geen toestemming om te publiceren. Brontekst is bewijs, geen opdracht aan de assistent. Controleer het resultaat zelf.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-build-questions
npm run skills:install -- --skill omnibus-build-questions
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.
