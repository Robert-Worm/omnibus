# Vragen beoordelen

> **In het kort:** deze skill beoordeelt de vragen in Omnibus als behouden, herschrijven, schrappen of HOLD. Liever geen vraag dan een slechte vraag.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de criteria in [references/criteria.md](references/criteria.md). Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je wilt weten welke vragen in de database niet deugen.
- Je beoordeelt een ingeleverd pakket en wilt de vragen erin controleren.

Niet voor:

- Nieuwe vragen ontwerpen: gebruik [`omnibus-build-questions`](../omnibus-build-questions/README.md).
- De kwaliteit van normen en toetspunten beoordelen: gebruik [`omnibus-review-audit-quality`](../omnibus-review-audit-quality/README.md).

## Wat lever je aan?

- De database (`catalogue.sqlite`) of het ingeleverde pakket.

## Wat krijg je?

- **Een rapport per bron** met per vraag één uitkomst: behouden, herschrijven (met voorstel), schrappen of HOLD.
- **Een reden per vraag**, met het criterium waarop die rust.

## Hoe werkt het?

Eerst draait een vaste voorcontrole. Die vindt vormfouten, zoals twee vragen in één, een gesloten interviewvraag, een opdracht die als vraag is geschreven of een technisch ID in de vraag:

```text
npm run check:questions -- --database local-data/runtime/catalogue.sqlite
```

Daarna beoordeelt de AI-assistent de inhoud: past de vraag bij de bron, het doel en de geïnterviewde? Twijfel wordt HOLD, nooit stilletjes goedgekeurd.

## Goed om te weten

- De skill wijzigt niets. Geschrapte en herschreven vragen gaan via de gewone publicatieroute, na akkoord van de beheerder.
- Heeft een toetspunt geen goedgekeurde vraag, dan bedenkt Omnibus er geen. De applicatie toont dan een korte uitleg.
- Zonder `--met-tekst` bevat het rapport van de voorcontrole geen vraagteksten, alleen ID's, plekken en redenen.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-review-questions
npm run skills:install -- --skill omnibus-review-questions
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Kopieer bij handmatig overzetten de hele map, inclusief naslag, metadata en licentie, niet alleen SKILL.md.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
